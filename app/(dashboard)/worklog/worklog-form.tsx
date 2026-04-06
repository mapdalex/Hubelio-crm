'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { DialogFooter } from '@/components/ui/dialog'

type WorklogFormProps = {
  customers: any[]
  projects: any[]
  initialData?: any
  onSuccess: () => void
}

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

export function WorklogForm({ customers, projects, initialData, onSuccess }: WorklogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [formData, setFormData] = useState({
    customerId: initialData?.customerId || '',
    projectId: initialData?.projectId || '',
    activityId: initialData?.activityId || '',
    date: initialData ? new Date(initialData.startTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    startTime: initialData ? new Date(initialData.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00',
    endTime: initialData ? new Date(initialData.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '10:00',
    description: initialData?.description || '',
  })

  const timeSlots = generateTimeSlots()

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      const res = await fetch('/api/activities')
      const data = await res.json()
      setActivities(data)
    } catch (error) {
      console.error('Error loading activities:', error)
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
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number)
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number)

      const startDate = new Date(formData.date)
      startDate.setHours(startHours, startMinutes, 0, 0)

      const endDate = new Date(formData.date)
      endDate.setHours(endHours, endMinutes, 0, 0)

      // If end time is before start time, assume next day
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1)
      }

      const url = initialData ? `/api/worklogs/${initialData.id}` : '/api/worklogs'
      const method = initialData ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          projectId: formData.projectId,
          activityId: formData.activityId,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          description: formData.description,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving worklog:', error)
      alert('Fehler beim Speichern des Worklogs')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="customerId">Kunde *</Label>
          <Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
            <SelectTrigger id="customerId">
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
          <Label htmlFor="projectId">Projekt *</Label>
          <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
            <SelectTrigger id="projectId">
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
          <Label htmlFor="activityId">Tätigkeit *</Label>
          <Select value={formData.activityId} onValueChange={(value) => setFormData({ ...formData, activityId: value })}>
            <SelectTrigger id="activityId">
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

        <div className="grid gap-2">
          <Label htmlFor="date">Datum *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="startTime">Von *</Label>
            <Select value={formData.startTime} onValueChange={(value) => setFormData({ ...formData, startTime: value })}>
              <SelectTrigger id="startTime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endTime">Bis *</Label>
            <Select value={formData.endTime} onValueChange={(value) => setFormData({ ...formData, endTime: value })}>
              <SelectTrigger id="endTime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            placeholder="Beschreibung der Arbeit"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          Speichern
        </Button>
      </DialogFooter>
    </form>
  )
}
