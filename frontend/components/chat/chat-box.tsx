"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { generateChatResponse } from "../../app/action/generate-chat-response"

interface ChatBoxProps {
  detectedDisease?: string | null
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ChatBox({ detectedDisease }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get initial response when component mounts
  useEffect(() => {
    const getInitialResponse = async () => {
      setIsLoading(true)
      try {
        const response = await generateChatResponse([], detectedDisease)
        setMessages([{ role: "assistant", content: response }])
      } catch (error) {
        console.error("Error getting initial response:", error)
        setMessages([{
          role: "assistant",
          content: "I'm sorry, I couldn't generate a response. Please try again later."
        }])
      } finally {
        setIsLoading(false)
      }
    }

    getInitialResponse()
  }, [detectedDisease])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage = { role: "user" as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Get all previous messages for context
      const chatHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Add the new user message
      chatHistory.push(userMessage)

      // Get response from OpenAI
      const response = await generateChatResponse(chatHistory, detectedDisease)

      // Add assistant response
      setMessages((prev) => [...prev, { role: "assistant", content: response }])
    } catch (error) {
      console.error("Error generating response:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again later.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[500px] bg-white">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex max-w-[80%] rounded-lg p-3",
                message.role === "user" ? "bg-green-100 ml-auto" : "bg-gray-100 mr-auto",
              )}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
            </div>
          ))}
          {isLoading && (
            <div className="bg-gray-100 max-w-[80%] rounded-lg p-3 mr-auto">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="resize-none min-h-[60px]"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          size="icon"
          disabled={isLoading || !input.trim()}
          className="bg-green-600 hover:bg-green-700 h-[60px] w-[60px]"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
