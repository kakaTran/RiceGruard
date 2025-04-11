"use client"

import { useEffect, useState, useRef } from "react"

interface DetectionBoxesProps {
  detections: any[]
  imageUrl: string
}

export default function DetectionBoxes({ detections, imageUrl }: DetectionBoxesProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  // Color mapping for different disease classes
  const colorMap: { [key: string]: string } = {
    "Brown_Spot": "border-amber-500",
    "Bacterial_Blight": "border-green-500",
    "Leaf_Blight": "border-blue-500",
    "Sheath_Blight": "border-yellow-500",
    Tungro: "border-purple-500",
  }

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      updateImageDimensions()
      setIsImageLoaded(true)
    }
  }, [imageRef.current, detections])

  const updateImageDimensions = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      })
    }
  }

  const handleImageLoad = () => {
    updateImageDimensions()
    setIsImageLoaded(true)
  }

  // Handle window resize to update box positions
  useEffect(() => {
    const handleResize = () => {
      updateImageDimensions()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (!detections || detections.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
        <div className="bg-white p-4 rounded-md shadow-md">
          <p className="text-center font-medium">No disease areas detected</p>
        </div>
      </div>
    )
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

      {isImageLoaded &&
        detections.map((detection, index) => {
          const color = colorMap[detection.class_name] || "border-red-500"
          const textColor = color.replace("border", "bg")

          // Get the original image dimensions from the detection box
          const originalWidth = detection.box[2] - detection.box[0]
          const originalHeight = detection.box[3] - detection.box[1]

          return (
            <div
              key={index}
              className={`absolute border-2 ${color} rounded-sm`}
              style={{
                left: `${detection.box[0]}px`,
                top: `${detection.box[1]}px`,
                width: `${originalWidth}px`,
                height: `${originalHeight}px`,
              }}
            >
              <span
                className={`absolute -top-6 left-0 px-1.5 py-0.5 text-xs font-medium text-white rounded ${textColor.replace("border", "bg")}`}
              >
                {detection.class_name} ({(detection.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          )
        })}
    </div>
  )
}
