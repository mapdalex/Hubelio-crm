'use client'

import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

// Generate 15-minute intervals
function generateTimeSlots() {
  const slots = []
  for (let i = 0; i < 24 * 4; i++) {
    const hours = Math.floor(i / 4)
    const minutes = (i % 4) * 15
    slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`)
  }
  return slots
}

// Round current time to nearest 15-minute slot
function roundToNearest15(date: Date): string {
  const minutes = date.getMinutes()
  const rounded = Math.round(minutes / 15) * 15
  const adjustedDate = new Date(date)
  adjustedDate.setMinutes(rounded === 60 ? 0 : rounded)
  if (rounded === 60) adjustedDate.setHours(adjustedDate.getHours() + 1)
  return `${String(adjustedDate.getHours()).padStart(2, '0')}:${String(adjustedDate.getMinutes()).padStart(2, '0')}`
}

export function WorklogQuickEntry() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [formData, setFormData] = useState({
    customerId: '',
    projectId: '',
    activityId: '',
    startTime: '',
    endTime: '',
  })

  const timeSlots = generateTimeSlots()

  useEffect(() => {
    if (isOpen) {
      loadData()
      // Aktuelle Zeit auf naechsten 15-Min-Slot runden und als Endzeit setzen
      const now = new Date()
      const currentRounded = roundToNearest15(now)
      // Startzeit = 1 Stunde davor
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const startRounded = roundToNearest15(oneHourAgo)
      setFormData(prev => ({
        ...prev,
        startTime: startRounded,
        endTime: currentRounded,
      }))
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [customersRes, projectsRes, activitiesRes] = await Promise.all([
        fetch('/api/customers?page=1&limit=1000'),
        fetch('/api/projects'),
        fetch('/api/activities'),
      ])

      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers || [])
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data)
      }
      if (activitiesRes.ok) {
        const data = await activitiesRes.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerId || !formData.projectId || !formData.activityId) {
      alert('Bitte füllen Sie alle erforderlichen Felder aus')
      return
    }

    setIsSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number)
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number)

      const startDate = new Date(today)
      startDate.setHours(startHours, startMinutes, 0, 0)

      const endDate = new Date(today)
      endDate.setHours(endHours, endMinutes, 0, 0)

      // Falls Endzeit vor Startzeit, naechster Tag
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1)
      }

      const res = await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          projectId: formData.projectId,
          activityId: formData.activityId,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          description: 'Schnellerfassung',
        }),
      })

      if (res.ok) {
        setIsOpen(false)
        setFormData({
          customerId: '',
          projectId: '',
          activityId: '',
          startTime: '',
          endTime: '',
        })
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating worklog:', error)
      alert('Fehler beim Erstellen des Worklogs')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Zap className="h-4 w-4 mr-2" />
          Quick Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schnelle Stundenerfassung</DialogTitle>
          <DialogDescription>
            Erfassen Sie schnell eine Arbeitsstunde mit den wichtigsten Angaben
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="quick-customer">Kunde *</Label>
            <Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
              <SelectTrigger id="quick-customer">
                <SelectValue placeholder="Wählen Sie einen Kunden" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName || `${c.firstName} ${c.lastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quick-project">Projekt *</Label>
            <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
              <SelectTrigger id="quick-project">
                <SelectValue placeholder="Wählen Sie ein Projekt" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quick-activity">Tätigkeit *</Label>
            <Select value={formData.activityId} onValueChange={(value) => setFormData({ ...formData, activityId: value })}>
              <SelectTrigger id="quick-activity">
                <SelectValue placeholder="Wählen Sie eine Tätigkeit" />
              </SelectTrigger>
              <SelectContent>
                {activities.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="quick-start">Von *</Label>
              <Select value={formData.startTime} onValueChange={(value) => setFormData({ ...formData, startTime: value })}>
                <SelectTrigger id="quick-start">
                  <SelectValue placeholder="Startzeit" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-end">Bis *</Label>
              <Select value={formData.endTime} onValueChange={(value) => setFormData({ ...formData, endTime: value })}>
                <SelectTrigger id="quick-end">
                  <SelectValue placeholder="Endzeit" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
            Speichern
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
