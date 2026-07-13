import React, { useEffect, useState } from 'react';

const TizenImageSlideshow = ({ images = [], interval = 5000, className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  if (images.length === 0) return null;

  return (
    <div className={`relative overflow-hidden w-full h-full ${className}`}>
      {images.map((src, index) => (
        <div
          key={src + index}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img
            src={src}
            alt={`Slide ${index}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.warn("Slideshow image load error:", src);
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default TizenImageSlideshow;
