"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateExplanation } from "./action/generate-explanation"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string>("")
  const [loadingExplanation, setLoadingExplanation] = useState(false)
  const [heatmapImage, setHeatmapImage] = useState<string | null>(null)
  const [loadingHeatmap, setLoadingHeatmap] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
      setResults(null)
      setError(null)
      setExplanation("")
      setHeatmapImage(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(droppedFile)
      setResults(null)
      setError(null)
      setExplanation("")
      setHeatmapImage(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setResults(null)
    setError(null)
    setExplanation("")
    setHeatmapImage(null)
  }

  const analyzeImage = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setExplanation("")
    setHeatmapImage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/detect`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        console.error(`Server error: ${response.status}`)
        const errorText = await response.text()
        console.error("Response:", errorText)
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("API Response data:", data)

      // Validate response format
      if (!data.mobilenet_classification) {
        console.error("Invalid response format - missing mobilenet_classification:", data)
        throw new Error("Invalid response format from server")
      }

      setResults(data)
      
      // After successful analysis, fetch the heatmap
      fetchHeatmap()
    } catch (err) {
      console.error("Error details:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchHeatmap = async () => {
    if (!file) return

    setLoadingHeatmap(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/detect_with_gradcam`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch heatmap: ${response.status}`)
      }

      // Get the response as a blob
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      setHeatmapImage(imageUrl)
    } catch (err) {
      console.error("Error fetching heatmap:", err)
      // Don't set an error message here to avoid disrupting the main flow
    } finally {
      setLoadingHeatmap(false)
    }
  }

  // Helper function to get the appropriate color for disease status
  const getDiseaseStatusColor = (className: string) => {
    if (className === "healthy") return "text-green-600"
    return "text-red-600"
  }

  // Helper function to check if YOLO detection is empty
  const isEmptyYoloDetection = (results: any) => {
    return results && results.yolo_detections && results.yolo_detections.length === 0
  }

  // Fetch explanation when results change
  useEffect(() => {
    const fetchExplanation = async () => {
      if (!results) return

      setLoadingExplanation(true)
      try {
        let diseaseName

        if (isEmptyYoloDetection(results)) {
          diseaseName = "no detection"
        } else {
          diseaseName = results.mobilenet_classification.class_name
        }

        const explanation = await generateExplanation(diseaseName)
        setExplanation(explanation)
      } catch (error) {
        console.error("Error fetching explanation:", error)
        setExplanation("Unable to generate explanation at this time.")
      } finally {
        setLoadingExplanation(false)
      }
    }

    if (results) {
      fetchExplanation()
    }
  }, [results])

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold text-center mb-8">Lemon Disease Detection</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Upload Lemon Fruit Image</h2>

            {!preview ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Drag and drop or click to upload</p>
                <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG</p>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  aria-label="Upload lemon leaf image"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-auto rounded-lg object-contain max-h-[400px]"
                />
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  aria-label="Remove image"
                  title="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <Button className="w-full mt-4" disabled={!file || loading} onClick={analyzeImage}>
              {loading ? "Analyzing..." : "Analyze Image"}
            </Button>

            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
          </Card>
        </div>

        <div>
          <Card className="p-4 h-full">
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : results ? (
              <Tabs defaultValue="diagnosis">
                <TabsList className="w-full">
                  <TabsTrigger value="diagnosis" className="flex-1">
                    Diagnosis
                  </TabsTrigger>
                  <TabsTrigger value="detection" className="flex-1">
                    Detection
                  </TabsTrigger>
                  <TabsTrigger value="heatmap" className="flex-1">
                    Heatmap
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="diagnosis" className="space-y-4 mt-4">
                  {isEmptyYoloDetection(results) ? (
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <h3 className="font-medium text-lg">
                        Diagnosis: <span className="text-yellow-600">No specific disease areas detected</span>
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        The system could not identify specific disease patterns in this image.
                      </p>

                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Details:</h3>
                        {loadingExplanation ? (
                          <Skeleton className="h-16 w-full" />
                        ) : (
                          <p className="text-sm">{explanation}</p>
                        )}
                      </div>

                      <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-md text-sm">
                        <p className="font-semibold">Warning:</p>
                        <p>
                          No specific disease patterns were detected in this image. The diagnosis may not be accurate.
                        </p>
                        <p className="mt-2">This could mean:</p>
                        <ul className="list-disc ml-5 mt-1">
                          <li>The image doesn't contain any recognizable disease patterns</li>
                          <li>The disease is at an early stage or difficult to detect</li>
                          <li>The image quality or lighting may be affecting analysis</li>
                        </ul>
                        <p className="mt-2">Consider consulting with a plant pathologist for proper diagnosis.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-100 p-4 rounded-lg">
                        <h3 className="font-medium text-lg">
                          Diagnosis:{" "}
                          <span className={getDiseaseStatusColor(results.mobilenet_classification.class_name)}>
                            {results.mobilenet_classification.class_name}
                          </span>
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Confidence: {(results.mobilenet_classification.confidence * 100).toFixed(2)}%
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Details:</h3>
                        {loadingExplanation ? (
                          <Skeleton className="h-16 w-full" />
                        ) : (
                          <p className="text-sm">{explanation}</p>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="detection" className="mt-4">
                  <div className="relative">
                    {preview && (
                      <img src={preview} alt="Rice Leaf" className="w-full rounded-lg" />
                    )}
                    {results.yolo_detections && results.yolo_detections.length > 0 ? (
                      results.yolo_detections.map((detection: any, index: number) => {
                        // Get color based on class name
                        const colorMap: { [key: string]: string } = {
                          'Brown Spot': 'border-red-500',
                          'Bacterial Leaf Blight': 'border-green-500',
                          'Rice Blast': 'border-blue-500',
                          'Sheath Blight': 'border-yellow-500',
                          'Tungro': 'border-purple-500'
                        }
                        
                        const color = colorMap[detection.class_name] || 'border-yellow-500'
                        
                        return (
                          <div
                            key={index}
                            className={`absolute border-2 ${color} rounded-sm flex items-center justify-center`}
                            style={{
                              left: `${detection.box[0]}px`,
                              top: `${detection.box[1]}px`,
                              width: `${detection.box[2] - detection.box[0]}px`,
                              height: `${detection.box[3] - detection.box[1]}px`,
                            }}
                          >
                            <span className={`absolute -top-6 left-0 px-1 text-xs font-medium ${color.replace('border', 'text')}`}>
                              {detection.class_name} ({(detection.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                        <div className="bg-white p-4 rounded-md shadow-md">
                          <p className="text-center font-medium">No disease areas detected</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Detection Legend:</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-red-500 mr-2"></div>
                        <span>Brown Spot</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-green-500 mr-2"></div>
                        <span>Bacterial Leaf Blight</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 mr-2"></div>
                        <span>Rice Blast</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-yellow-500 mr-2"></div>
                        <span>Sheath Blight</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-purple-500 mr-2"></div>
                        <span>Tungro</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="heatmap" className="mt-4">
                  <div className="text-center">
                    <h3 className="font-medium mb-2">Grad-CAM Heatmap Visualization</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This visualization highlights the regions that influenced the model's decision
                    </p>
                    
                    {loadingHeatmap ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Skeleton className="h-64 w-full rounded-lg" />
                        <p className="mt-4 text-sm text-gray-500">Generating heatmap visualization...</p>
                      </div>
                    ) : heatmapImage ? (
                      <div className="relative">
                        <img 
                          src={heatmapImage || "/placeholder.svg"} 
                          alt="Grad-CAM Heatmap" 
                          className="w-full h-auto rounded-lg object-contain max-h-[400px]" 
                        />
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Red areas indicate regions that strongly influenced the model's classification decision</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-8 rounded-lg text-center">
                        <p className="text-gray-600">Heatmap not available. Click "Analyze Image" to generate.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Upload and analyze a lemon leaf image to see results</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  )
}