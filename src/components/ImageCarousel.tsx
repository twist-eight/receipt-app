import React, { useState } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  images: string[];
  className?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  // If there's only one image, just show it without navigation controls
  if (images.length === 1) {
    return (
      <div
        className={`relative w-full h-40 border rounded overflow-hidden ${className}`}
      >
        <Image
          src={images[0]}
          alt="レシート画像"
          fill
          className="object-contain rounded"
        />
      </div>
    );
  }

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isFirstImage = currentIndex === 0;
    const newIndex = isFirstImage ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isLastImage = currentIndex === images.length - 1;
    const newIndex = isLastImage ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  return (
    <div
      className={`relative w-full h-40 border rounded overflow-hidden group ${className}`}
    >
      <Image
        src={images[currentIndex]}
        alt={`レシート画像 ${currentIndex + 1}/${images.length}`}
        fill
        className="object-contain rounded"
      />

      {/* Navigation arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="前の画像"
      >
        ◀
      </button>

      <button
        onClick={goToNext}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-l opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="次の画像"
      >
        ▶
      </button>

      {/* Page indicator */}
      <div className="absolute bottom-1 left-0 right-0 text-center">
        <span className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1}/{images.length}
        </span>
      </div>
    </div>
  );
};

export default ImageCarousel;
