import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Car,
  Clock3,
  Gauge,
  LayoutGrid,
  ShieldCheck,
  Users,
  Film,
  Video,
} from "lucide-react";
import { io } from "socket.io-client";
import axios from "axios";
import { useAppTimeZone } from "../utils/dateTime";
import { API_BASE_URL, apiUrl } from "../utils/api";
import {
  getStoredLedVideos,
  APP_LED_VIDEOS_EVENT,
} from "../utils/appStorage";
import TizenImageSlideshow from "../components/TizenImageSlideshow";

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
  const [videos, setVideos] = useState([]);

  const activeImages = useMemo(() => {
    // Filter only image files to show in the slideshow using mime-type and extension
    return videos
      .filter((v) => {
        if (v.fileType && v.fileType.startsWith("image/")) {
          return true;
        }
        if (v.sourceUrl) {
          const lower = v.sourceUrl.toLowerCase();
          const ext = lower.split("?")[0].split(".").pop();
          return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
        }
        return false;
      })
      .map((v) => v.sourceUrl)
      .filter(Boolean);
  }, [videos]);

  const loadVideos = useCallback(async () => {
    try {
      const storedVideos = await getStoredLedVideos();
      setVideos(storedVideos);
    } catch (err) {
      console.error("Failed to load LED media in dashboard:", err);
    }
  }, []);

  useEffect(() => {
    loadVideos();

    const syncVideos = () => {
      loadVideos();
    };

    window.addEventListener(APP_LED_VIDEOS_EVENT, syncVideos);
    window.addEventListener("storage", syncVideos);

    return () => {
      window.removeEventListener(APP_LED_VIDEOS_EVENT, syncVideos);
      window.removeEventListener("storage", syncVideos);
    };
  }, [loadVideos]);

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
        className="premium-card relative flex h-fit lg:h-full min-h-0 flex-col overflow-hidden rounded-[2rem] p-4 sm:p-5 xl:p-6 min-[1800px]:p-8"
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div
          className={`absolute -right-16 -top-16 h-40 w-40 rounded-full ${currentStyle.bgGlow} blur-3xl`}
        />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />

        <div className="relative mb-3 flex items-center justify-between gap-4 xl:mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${currentStyle.iconWrap} shadow-sm xl:h-16 xl:w-16`}
            >
              <Icon size={28} />
            </div>
            <div>
              <p className="text-[11px] min-[1800px]:text-base font-bold uppercase tracking-[0.22em] text-gray-400">
                Live Status
              </p>
              <h3 className="text-xl font-black tracking-tight text-gray-900 xl:text-2xl min-[1800px]:text-4xl">
                {title}
              </h3>
            </div>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-[11px] min-[1800px]:text-base font-bold uppercase tracking-[0.18em] ${currentStyle.pill}`}
          >
            LED View
          </div>
        </div>

        <div className="relative flex min-h-0 flex-grow flex-col items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-gray-50 to-white px-4 py-2 sm:px-6 sm:py-3 text-center xl:py-3">
          <div className="mb-1 text-[11px] min-[1800px]:text-lg font-bold uppercase tracking-[0.24em] text-gray-400">
            Available Slots
          </div>
          <span
            style={{ fontSize: "clamp(5rem, 16vh, 18rem)" }}
            className={`font-black leading-none ${currentStyle.textValue} ${currentStyle.dropShadow}`}
          >
            {data.available}
          </span>
          <div className="mt-2 h-1.5 w-20 rounded-full bg-gradient-gold" />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-premium-gray text-gray-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-premium-gold/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-slate-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-screen w-full max-w-[1700px] flex-col px-4 py-4 md:px-5 md:py-5 min-[1800px]:max-w-[1900px]">
        <header className="glassmorphism mb-4 rounded-[2rem] px-5 py-4 md:px-6 min-[1800px]:px-10 min-[1800px]:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-premium-black to-gray-800 shadow-lg shadow-black/10 min-[1800px]:h-20 min-[1800px]:w-20">
                <Car size={28} className="text-premium-gold min-[1800px]:scale-125" />
              </div>
              <div>
                <p className="text-[11px] min-[1800px]:text-base font-bold uppercase tracking-[0.24em] text-gray-400">
                  Premium LED Dashboard
                </p>
                <h1 className="font-logo text-xl font-black tracking-wide text-gray-900 md:text-3xl min-[1800px]:text-5xl">
                  Silal Central Market - Mall Parking
                </h1>
                <p className="mt-1 text-sm min-[1800px]:text-lg font-medium text-gray-500">
                  Full-screen live parking view
                </p>
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
            <div className="grid min-h-0 flex-grow gap-4 grid-cols-1 grid-rows-[auto_1fr] lg:grid-rows-none lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
              <section className="min-h-0">
                <StatusCard
                  title="Visitor & Staff"
                  data={slotData.visitor}
                  type="visitor"
                />
              </section>
              {/* image slideshow view */}
              <section className="glassmorphism flex min-h-0 flex-col rounded-[2rem] p-5 xl:p-6 min-[1800px]:p-10">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] min-[1800px]:text-base font-bold uppercase tracking-[0.24em] text-gray-400">
                      Information & Ads
                    </p>
                    <h2 className="mt-1 text-xl font-black text-gray-900 xl:text-2xl min-[1800px]:text-4xl">
                      Media Player
                    </h2>
                  </div>
                  <div className="h-1.5 w-16 rounded-full bg-gradient-gold" />
                </div>

                <div className="relative flex min-h-0 flex-grow flex-col overflow-hidden rounded-[1.75rem] bg-premium-black shadow-lg shadow-black/10">
                  {activeImages.length === 0 ? (
                    <div className="flex flex-grow flex-col items-center justify-center p-6 text-center text-gray-400">
                      <Film size={48} className="mb-3 text-gray-600 animate-pulse" />
                      <p className="text-sm font-bold text-gray-300">No media available</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Please upload images in LED Display Management to display them here.
                      </p>
                    </div>
                  ) : (
                    <TizenImageSlideshow
                      images={activeImages}
                      interval={5000}
                      className="absolute inset-0 w-full h-full"
                    />
                  )}
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
