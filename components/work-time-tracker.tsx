'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type WorkTimeType = 'WORK' | 'HOME_OFFICE' | 'DOCTOR_VISIT'

const typeLabels: Record<WorkTimeType, string> = {
  WORK: 'Arbeitszeit',
  HOME_OFFICE: 'Homeoffice',
  DOCTOR_VISIT: 'Arztbesuch',
}

export function WorkTimeTracker() {
  const [activeTime, setActiveTime] = useState<any>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch active work time
  useEffect(() => {
    const fetchActiveTime = async () => {
      try {
        const res = await fetch('/api/worktime/active')
        if (res.ok) {
          const data = await res.json()
          setActiveTime(data)
          if (data?.startTime) {
            const elapsed = Math.floor((Date.now() - new Date(data.startTime).getTime()) / 1000)
            setElapsedSeconds(elapsed)
          }
        }
      } catch (error) {
        console.error('Error fetching active time:', error)
      }
    }

    fetchActiveTime()
    const interval = setInterval(fetchActiveTime, 5000)
    return () => clearInterval(interval)
  }, [])

  // Update timer
  useEffect(() => {
    if (!activeTime) return

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTime])

  const startWorkTime = async (type: WorkTimeType) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/worktime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (res.ok) {
        const data = await res.json()
        setActiveTime(data)
        setElapsedSeconds(0)
      }
    } catch (error) {
      console.error('Error starting work time:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const endWorkTime = async () => {
    if (!activeTime) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/worktime/${activeTime.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endTime: new Date() }),
      })
      if (res.ok) {
        setActiveTime(null)
        setElapsedSeconds(0)
      }
    } catch (error) {
      console.error('Error ending work time:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (activeTime) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-green-600" />
          <span className="text-green-600 font-mono">{formatTime(elapsedSeconds)}</span>
          <span className="text-muted-foreground">{typeLabels[activeTime.type]}</span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={endWorkTime}
          disabled={isLoading}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={isLoading}>
          <Play className="h-4 w-4 mr-2" />
          Arbeitszeit
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(typeLabels).map(([type, label]) => (
          <DropdownMenuItem
            key={type}
            onClick={() => startWorkTime(type as WorkTimeType)}
            disabled={isLoading}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
