"use client"

import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface HelpTooltipProps {
  content: string
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

export function HelpTooltip({ content, side = "top", className = "" }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors ${className}`}
            aria-label="Help"
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-sm">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
