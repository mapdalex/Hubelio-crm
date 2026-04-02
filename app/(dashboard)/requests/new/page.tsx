'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'

const requestTypes = [
  { value: 'VACATION', label: 'Urlaub', description: 'Beantragen Sie Ihren Jahresurlaub' },
  { value: 'SPECIAL_LEAVE', label: 'Sonderurlaub', description: 'Fuer besondere Anlaesse wie Hochzeit, Umzug etc.' },
  { value: 'MEETING', label: 'Meeting', description: 'Beantragen Sie ein Meeting oder eine Besprechung' },
  { value: 'HOME_OFFICE', label: 'Home Office', description: 'Beantragen Sie Arbeit von zu Hause' },
  { value: 'BUSINESS_TRIP', label: 'Dienstreise', description: 'Beantragen Sie eine Geschaeftsreise' },
  { value: 'TRAINING', label: 'Weiterbildung', description: 'Beantragen Sie eine Schulung oder Weiterbildung' },
  { value: 'OTHER', label: 'Sonstiges', description: 'Andere Antraege' },
]

export default function NewRequestPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type || !formData.title) {
      toast.error('Bitte fuellen Sie alle Pflichtfelder aus')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Fehler beim Erstellen')
      }

      toast.success('Antrag erfolgreich erstellt')
      router.push('/requests')
    } catch (error) {
      console.error('Error creating request:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen des Antrags')
    } finally {
      setIsSubmitting(false)
    }
  }

  const needsDateRange = ['VACATION', 'SPECIAL_LEAVE', 'HOME_OFFICE', 'BUSINESS_TRIP', 'TRAINING'].includes(formData.type)
  const selectedType = requestTypes.find(t => t.value === formData.type)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Neuer Antrag</h1>
          <p className="text-muted-foreground">
            Erstellen Sie einen neuen Antrag zur Genehmigung
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Antragsdetails</CardTitle>
            <CardDescription>
              Fuellen Sie die folgenden Felder aus, um Ihren Antrag einzureichen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Antragstyp *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Waehlen Sie einen Antragstyp" />
                </SelectTrigger>
                <SelectContent>
                  {requestTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-sm text-muted-foreground">{selectedType.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel / Betreff *</Label>
              <Input
                id="title"
                placeholder="z.B. Urlaubsantrag fuer Sommerferien"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Weitere Details zu Ihrem Antrag..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {needsDateRange && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Von *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="startDate"
                      type="date"
                      className="pl-9"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required={needsDateRange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Bis *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="endDate"
                      type="date"
                      className="pl-9"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      min={formData.startDate}
                      required={needsDateRange}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/requests">Abbrechen</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Wird eingereicht...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Antrag einreichen
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
