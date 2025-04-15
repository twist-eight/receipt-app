import React, { useState, useEffect } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  images: string[];
  className?: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  className = "",
  onImageLoad,
  onImageError,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 画像が変わったらロード状態をリセット
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [images, currentIndex]);

  if (images.length === 0) return null;

  // 画像読み込み完了時の処理
  const handleImageLoad = () => {
    setIsLoading(false);
    if (onImageLoad) onImageLoad();
  };

  // 画像読み込みエラー時の処理
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onImageError) onImageError();
  };

  // 1枚のみの場合はナビゲーションなし
  if (images.length === 1) {
    return (
      <div
        className={`relative w-full h-40 border rounded overflow-hidden ${className}`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <span className="text-red-500">画像の読み込みに失敗しました</span>
          </div>
        ) : (
          <Image
            src={images[0]}
            alt="レシート画像"
            fill
            className="object-contain rounded"
            onLoad={handleImageLoad}
            onError={handleImageError}
            priority={true}
          />
        )}
      </div>
    );
  }

  // 複数画像の場合のナビゲーション
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
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-red-500">画像の読み込みに失敗しました</span>
        </div>
      ) : (
        <Image
          src={images[currentIndex]}
          alt={`レシート画像 ${currentIndex + 1}/${images.length}`}
          fill
          className="object-contain rounded"
          onLoad={handleImageLoad}
          onError={handleImageError}
          priority={currentIndex === 0}
        />
      )}

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
