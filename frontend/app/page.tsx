"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload, X, Leaf, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { generateExplanation } from "./action/generate-explanation"

// Import components
import DetectionBoxes from "../components/detection-boxes"
import DiseaseChatButton from "../components/disease-chat-button"

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
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
      resetResults()
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
      resetResults()
    }
  }

  const resetResults = () => {
    setResults(null)
    setError(null)
    setExplanation("")
    setHeatmapImage(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    resetResults()
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
        const errorText = await response.text()
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      // Validate response format
      if (!data.mobilenet_classification) {
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
    } finally {
      setLoadingHeatmap(false)
    }
  }

  // Helper function to get the appropriate color for disease status
  const getDiseaseStatusColor = (className: string) => {
    if (className === "healthy") return "bg-green-100 text-green-800 border-green-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  // Helper function to check if YOLO detection is empty
  const isEmptyYoloDetection = (results: any) => {
    return results && results.yolo_detections && results.yolo_detections.length === 0
  }

  // Get the detected disease name
  const getDetectedDisease = () => {
    if (!results) return null
    return results.mobilenet_classification.class_name
  }

  // Open chat with context
  const openChatWithContext = () => {
    setIsChatOpen(true)
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
      <div className="flex flex-col items-center justify-center mb-8 space-y-2">
        <div className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">Rice Leaf Disease Detection</h1>
        </div>
        <p className="text-muted-foreground text-center max-w-2xl">
          Upload an image of a rice leaf to detect and analyze potential diseases using our AI-powered system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-full">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Rice Leaf Image
              </CardTitle>
              <CardDescription>Upload a clear image of a rice leaf for accurate disease detection</CardDescription>
            </CardHeader>
            <CardContent>
              {!preview ? (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="bg-green-50 p-3 rounded-full">
                      <Upload className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="font-medium text-gray-700">Drag and drop or click to upload</p>
                    <p className="text-xs text-gray-500">Supports JPG, PNG (Max 10MB)</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    aria-label="Upload rice leaf image"
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-full h-auto object-contain max-h-[400px]"
                  />
                  <button
                    onClick={clearFile}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <Button className="w-full mt-4" disabled={!file || loading} onClick={analyzeImage} variant="default">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                ) : (
                  "Analyze Image"
                )}
              </Button>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
              <CardDescription>Comprehensive analysis of the uploaded rice leaf image</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : results ? (
                <Tabs defaultValue="diagnosis" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                    <TabsTrigger value="detection">Detection</TabsTrigger>
                    <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  </TabsList>

                  <TabsContent value="diagnosis" className="space-y-4">
                    {isEmptyYoloDetection(results) ? (
                      <div className="space-y-4">
                        <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertTitle className="text-yellow-800">No specific disease areas detected</AlertTitle>
                          <AlertDescription className="text-yellow-700">
                            The system could not identify specific disease patterns in this image.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <h3 className="font-medium">Details:</h3>
                          {loadingExplanation ? (
                            <Skeleton className="h-16 w-full" />
                          ) : (
                            <div className="text-sm text-gray-700 space-y-2">
                              <p>{explanation}</p>
                            </div>
                          )}
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Recommendations</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            <ul className="list-disc ml-5 mt-1 text-sm space-y-1">
                              <li>Try uploading a clearer image with better lighting</li>
                              <li>Ensure the leaf is properly visible in the frame</li>
                              <li>Consider consulting with a plant pathologist for proper diagnosis</li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-lg">Primary Diagnosis</h3>
                            <Badge className={getDiseaseStatusColor(results.mobilenet_classification.class_name)}>
                              {results.mobilenet_classification.class_name}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Confidence level</span>
                              <span>{(results.mobilenet_classification.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={results.mobilenet_classification.confidence * 100} className="h-2" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-medium">Disease Information:</h3>
                          {loadingExplanation ? (
                            <Skeleton className="h-16 w-full" />
                          ) : (
                            <div className="text-sm text-gray-700 space-y-2 p-3 bg-gray-50 rounded-lg">
                              <p>{explanation}</p>
                            </div>
                          )}
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Treatment Recommendations</AlertTitle>
                          <AlertDescription className="text-blue-700 text-sm">
                            {results.mobilenet_classification.class_name === "healthy" ? (
                              <p>Your rice plant appears healthy. Continue with regular care and monitoring.</p>
                            ) : (
                              <ul className="list-disc ml-5 mt-1 space-y-1">
                                <li>Isolate affected plants to prevent spread</li>
                                <li>
                                  Consider appropriate fungicides or treatments specific to{" "}
                                  {results.mobilenet_classification.class_name}
                                </li>
                                <li>Ensure proper drainage and air circulation</li>
                                <li>Consult with a local agricultural extension for specific treatment options</li>
                              </ul>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="detection">
                    <div className="space-y-4">
                      <div className="relative border rounded-lg overflow-hidden">
                        {preview && results?.yolo_detections ? (
                          <DetectionBoxes detections={results.yolo_detections} imageUrl={preview} />
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-gray-50 p-6 rounded-full mb-4">
                              <Leaf className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-700">No Detection Results</h3>
                            <p className="text-gray-500 mt-2">
                              Upload and analyze a rice leaf image to see detection results
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Detection Legend:</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-500 rounded-sm"></div>
                            <span>Brown_Spot</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                            <span>Bacterial_Blight</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                            <span>Leaf_Blight</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
                            <span>Sheath_Blight</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                            <span>Tungro</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="heatmap">
                    <div className="space-y-4">
                      <div className="text-center p-4 border rounded-lg">
                        <h3 className="font-medium mb-2">Grad-CAM Heatmap Visualization</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          This visualization highlights the regions that influenced the model's decision
                        </p>

                        {loadingHeatmap ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
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
                          </div>
                        ) : (
                          <div className="bg-gray-100 p-8 rounded-lg text-center">
                            <p className="text-gray-600">Heatmap not available. Click "Analyze Image" to generate.</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-2">How to interpret the heatmap:</h3>
                        <ul className="text-sm space-y-2">
                          <li className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                            <span>Red areas indicate regions that strongly influenced the model's classification</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
                            <span>Yellow areas had moderate influence on the classification</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                            <span>Blue areas had minimal influence on the classification</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-gray-50 p-6 rounded-full mb-4">
                    <Leaf className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No Analysis Results</h3>
                  <p className="text-gray-500 mt-2 max-w-md">
                    Upload and analyze a rice leaf image to see detailed results and disease information
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {results && (
        <DiseaseChatButton
          diseaseName={results.mobilenet_classification.class_name}
          onStartChat={openChatWithContext}
        />
      )}
    </main>
  )
}
