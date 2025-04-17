"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Upload, X, Leaf, AlertCircle, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { generateExplanation } from "./action/generate-explanation";
import DetectionBoxes from "../components/detection-boxes";
import DiseaseChatButton from "../components/disease-chat-button";

// Type definitions for better type safety
interface AnalysisResults {
  mobilenet_classification: { class_name: string; confidence: number };
  yolo_detections: any[];
}

interface ImageState {
  file: File | null;
  preview: string | null;
  heatmap: string | null;
  detection: string | null;
}

export default function Home() {
  // Centralized state management
  const [imageState, setImageState] = useState<ImageState>({
    file: null,
    preview: null,
    heatmap: null,
    detection: null,
  });
  const [loading, setLoading] = useState({
    analysis: false,
    heatmap: false,
    detection: false,
    explanation: false,
  });
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");

  // Handle file selection (input or drag-and-drop)
  const handleFileChange = useCallback((file: File) => {
    setImageState({
      file,
      preview: URL.createObjectURL(file),
      heatmap: null,
      detection: null,
    });
    setResults(null);
    setError(null);
    setExplanation("");
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  // Clear all data
  const clearFile = () => {
    setImageState({ file: null, preview: null, heatmap: null, detection: null });
    setResults(null);
    setError(null);
    setExplanation("");
  };

  // Analyze image and fetch results
  const analyzeImage = async () => {
    if (!imageState.file) return;

    setLoading((prev) => ({ ...prev, analysis: true }));
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", imageState.file);

      // Fetch all results in parallel
      const [detectRes, heatmapRes, detectionRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/detect`, { method: "POST", body: formData }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/detect_with_gradcam`, { method: "POST", body: formData }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/detect_with_boxes`, { method: "POST", body: formData }),
      ]);

      if (!detectRes.ok || !heatmapRes.ok || !detectionRes.ok) {
        throw new Error("Failed to fetch results from server");
      }

      const [data, heatmapBlob, detectionBlob] = await Promise.all([
        detectRes.json(),
        heatmapRes.blob(),
        detectionRes.blob(),
      ]);

      if (!data.mobilenet_classification) {
        throw new Error("Invalid response format from server");
      }

      setResults(data);
      setImageState((prev) => ({
        ...prev,
        heatmap: URL.createObjectURL(heatmapBlob),
        detection: URL.createObjectURL(detectionBlob),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading((prev) => ({ ...prev, analysis: false }));
    }
  };

  // Generate explanation for detected disease
  const fetchExplanation = useCallback(async () => {
    if (!results) return;

    setLoading((prev) => ({ ...prev, explanation: true }));
    try {
      const diseaseName = results.yolo_detections.length === 0 ? "no detection" : results.mobilenet_classification.class_name;
      const messages = [{ role: "user", content: `What can you tell me about ${diseaseName}?` }];
      const explanationText = await generateExplanation(messages);
      setExplanation(explanationText);
    } catch (err) {
      setExplanation("Unable to generate explanation at this time.");
    } finally {
      setLoading((prev) => ({ ...prev, explanation: false }));
    }
  }, [results]);

  // Fetch explanation when results change
  useEffect(() => {
    if (results) fetchExplanation();
  }, [results, fetchExplanation]);

  // Helper functions
  const isEmptyYoloDetection = () => results?.yolo_detections?.length === 0;
  const getDiseaseStatusColor = (className: string) =>
    className === "healthy" ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200";

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col items-center mb-8 space-y-2">
        <div className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">Rice Leaf Disease Detection</h1>
        </div>
        <p className="text-muted-foreground text-center max-w-2xl">
          Upload an image of a rice leaf to detect and analyze potential diseases using our AI-powered system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Rice Leaf Image
            </CardTitle>
            <CardDescription>Upload a clear image of a rice leaf for accurate disease detection</CardDescription>
          </CardHeader>
          <CardContent>
            {!imageState.preview ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50"
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <div className="flex flex-col items-center gap-2">
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
                  onChange={onFileChange}
                  aria-label="Upload rice leaf image"
                />
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={imageState.preview}
                  alt="Preview"
                  className="w-full h-auto object-contain max-h-[400px]"
                />
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <Button
              className="w-full mt-4"
              disabled={!imageState.file || loading.analysis}
              onClick={analyzeImage}
            >
              {loading.analysis ? "Analyzing..." : "Analyze Image"}
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

        {/* Analysis Section */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
            <CardDescription>Comprehensive analysis of the uploaded rice leaf image</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.analysis ? (
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
                  {isEmptyYoloDetection() ? (
                    <div className="space-y-4">
                      <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-800">No specific disease areas detected</AlertTitle>
                        <AlertDescription className="text-yellow-700">
                          The system could not identify specific disease patterns in this image.
                        </AlertDescription>
                      </Alert>

                      {/* {loading.explanation ? (
                        <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                          <span className="ml-2 text-sm text-gray-600">Generating explanation...</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 space-y-2 p-3 bg-gray-50 rounded-lg">
                          <p>{explanation}</p>
                        </div>
                      )} */}

                      <Alert className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Recommendations</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          <ul className="list-disc ml-5 mt-1 text-sm space-y-1">
                            <li>Try uploading a clearer image with better lighting</li>
                            <li>Ensure the leaf is properly visible in the frame</li>
                            <li>Consult with a plant pathologist for proper diagnosis</li>
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

                      {/* {loading.explanation ? (
                        <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                          <span className="ml-2 text-sm text-gray-600">Generating explanation...</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 space-y-2 p-3 bg-gray-50 rounded-lg">
                          <p>{explanation}</p>
                        </div>
                      )} */}

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
                      {imageState.preview && results?.yolo_detections ? (
                        <DetectionBoxes detections={results.yolo_detections} imageUrl={imageState.preview} />
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
                        {[
                          { color: "bg-amber-500", label: "Brown_Spot" },
                          { color: "bg-green-500", label: "Bacterial_Blight" },
                          { color: "bg-blue-500", label: "Leaf_Blight" },
                          { color: "bg-yellow-500", label: "Sheath_Blight" },
                          { color: "bg-purple-500", label: "Tungro" },
                        ].map(({ color, label }) => (
                          <div key={label} className="flex items-center gap-2">
                            <div className={`w-4 h-4 ${color} rounded-sm`}></div>
                            <span>{label}</span>
                          </div>
                        ))}
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

                      {isEmptyYoloDetection() ? (
                        <div className="bg-gray-100 p-8 rounded-lg text-center">
                          <p className="text-gray-600 font-medium">Heatmap Not Available</p>
                          <p className="text-gray-500 mt-2">No disease detected in the image.</p>
                        </div>
                      ) : imageState.heatmap ? (
                        <img
                          src={imageState.heatmap}
                          alt="Grad-CAM Heatmap"
                          className="w-full h-auto rounded-lg object-contain max-h-[400px]"
                        />
                      ) : (
                        <div className="bg-gray-100 p-8 rounded-lg text-center">
                          <p className="text-gray-600">Heatmap not available. Click "Analyze Image" to generate.</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">How to interpret the heatmap:</h3>
                      <ul className="text-sm space-y-2">
                        {[
                          { color: "bg-red-500", text: "Red areas indicate regions that strongly influenced the model's classification" },
                          { color: "bg-yellow-500", text: "Yellow areas had moderate influence on the classification" },
                          { color: "bg-blue-500", text: "Blue areas had minimal influence on the classification" },
                        ].map(({ color, text }) => (
                          <li key={text} className="flex items-center gap-2">
                            <div className={`w-4 h-4 ${color} rounded-sm`}></div>
                            <span>{text}</span>
                          </li>
                        ))}
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

      {results && !isEmptyYoloDetection() && (
        <DiseaseChatButton
          diseaseName={results.mobilenet_classification.class_name || "unknown"}
          onStartChat={fetchExplanation}
        />
      )}
    </main>
  );
}