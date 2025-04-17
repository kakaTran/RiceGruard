"use client"

import { MessageSquare, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ChatBox from "./chat/chat-box"
import { generateChatResponse } from "@/app/action/generate-chat-response"

// TypeScript interfaces for better type safety
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

interface LoadingState {
  general: boolean
  symptoms: boolean
  treatment: boolean
  prevention: boolean
}

interface ErrorState {
  general: string | null
  symptoms: string | null
  treatment: string | null
  prevention: string | null
}

// Simple in-memory cache
const cache = new Map<string, DiseaseInfo>()

export default function DiseaseChatButton({ diseaseName, onStartChat }: DiseaseChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [diseaseInfo, setDiseaseInfo] = useState<DiseaseInfo>({
    general: "",
    symptoms: "",
    treatment: "",
    prevention: ""
  })
  const [loading, setLoading] = useState<LoadingState>({
    general: true,
    symptoms: true,
    treatment: true,
    prevention: true
  })
  const [errors, setErrors] = useState<ErrorState>({
    general: null,
    symptoms: null,
    treatment: null,
    prevention: null
  })

  // Memoize fetch function to avoid redundant calls
  const fetchDiseaseInfo = useMemo(
    () => async (disease: string) => {
      // Check cache first
      if (cache.has(disease)) {
        setDiseaseInfo(cache.get(disease)!)
        setLoading({ general: false, symptoms: false, treatment: false, prevention: false })
        return
      }

      try {
        // Single API call with structured prompt
        const prompt = `
          Provide information about ${disease} disease in rice plants, structured into four sections with clear delimiters:
          ### General Information
          [Provide general information about the disease, its causes, and impact on rice plants]
          ### Symptoms
          [List the symptoms of the disease in rice plants]
          ### Treatment
          [List the treatment methods for the disease in rice plants]
          ### Prevention
          [List the prevention methods for the disease in rice plants]
        `
        const response = await generateChatResponse([{
          role: "user",
          content: prompt
        }]).catch(() => {
          throw new Error("Failed to load information.")
        })

        // Parse the response into four parts
        const sections = response.split("###").map(section => section.trim()).filter(section => section)
        const newInfo: DiseaseInfo = {
          general: "",
          symptoms: "",
          treatment: "",
          prevention: ""
        }

        sections.forEach(section => {
          if (section.startsWith("General Information")) {
            newInfo.general = section.replace("General Information", "").trim()
          } else if (section.startsWith("Symptoms")) {
            newInfo.symptoms = section.replace("Symptoms", "").trim()
          } else if (section.startsWith("Treatment")) {
            newInfo.treatment = section.replace("Treatment", "").trim()
          } else if (section.startsWith("Prevention")) {
            newInfo.prevention = section.replace("Prevention", "").trim()
          }
        })

        // Validate that all sections were found
        if (!newInfo.general || !newInfo.symptoms || !newInfo.treatment || !newInfo.prevention) {
          throw new Error("Incomplete response from API.")
        }

        setDiseaseInfo(newInfo)
        cache.set(disease, newInfo) // Cache the result
        setLoading({ general: false, symptoms: false, treatment: false, prevention: false })
      } catch (error) {
        console.error("Error fetching disease information:", error)
        setErrors({
          general: "Failed to load information. Please try again.",
          symptoms: "Failed to load information. Please try again.",
          treatment: "Failed to load information. Please try again.",
          prevention: "Failed to load information. Please try again."
        })
        setLoading({ general: false, symptoms: false, treatment: false, prevention: false })
      }
    },
    []
  )

  useEffect(() => {
    fetchDiseaseInfo(diseaseName)
  }, [diseaseName, fetchDiseaseInfo])

  const handleClick = () => {
    setIsOpen(true)
    onStartChat()
  }

  // Retry function for failed API calls
  const handleRetry = async (key: keyof DiseaseInfo) => {
    setLoading(prev => ({ ...prev, [key]: true }))
    setErrors(prev => ({ ...prev, [key]: null }))
    try {
      const response = await generateChatResponse([{
        role: "user",
        content: `Provide ${key} information about ${diseaseName} disease in rice plants.`
      }])
      setDiseaseInfo(prev => ({ ...prev, [key]: response }))
      cache.set(diseaseName, { ...diseaseInfo, [key]: response }) // Update cache
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: "Failed to load information. Please try again." }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  // Tab content component to reduce repetition
  const TabContent = ({ value, content, isLoading, error }: { 
    value: keyof DiseaseInfo, 
    content: string, 
    isLoading: boolean, 
    error: string | null 
  }) => (
    <TabsContent value={value} className="mt-4 p-4 bg-white rounded-lg shadow">
      <div className="whitespace-pre-line">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : error ? (
          <div className="text-red-600">
            {error}
            <Button
              variant="link"
              onClick={() => handleRetry(value)}
              className="ml-2 text-green-600"
            >
              Retry
            </Button>
          </div>
        ) : (
          content
        )}
      </div>
    </TabsContent>
  )

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
          <TabContent
            value="general"
            content={diseaseInfo.general}
            isLoading={loading.general}
            error={errors.general}
          />
          <TabContent
            value="symptoms"
            content={diseaseInfo.symptoms}
            isLoading={loading.symptoms}
            error={errors.symptoms}
          />
          <TabContent
            value="treatment"
            content={diseaseInfo.treatment}
            isLoading={loading.treatment}
            error={errors.treatment}
          />
          <TabContent
            value="prevention"
            content={diseaseInfo.prevention}
            isLoading={loading.prevention}
            error={errors.prevention}
          />
        </Tabs>
      </div>

      <Button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-[9998] rounded-full h-14 w-14 shadow-lg bg-green-600 hover:bg-green-700 p-0"
        aria-label="Open chat about rice disease"
      >
        <MessageSquare className="h-6 w-6" />
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
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ChatBox detectedDisease={diseaseName} />
        </div>
      )}
    </>
  )
}