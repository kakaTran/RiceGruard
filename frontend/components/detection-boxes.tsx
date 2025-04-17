"use client";

import { useEffect, useState, useRef } from "react";

interface DetectionBoxesProps {
  detections: any[];
  imageUrl: string;
  heatmapUrl: string;
}

export default function DetectionBoxes({ detections, imageUrl, heatmapUrl }: DetectionBoxesProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const colorMap: { [key: string]: string } = {
    Brown_Spot: "border-amber-500",
    Bacterial_Blight: "border-green-500",
    Leaf_Blight: "border-blue-500",
    Sheath_Blight: "border-yellow-500",
    Tungro: "border-purple-500",
  };

  const bgColorMap: { [key: string]: string } = {
    Brown_Spot: "bg-amber-500",
    Bacterial_Blight: "bg-green-500",
    Leaf_Blight: "bg-blue-500",
    Sheath_Blight: "bg-yellow-500",
    Tungro: "bg-purple-500",
  };

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      updateImageDimensions();
      setIsImageLoaded(true);
    }
  }, [imageRef.current, detections]);

  const updateImageDimensions = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
        naturalWidth: imageRef.current.naturalWidth,
        naturalHeight: imageRef.current.naturalHeight,
      });
    }
  };

  const handleImageLoad = () => {
    updateImageDimensions();
    setIsImageLoaded(true);
  };

  useEffect(() => {
    const handleResize = () => {
      updateImageDimensions();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  console.log("Detections:", detections);

  if (!detections || detections.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
        <div className="bg-white p-4 rounded-md shadow-md">
          <p className="text-center font-medium">No disease areas detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img
        ref={imageRef}
        src={imageUrl || "/placeholder.svg"}
        alt="Rice Leaf"
        className="w-full rounded-lg"
        onLoad={handleImageLoad}
      />

      {isImageLoaded && heatmapUrl && (
        <img
          src={heatmapUrl}
          alt="Heatmap Overlay"
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          style={{ mixBlendMode: 'multiply' }}
        />
      )}

      {isImageLoaded &&
        detections.map((detection, index) => {
          console.log(`Rendering detection ${index}:`, detection);
          const borderColor = colorMap[detection.class_name] || "border-red-500";
          const bgColor = bgColorMap[detection.class_name] || "bg-red-500";

          const scaleX = imageDimensions.width / imageDimensions.naturalWidth;
          const scaleY = imageDimensions.height / imageDimensions.naturalHeight;

          const left = detection.box[0] * scaleX;
          const top = detection.box[1] * scaleY;
          const width = (detection.box[2] - detection.box[0]) * scaleX;
          const height = (detection.box[3] - detection.box[1]) * scaleY;

          return (
            <div
              key={index}
              className={`absolute border-2 ${borderColor} rounded-sm cursor-pointer`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              <div
                className={`absolute -top-8 left-0 px-2 py-1 text-xs font-medium text-white rounded ${bgColor} opacity-0 transition-opacity duration-200 hover:opacity-100`}
              >
                {detection.class_name} ({(detection.confidence * 100).toFixed(0)}%)
              </div>
            </div>
          );
        })}
    </div>
  );
}