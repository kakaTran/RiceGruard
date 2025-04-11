"use client"

import { MessageSquare, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ChatBox from "./chat/chat-box"
import { generateChatResponse } from "@/app/action/generate-chat-response"

interface DiseaseChatButtonProps {
  diseaseName: string
  onStartChat: () => void
}

interface DiseaseInfo {
  general: string
  symptoms: string
  treatment: string
  prevention: string
}

export default function DiseaseChatButton({ diseaseName, onStartChat }: DiseaseChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [diseaseInfo, setDiseaseInfo] = useState<DiseaseInfo>({
    general: "Loading...",
    symptoms: "Loading...",
    treatment: "Loading...",
    prevention: "Loading..."
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDiseaseInfo = async () => {
      try {
        setIsLoading(true)
        
        // Fetch general information
        const generalResponse = await generateChatResponse([{
          role: "user",
          content: `Provide general information about ${diseaseName} disease in rice plants.`
        }])
        setDiseaseInfo(prev => ({ ...prev, general: generalResponse }))

        // Fetch symptoms
        const symptomsResponse = await generateChatResponse([{
          role: "user",
          content: `List the symptoms of ${diseaseName} disease in rice plants.`
        }])
        setDiseaseInfo(prev => ({ ...prev, symptoms: symptomsResponse }))

        // Fetch treatment
        const treatmentResponse = await generateChatResponse([{
          role: "user",
          content: `List the treatment methods for ${diseaseName} disease in rice plants.`
        }])
        setDiseaseInfo(prev => ({ ...prev, treatment: treatmentResponse }))

        // Fetch prevention
        const preventionResponse = await generateChatResponse([{
          role: "user",
          content: `List the prevention methods for ${diseaseName} disease in rice plants.`
        }])
        setDiseaseInfo(prev => ({ ...prev, prevention: preventionResponse }))

      } catch (error) {
        console.error("Error fetching disease information:", error)
        setDiseaseInfo({
          general: "Failed to load information. Please try again later.",
          symptoms: "Failed to load information. Please try again later.",
          treatment: "Failed to load information. Please try again later.",
          prevention: "Failed to load information. Please try again later."
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDiseaseInfo()
  }, [diseaseName])

  const handleClick = () => {
    setIsOpen(true)
    onStartChat()
  }

  return (
    <>
      <div className="mt-4 w-full">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Disease Info</TabsTrigger>
            <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            <TabsTrigger value="treatment">Treatment</TabsTrigger>
            <TabsTrigger value="prevention">Prevention</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-4 p-4 bg-white rounded-lg shadow">
            <div className="whitespace-pre-line">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : diseaseInfo.general}
            </div>
          </TabsContent>
          <TabsContent value="symptoms" className="mt-4 p-4 bg-white rounded-lg shadow">
            <div className="whitespace-pre-line">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : diseaseInfo.symptoms}
            </div>
          </TabsContent>
          <TabsContent value="treatment" className="mt-4 p-4 bg-white rounded-lg shadow">
            <div className="whitespace-pre-line">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : diseaseInfo.treatment}
            </div>
          </TabsContent>
          <TabsContent value="prevention" className="mt-4 p-4 bg-white rounded-lg shadow">
            <div className="whitespace-pre-line">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : diseaseInfo.prevention}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Button
        onClick={handleClick}
        variant="outline"
        className="mt-4 w-full flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Ask about {diseaseName}</span>
      </Button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 sm:w-96 shadow-xl rounded-lg overflow-hidden">
          <div className="bg-green-600 text-white p-3 flex justify-between items-center">
            <h3 className="font-medium">Rice Disease Assistant</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-white hover:bg-green-700 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ChatBox detectedDisease={diseaseName} />
        </div>
      )}

      <Button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-[9998] rounded-full h-14 w-14 shadow-lg bg-green-600 hover:bg-green-700 p-0"
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    </>
  )
}
