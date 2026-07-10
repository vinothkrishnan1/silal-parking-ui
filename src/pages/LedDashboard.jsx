import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Car,
  Clock3,
  Gauge,
  LayoutGrid,
  ShieldCheck,
  Users,
} from "lucide-react";
import { io } from "socket.io-client";
import axios from "axios";  
import { useAppTimeZone } from "../utils/dateTime";
import { API_BASE_URL, apiUrl } from "../utils/api";

const LedDashboard = () => {
  const [slotData, setSlotData] = useState({
    visitor: { total: 0, available: 0, occupied: 0, reserved: 0 },
    total: 0,
    available: 0,
    occupied: 0,
    reserved: 0,
  });
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const timeZone = useAppTimeZone();

  const fetchSlotData = useCallback(async () => {
    try {
      const response = await axios.get(apiUrl("/api/parking/slot-status"));
      if (response.data) {
        setSlotData(response.data);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching initial slot data:", err);
    }
  }, []);

  useEffect(() => {
    fetchSlotData();

    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
    });

    socket.on("connect", () => {
      console.log("Connected to Parking WebSocket Server");
      setIsConnected(true);
      setError(null);
      fetchSlotData();
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket Server:", reason);
      setIsConnected(false);
      setError("Connection Interrupted");
    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket Connection Error:", err);
      setIsConnected(false);
      setError("Connection Interrupted");
    });

    socket.on("slot_status_update", (data) => {
      setSlotData(data);
      setError(null);
    });

    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      socket.disconnect();
      clearInterval(timeInterval);
    };
  }, [fetchSlotData]);

  const StatusCard = ({ title, data, type }) => {
    const isVisitor = type === "visitor";
    const accentColor = isVisitor ? "emerald" : "indigo";
    const Icon = isVisitor ? Users : ShieldCheck;

    const styles = {
      emerald: {
        bgGlow: "bg-emerald-500/10",
        iconWrap: "bg-emerald-50 text-emerald-600 border-emerald-100",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
        textValue: "text-emerald-600",
        dropShadow: "drop-shadow-[0_14px_24px_rgba(5,150,105,0.18)]",
      },
      indigo: {
        bgGlow: "bg-indigo-500/10",
        iconWrap: "bg-indigo-50 text-indigo-600 border-indigo-100",
        pill: "bg-indigo-50 text-indigo-700 border-indigo-100",
        textValue: "text-indigo-600",
        dropShadow: "drop-shadow-[0_14px_24px_rgba(79,70,229,0.18)]",
      },
    };

    const currentStyle = styles[accentColor];

    return (
      <motion.div
        className="premium-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] p-6 xl:p-7"
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div
          className={`absolute -right-16 -top-16 h-40 w-40 rounded-full ${currentStyle.bgGlow} blur-3xl`}
        />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />

        <div className="relative mb-5 flex items-center justify-between gap-4 xl:mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${currentStyle.iconWrap} shadow-sm xl:h-16 xl:w-16`}
            >
              <Icon size={28} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                Live Status
              </p>
              <h3 className="text-xl font-black tracking-tight text-gray-900 xl:text-2xl">
                {title}
              </h3>
            </div>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${currentStyle.pill}`}
          >
            LED View
          </div>
        </div>

        <div className="relative flex min-h-0 flex-grow flex-col items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-gray-50 to-white px-6 py-6 text-center xl:py-8">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">
            Available Slots
          </div>
          <span
            className={`text-[clamp(4.5rem,12vw,9rem)] font-black leading-none ${currentStyle.textValue} ${currentStyle.dropShadow}`}
          >
            {data.available}
          </span>
          <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-gold" />
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5 xl:mt-6 xl:pt-6">
          <div className="rounded-2xl bg-gray-50 px-4 py-4 text-center">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Total
            </p>
            <p className="text-xl font-black text-gray-900 xl:text-2xl">{data.total}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-4 text-center">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Occupied
            </p>
            <p className="text-xl font-black text-gray-900 xl:text-2xl">{data.occupied}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-4 text-center">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Reserved
            </p>
            <p className="text-xl font-black text-gray-900 xl:text-2xl">{data.reserved}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  const utilization =
    slotData.total > 0 ? Math.round((slotData.occupied / slotData.total) * 100) : 0;

  const SummaryTile = ({ label, value, icon: Icon, accent = "default" }) => {
    const accents = {
      default: "bg-white text-gray-900",
      dark: "bg-gradient-to-br from-premium-black to-gray-800 text-white",
      soft: "bg-gray-50 text-gray-900",
    };

    return (
      <div className={`rounded-[1.5rem] px-4 py-4 shadow-sm ${accents[accent]}`}>
        <div
          className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] ${
            accent === "dark" ? "text-white/60" : "text-gray-400"
          }`}
        >
          <Icon size={14} className="text-premium-gold" />
          {label}
        </div>
        <p className="text-3xl font-black xl:text-4xl">{value}</p>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-premium-gray text-gray-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-premium-gold/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-slate-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-screen w-full max-w-[1700px] flex-col px-4 py-4 md:px-5 md:py-5">
        <header className="glassmorphism mb-4 rounded-[2rem] px-5 py-4 md:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-premium-black to-gray-800 shadow-lg shadow-black/10">
                <Car size={28} className="text-premium-gold" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">
                  Premium LED Dashboard
                </p>
                <h1 className="font-logo text-2xl font-black tracking-wide text-gray-900 md:text-3xl">
                  Pro Parking
                </h1>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Full-screen live parking view
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-center">
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      isConnected ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span>{isConnected ? "System Online" : "Connecting"}</span>
                </div>
                <div className="text-base font-black text-gray-900 xl:text-lg">
                  {error && !isConnected ? error : "Live feed connected"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-premium-black to-gray-800 px-5 py-3 text-white shadow-lg shadow-black/10">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                  <Clock3 size={14} className="text-premium-gold" />
                  Local Time
                </div>
                <div className="text-2xl font-black tabular-nums xl:text-3xl">
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  }).format(currentTime)}
                </div>
                <div className="text-sm font-medium text-white/70">
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone,
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(currentTime)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex flex-grow flex-col">
          {error && !isConnected ? (
            <div className="flex flex-grow items-center justify-center">
              <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-red-100 bg-white/95 p-10 text-center shadow-premium">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-red-100 blur-3xl" />
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-500 shadow-sm">
                  <Activity size={40} />
                </div>
                <h2 className="mb-3 text-3xl font-black text-gray-900">
                  Connection Interrupted
                </h2>
                <p className="mb-8 text-base font-medium text-red-500">{error}</p>
                <button
                  onClick={fetchSlotData}
                  className="ripple-button rounded-2xl bg-premium-black px-8 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-gray-900"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-grow gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
              <section className="min-h-0">
                <StatusCard
                  title="Visitor & Staff"
                  data={slotData.visitor}
                  type="visitor"
                />
              </section>

              <section className="glassmorphism flex min-h-0 flex-col rounded-[2rem] p-5 xl:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">
                      Capacity Summary
                    </p>
                    <h2 className="mt-1 text-xl font-black text-gray-900 xl:text-2xl">
                      Live Overview
                    </h2>
                  </div>
                  <div className="h-1.5 w-16 rounded-full bg-gradient-gold" />
                </div>

                <div className="grid min-h-0 flex-grow grid-rows-[auto,auto,1fr] gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <SummaryTile label="Grand Total" value={slotData.total} icon={Car} />
                    <SummaryTile label="Occupied" value={slotData.occupied} icon={Activity} />
                    <SummaryTile
                      label="Utilization"
                      value={`${utilization}%`}
                      icon={Gauge}
                      accent="dark"
                    />
                  </div>

                  <div className="rounded-[1.75rem] border border-gray-100 bg-white px-5 py-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                        Capacity Utilization
                      </span>
                      <span className="text-2xl font-black text-gray-900">
                        {utilization}%
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                      <motion.div
                        initial={false}
                        animate={{ width: `${utilization}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-premium-black via-gray-800 to-premium-gold"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl bg-gray-50 px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                          Available
                        </p>
                        <p className="mt-1 text-lg font-black text-gray-900 xl:text-xl">
                          {slotData.available}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                          Reserved
                        </p>
                        <p className="mt-1 text-lg font-black text-gray-900 xl:text-xl">
                          {slotData.reserved}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                          Live Feed
                        </p>
                        <p className="mt-1 text-lg font-black text-gray-900 xl:text-xl">
                          {isConnected ? "Active" : "Offline"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-h-0 grid-cols-1 gap-3">
                    <div className="rounded-[1.5rem] bg-gradient-to-br from-premium-black to-gray-800 px-5 py-5 text-white shadow-lg shadow-black/10">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                        <LayoutGrid size={14} className="text-premium-gold" />
                        Display Status
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-2xl bg-white/10 px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                            Mode
                          </p>
                          <p className="mt-1 font-black text-white">LED Live</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                            Zone
                          </p>
                          <p className="mt-1 font-black text-white">Visitor & Staff</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                            Network
                          </p>
                          <p className="mt-1 font-black text-white">
                            {isConnected ? "Connected" : "Offline"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LedDashboard;
