import React, { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "../utils/api";
import getDevices from "../data/GetDevice";
import { useLanguage } from "../context/LanguageContext";

const DEVICE_CONFIG_UPDATED_EVENT = "device-config-updated";

const normalizeGateKey = (device) =>
  (device?.gate_name || device?.device_name || `${device?.device_type}-${device?.id || ""}`)
    .toString()
    .trim()
    .toLowerCase();

const buildBarrierCards = (devices = []) => {
  const groups = new Map();

  devices.forEach((device) => {
    const key = normalizeGateKey(device);
    const group = groups.get(key) || [];
    group.push(device);
    groups.set(key, group);
  });

  return Array.from(groups.entries()).map(([gateKey, groupDevices]) => {
    const preferredDevice =
      groupDevices.find((device) => device.device_type === "CONTROLLER") ||
      groupDevices.find((device) => device.device_type === "ENTRY CAMERA" || device.device_type === "EXIT CAMERA") ||
      groupDevices[0];

    const cameraDevice =
      groupDevices.find((device) => device.device_type === "ENTRY CAMERA" || device.device_type === "EXIT CAMERA") || null;

    return {
      id: preferredDevice.id,
      gate_key: gateKey,
      gate_name: preferredDevice.gate_name || cameraDevice?.gate_name || preferredDevice.device_name || "Ungrouped Gate",
      device_name: preferredDevice.device_name || cameraDevice?.device_name || `${preferredDevice.device_type} ${preferredDevice.id}`,
      device_type: preferredDevice.device_type,
      ip_address: preferredDevice.ip_address,
      port: preferredDevice.port,
      source_devices: groupDevices,
      uses_camera_fallback: preferredDevice.device_type !== "CONTROLLER",
      status: "closed",
      isApiCalling: false,
      errorMessage: null,
      autoCloseTime: null,
    };
  });
};

const BoomBarrierControl = () => {
  const { t, language } = useLanguage();
  const [barriers, setBarriers] = useState([]);
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(true);

  const syncBarriers = async () => {
    setLoading(true);
    try {
      const result = await getDevices();
      if (!result.success) {
        setBarriers([]);
        return;
      }

      const nextBarriers = buildBarrierCards(result.data || []);
      setBarriers((prevBarriers) =>
        nextBarriers.map((nextBarrier) => {
          const existingBarrier = prevBarriers.find((barrier) => barrier.id === nextBarrier.id);
          return existingBarrier
            ? {
                ...nextBarrier,
                status: existingBarrier.status,
                isApiCalling: existingBarrier.isApiCalling,
                errorMessage: existingBarrier.errorMessage,
                autoCloseTime: existingBarrier.autoCloseTime,
              }
            : nextBarrier;
        })
      );
    } catch (error) {
      console.error("Failed to load boom barrier devices:", error);
      setBarriers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncBarriers();
    window.addEventListener(DEVICE_CONFIG_UPDATED_EVENT, syncBarriers);
    return () => window.removeEventListener(DEVICE_CONFIG_UPDATED_EVENT, syncBarriers);
  }, []);

  useEffect(() => {
    const activeTimers = {};

    barriers.forEach((barrier) => {
      if (barrier.status === "open" && barrier.autoCloseTime) {
        const intervalId = setInterval(() => {
          const remaining = Math.max(
            0,
            Math.round((barrier.autoCloseTime - Date.now()) / 1000)
          );

          setTimers((prev) => ({ ...prev, [barrier.id]: remaining }));

          if (remaining <= 0) {
            clearInterval(activeTimers[barrier.id]);
            setBarriers((prevBs) =>
              prevBs.map((b) =>
                b.id === barrier.id
                  ? { ...b, status: "closing", autoCloseTime: null }
                  : b
              )
            );

            setTimeout(() => {
              setBarriers((prevBs) =>
                prevBs.map((b) =>
                  b.id === barrier.id ? { ...b, status: "closed" } : b
                )
              );
            }, 2500);
          }
        }, 1000);

        activeTimers[barrier.id] = intervalId;
      } else if (timers[barrier.id] !== undefined && barrier.status !== "open") {
        clearInterval(activeTimers[barrier.id]);
        setTimers((prev) => {
          const next = { ...prev };
          delete next[barrier.id];
          return next;
        });
      }
    });

    return () => {
      Object.values(activeTimers).forEach(clearInterval);
    };
  }, [barriers]);

  const getStatusInfo = (status) => {
    switch (status) {
      case "open":
        return {
          text: t("boomBarrier.status.open"),
          icon: <ShieldCheck size={24} />,
        };
      case "closed":
        return {
          text: t("boomBarrier.status.closed"),
          icon: <ShieldAlert size={24} />,
        };
      case "opening":
        return {
          text: t("boomBarrier.status.opening"),
          icon: <Loader2 size={24} className="animate-spin" />,
        };
      case "closing":
        return {
          text: t("boomBarrier.status.closing"),
          icon: <Loader2 size={24} className="animate-spin" />,
        };
      default:
        return {
          text: t("boomBarrier.status.unknown"),
          icon: <ShieldAlert size={24} />,
        };
    }
  };

  const openBarrierApi = async (barrier) => {
    try {
      const response = await fetch(apiUrl("/open-boom-barrier"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: barrier.id,
          gate_name: barrier.gate_name,
          device_name: barrier.device_name,
          barrier: barrier.gate_name || barrier.device_name || barrier.device_type,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || payload.message || t("boomBarrier.failed"));
      }

      return { success: true, payload };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const handleOpenBarrier = async (barrierId) => {
    const barrierToOpen = barriers.find((barrier) => barrier.id === barrierId);
    if (!barrierToOpen) return;

    setBarriers((prevBs) =>
      prevBs.map((b) =>
        b.id === barrierId ? { ...b, errorMessage: null, isApiCalling: true } : b
      )
    );
    setTimers((prev) => ({ ...prev, [barrierId]: undefined }));

    try {
      const apiResult = await openBarrierApi(barrierToOpen);

      if (apiResult.success) {
        setBarriers((prevBs) =>
          prevBs.map((barrier) =>
            barrier.id === barrierId
              ? {
                  ...barrier,
                  status: "opening",
                  isApiCalling: false,
                  errorMessage: null,
                }
              : barrier
          )
        );

        setTimeout(() => {
          const autoCloseTimestamp = Date.now() + 10000;
          setBarriers((prevBs) =>
            prevBs.map((barrier) =>
              barrier.id === barrierId
                ? { ...barrier, status: "open", autoCloseTime: autoCloseTimestamp }
                : barrier
            )
          );
        }, 2500);
      } else {
        throw new Error(apiResult.message || "Operation failed.");
      }
    } catch (error) {
      console.error("Failed to open barrier via API:", error.message);
      setBarriers((prevBs) =>
        prevBs.map((b) =>
          b.id === barrierId
            ? {
                ...b,
                isApiCalling: false,
                errorMessage: error.message || "Failed to open barrier.",
                status: "closed",
              }
            : b
        )
      );
    }
  };

  return (
    <div
      className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === "ar" ? "rtl" : "ltr"}`}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className={`mb-10 ${language === "ar" ? "text-right" : "text-left"}`}>
        <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">
          {t("boomBarrier.title")}
        </h1>
        <p className="text-gray-500 mt-2 font-medium">{t("boomBarrier.subtitle")}</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading devices...</div>
      ) : barriers.length === 0 ? (
        <div className="p-8 text-center text-gray-500 premium-card border border-gray-100">
          No boom barrier devices configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {barriers.map((barrier, index) => {
            const statusInfo = getStatusInfo(barrier.status);
            const isOperating = barrier.status === "opening" || barrier.status === "closing";
            const isOpen = barrier.status === "open";
            const isDisabled = isOpen || isOperating || barrier.isApiCalling;

            return (
              <motion.div
                key={barrier.id}
                className="premium-card overflow-hidden flex flex-col justify-between border border-gray-100/80"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <div className={`p-6 border-b border-gray-100 bg-gray-50/30 ${language === "ar" ? "text-right" : ""}`}>
                  <h3 className="text-xl font-black text-premium-black tracking-tight">
                    {barrier.device_name}
                  </h3>
                  <p className="text-xs text-premium-gold font-bold uppercase tracking-widest mt-1.5">
                    {barrier.gate_name || "Ungrouped Gate"}
                  </p>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {barrier.uses_camera_fallback ? "Camera relay fallback" : "Controller"}
                  </p>
                </div>

                <div className="p-6 flex flex-col items-center justify-center space-y-6 flex-grow">
                  <div
                    className={`flex items-center justify-center w-24 h-24 rounded-2xl ${
                      barrier.status === "open"
                        ? "bg-green-50 text-green-600 border border-green-100 shadow-sm"
                        : barrier.status === "closed"
                        ? "bg-red-50 text-red-600 border border-red-100 shadow-sm"
                        : "bg-premium-gold/10 text-premium-gold border border-premium-gold/20 shadow-sm"
                    }`}
                  >
                    <span className="scale-125">{statusInfo.icon}</span>
                  </div>

                  <div className="text-center">
                    <p
                      className={`text-lg font-black uppercase tracking-widest ${
                        barrier.status === "open"
                          ? "text-green-600"
                          : barrier.status === "closed"
                          ? "text-red-600"
                          : "text-premium-gold"
                      }`}
                    >
                      {statusInfo.text}
                    </p>

                    {isOpen && timers[barrier.id] > 0 && (
                      <div
                        className={`flex items-center justify-center text-xs font-bold text-premium-gold mt-3 bg-premium-gold/10 px-4 py-2 rounded-xl border border-premium-gold/20 ${
                          language === "ar" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Timer
                          size={14}
                          className={`${language === "ar" ? "ml-1.5" : "mr-1.5"} animate-pulse`}
                        />
                        <span className="tracking-wide">
                          {t("boomBarrier.autoClosing", { time: timers[barrier.id] })}
                        </span>
                      </div>
                    )}
                  </div>

                  {barrier.errorMessage && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 p-4 rounded-xl w-full text-center">
                      {barrier.errorMessage}
                    </p>
                  )}

                  <div className="w-full text-xs text-gray-500 space-y-1">
                    <p>
                      <span className="font-bold text-gray-700">IP:</span> {barrier.ip_address}
                    </p>
                    <p>
                      <span className="font-bold text-gray-700">Port:</span> {barrier.port}
                    </p>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => handleOpenBarrier(barrier.id)}
                    disabled={isDisabled}
                    className={`ripple-button w-full flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-md focus:outline-none
                      ${
                        isDisabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200/50 shadow-none"
                          : "bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white hover:shadow-black/20 hover:shadow-lg active:scale-95 border-none"
                      }`}
                  >
                    {barrier.isApiCalling ? (
                      <Loader2
                        size={18}
                        className={`${language === "ar" ? "ml-2" : "mr-2"} animate-spin text-premium-gold`}
                      />
                    ) : (
                      <ArrowUpCircle
                        size={18}
                        className={`${language === "ar" ? "ml-2" : "mr-2"} ${
                          isDisabled ? "" : "text-premium-gold group-hover:scale-110 transition-transform"
                        }`}
                      />
                    )}
                    <span className="tracking-wide">
                      {barrier.isApiCalling ? t("boomBarrier.requesting") : t("boomBarrier.openBarrier")}
                    </span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BoomBarrierControl;
