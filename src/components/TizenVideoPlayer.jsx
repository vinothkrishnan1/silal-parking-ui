import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

const TizenVideoPlayer = ({
  src,
  fileType,
  poster,
  loop,
  onEnded,
  className = "",
}) => {
  const videoRef = useRef(null);
  const [playError, setPlayError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef(null);

  // 1. Verify MIME type support (Tizen best supports MP4 with H.264/AAC)
  useEffect(() => {
    if (src) {
      const type = fileType || "";
      const isMp4 = type.includes("video/mp4") || src.toLowerCase().endsWith(".mp4");
      if (!isMp4) {
        console.warn(
          "[TizenVideoPlayer] Warning: Video format might not be supported. Samsung Tizen OS browsers " +
          "highly recommend MP4 (H.264 codec + AAC audio). Current source:",
          src
        );
      }
    }
  }, [src, fileType]);

  // 2. Playback logic and Source transition
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log("[TizenVideoPlayer] Setting video source to:", src);

    // Clear any pending retries on source change
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setRetryCount(0);
    setPlayError(false);

    // Set source directly on the video element.
    // In Tizen, modifying nested <source> tags dynamically fails to reload the video pipeline.
    video.src = src;

    // Explicitly request loading
    try {
      video.load();
    } catch (e) {
      console.error("[TizenVideoPlayer] Error executing video.load():", e);
    }

    const playVideo = () => {
      if (!video) return;

      console.log(`[TizenVideoPlayer] Invoking video.play() (attempt: ${retryCount + 1})`);

      // Auto-play configurations
      video.muted = true;
      video.playsInline = true;

      const playPromise = video.play();

      if (playPromise !== undefined && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            console.log("[TizenVideoPlayer] Video playback started successfully.");
            setPlayError(false);
          })
          .catch((err) => {
            console.warn("[TizenVideoPlayer] Playback promise rejected:", err);

            // Retry logic for TV environments
            if (retryCount < 5) {
              setRetryCount((prev) => prev + 1);
              retryTimeoutRef.current = setTimeout(() => {
                playVideo();
              }, 1500);
            } else {
              setPlayError(true);
            }
          });
      } else {
        // Fallback for older browsers without Promise-based play()
        console.log("[TizenVideoPlayer] Playback initiated (no Promise support).");
      }
    };

    // Minor delay to ensure video pipeline is ready for play trigger
    const startTimeout = setTimeout(playVideo, 150);

    return () => {
      clearTimeout(startTimeout);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Memory cleanup for TV OS (Crucial to prevent freezing hardware decoder)
      if (video) {
        video.src = "";
        try {
          video.load();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [src, retryCount]);

  // 3. Robust Event Handling & Debug Logs
  const handleLoadedMetadata = () => {
    console.log(
      "[TizenVideoPlayer] Event: onLoadedMetadata. Duration:",
      videoRef.current ? videoRef.current.duration : "unknown"
    );
  };

  const handleCanPlay = () => {
    console.log("[TizenVideoPlayer] Event: onCanPlay");
  };

  const handlePlay = () => {
    console.log("[TizenVideoPlayer] Event: onPlay");
  };

  const handleWaiting = () => {
    console.log("[TizenVideoPlayer] Event: onWaiting (Buffering)");
  };

  const handleStalled = () => {
    console.log("[TizenVideoPlayer] Event: onStalled (No media data available)");
  };

  const handleVideoError = (event) => {
    const errorDetails = videoRef.current ? videoRef.current.error : null;
    console.error("[TizenVideoPlayer] Event: onError", {
      code: errorDetails ? errorDetails.code : "unknown",
      message: errorDetails ? errorDetails.message : "unknown",
    });
    setPlayError(true);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        preload="auto"
        loop={loop}
        poster={poster}
        onEnded={onEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onWaiting={handleWaiting}
        onStalled={handleStalled}
        onError={handleVideoError}
      />

      {playError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 text-white p-6 text-center z-10">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h4 className="font-bold text-lg mb-2">Video Unplayable</h4>
          <p className="text-sm text-gray-400 max-w-xs mb-6">
            Unable to stream media. The file format is unsupported or network request timed out.
          </p>
          <button
            onClick={() => {
              setRetryCount(0);
              setPlayError(false);
              if (videoRef.current) {
                videoRef.current.load();
                const playPromise = videoRef.current.play();
                if (playPromise && typeof playPromise.catch === "function") {
                  playPromise.catch(() => { });
                }
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-premium-gold px-5 py-2.5 text-sm font-bold text-premium-black transition hover:bg-yellow-500"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default TizenVideoPlayer;
