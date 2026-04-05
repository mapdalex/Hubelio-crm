'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Clock, Play, Stop } from 'lucide-react'

interface ActiveWorkTime {
  id: string
  type: 'WORK' | 'HOME_OFFICE' | 'DOCTOR_VISIT'
  startTime: string
  endTime: string | null
}

const typeLabels = {
  WORK: 'Arbeitszeit',
  HOME_OFFICE: 'Homeoffice',
  DOCTOR_VISIT: 'Arztbesuch',
}

export function WorkTimeTracker() {
  const { user } = useAuth()
  const [activeWorkTime, setActiveWorkTime] = useState<ActiveWorkTime | null>(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch active work time
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await fetch('/api/worktime/active')
        if (res.ok) {
          const data = await res.json()
          setActiveWorkTime(data)
        }
      } catch (err) {
        console.error('Failed to fetch active work time:', err)
      }
    }

    fetchActive()
    const interval = setInterval(fetchActive, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Update elapsed time
  useEffect(() => {
    if (!activeWorkTime) return

    const updateElapsed = () => {
      const start = new Date(activeWorkTime.startTime).getTime()
      const now = new Date().getTime()
      const diff = now - start

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setElapsed(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [activeWorkTime])

  const handleStartWorkTime = async (type: string) => {
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/worktime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Fehler beim Starten')
        setIsLoading(false)
        return
      }

      const data = await res.json()
      setActiveWorkTime(data)
      setError('')
    } catch (err) {
      setError('Fehler beim Starten der Arbeitszeit')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndWorkTime = async () => {
    if (!activeWorkTime) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/worktime/${activeWorkTime.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endTime: new Date().toISOString() }),
      })

      if (!res.ok) {
        setError('Fehler beim Beenden')
        setIsLoading(false)
        return
      }

      setActiveWorkTime(null)
      setElapsed('00:00:00')
      setError('')
    } catch (err) {
      setError('Fehler beim Beenden der Arbeitszeit')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'].includes(user.role || '')) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {activeWorkTime ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">{typeLabels[activeWorkTime.type]}</span>
            <span className="text-sm font-mono text-green-600">{elapsed}</span>
          </div>
          <Button
            onClick={handleEndWorkTime}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-100"
          >
            <Stop className="w-4 h-4" />
            <span className="ml-1">Ende</span>
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isLoading}
            >
              <Play className="w-4 h-4" />
              Arbeitszeit
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleStartWorkTime('WORK')}
              disabled={isLoading}
            >
              <Clock className="w-4 h-4 mr-2" />
              Arbeitszeit starten
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStartWorkTime('HOME_OFFICE')}
              disabled={isLoading}
            >
              <Clock className="w-4 h-4 mr-2" />
              Homeoffice starten
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStartWorkTime('DOCTOR_VISIT')}
              disabled={isLoading}
            >
              <Clock className="w-4 h-4 mr-2" />
              Arztbesuch starten
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
