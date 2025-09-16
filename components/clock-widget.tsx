"use client"

import { useState, useEffect } from "react"
import { Clock, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export function ClockWidget() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [showClock, setShowClock] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Calendar Popover */}
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground p-1 h-auto">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {formatDate(currentTime)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 neobrutalism-card" align="end">
          <Calendar mode="single" selected={currentTime} onSelect={() => {}} initialFocus />
        </PopoverContent>
      </Popover>

      {/* Clock Popover */}
      <Popover open={showClock} onOpenChange={setShowClock}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground p-1 h-auto font-mono"
          >
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(currentTime)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 neobrutalism-card" align="end">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold mb-2">{formatTime(currentTime)}</div>
            <div className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
