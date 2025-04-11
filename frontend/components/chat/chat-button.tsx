"use client"

import { useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatBox from "./chat-box"
import { cn } from "@/lib/utils"

interface ChatButtonProps {
  detectedDisease?: string | null
  className?: string
}

export default function ChatButton({ detectedDisease, className }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 shadow-xl rounded-lg overflow-hidden">
          <div className="bg-green-600 text-white p-3 flex justify-between items-center">
            <h3 className="font-medium">Rice Disease Assistant</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleChat}
              className="h-8 w-8 text-white hover:bg-green-700 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ChatBox detectedDisease={detectedDisease} />
        </div>
      ) : (
        <Button
          onClick={toggleChat}
          className={cn(
            "fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 shadow-lg bg-green-600 hover:bg-green-700 p-0",
            className,
          )}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </>
  )
}
