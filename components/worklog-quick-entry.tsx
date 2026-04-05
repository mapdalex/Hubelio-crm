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
    duration: '1', // in hours
  })

  const timeSlots = generateTimeSlots()

  useEffect(() => {
    if (isOpen) {
      loadData()
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
      const now = new Date()
      const startTime = new Date(now)
      const endTime = new Date(now.getTime() + parseInt(formData.duration) * 60 * 60 * 1000)

      const res = await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          projectId: formData.projectId,
          activityId: formData.activityId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          description: 'Schnellerfassung',
        }),
      })

      if (res.ok) {
        setIsOpen(false)
        setFormData({
          customerId: '',
          projectId: '',
          activityId: '',
          duration: '1',
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

          <div className="grid gap-2">
            <Label htmlFor="quick-duration">Dauer (Stunden) *</Label>
            <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
              <SelectTrigger id="quick-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8].map((hours) => (
                  <SelectItem key={hours} value={hours.toString()}>
                    {hours === 0.25 ? '15 Min' : hours === 0.5 ? '30 Min' : hours === 0.75 ? '45 Min' : `${hours}h`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
