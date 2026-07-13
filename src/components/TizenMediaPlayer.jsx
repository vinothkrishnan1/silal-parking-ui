import React, { useEffect, useRef, useState } from "react";
import TizenVideoPlayer from "./TizenVideoPlayer";

const TizenMediaPlayer = ({ mediaList = [], interval = 5000, className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef(null);

  // Sync index if mediaList changes or index is out of bounds
  useEffect(() => {
    setCurrentIndex(0);
  }, [mediaList.length]);

  const currentMedia = mediaList[currentIndex] || mediaList[0];

  const handleNext = () => {
    if (mediaList.length <= 1) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % mediaList.length);
      setIsFading(false);
    }, 500); // Matches transition duration
  };

  const isVideoUrl = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.endsWith(".ogg") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".m4v") ||
      lower.includes("video")
    );
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!currentMedia) return;

    const isVideo = isVideoUrl(currentMedia.sourceUrl);

    // If it's an image, set a timeout to transition to the next slide
    if (!isVideo && mediaList.length > 1) {
      timerRef.current = setTimeout(handleNext, interval);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, currentMedia, mediaList.length, interval]);

  if (!currentMedia) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-premium-black text-gray-400">
        No Media Available
      </div>
    );
  }

  const isVideo = isVideoUrl(currentMedia.sourceUrl);

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      <div
        className={`w-full h-full transition-opacity duration-500 ${
          isFading ? "opacity-0" : "opacity-100"
        }`}
      >
        {isVideo ? (
          <TizenVideoPlayer
            src={currentMedia.sourceUrl}
            fileType={currentMedia.fileType}
            loop={mediaList.length === 1}
            poster={currentMedia.posterUrl}
            className="w-full h-full object-cover"
            onEnded={handleNext}
          />
        ) : (
          <img
            src={currentMedia.sourceUrl}
            alt={currentMedia.title || "Slideshow image"}
            className="w-full h-full object-cover"
            onError={() => {
              console.warn("Error loading image slide:", currentMedia.sourceUrl);
              handleNext();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TizenMediaPlayer;
