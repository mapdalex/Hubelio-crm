'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

type User = {
  id: string
  name: string
}

type Todo = {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: string
  isCompleted: boolean
  user: { id: string; name: string }
}

type TodoFormProps = {
  users: User[]
  initialData?: Todo
  onSuccess: () => void
}

export function TodoForm({ users, initialData, onSuccess }: TodoFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate 
      ? new Date(initialData.dueDate).toISOString().split('T')[0] 
      : ''
  )
  const [priority, setPriority] = useState(initialData?.priority || 'medium')
  const [assignmentType, setAssignmentType] = useState<'self' | 'user' | 'all'>(
    initialData ? 'user' : 'self'
  )
  const [assignedUserId, setAssignedUserId] = useState(initialData?.user.id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initialData

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Titel ist erforderlich')
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEdit ? `/api/todos/${initialData.id}` : '/api/todos'
      const method = isEdit ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        priority,
      }

      if (!isEdit) {
        if (assignmentType === 'all') {
          body.assignToAll = true
        } else if (assignmentType === 'user' && assignedUserId) {
          body.assignedUserId = assignedUserId
        }
        // 'self' braucht keine zusaetzlichen Parameter
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Titel *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Was muss erledigt werden?"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Weitere Details..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Faelligkeit</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioritaet</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="priority">
              <SelectValue placeholder="Prioritaet waehlen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Niedrig</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="high">Hoch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="assignment">Zuweisen an</Label>
          <Select 
            value={assignmentType} 
            onValueChange={(v) => setAssignmentType(v as 'self' | 'user' | 'all')}
          >
            <SelectTrigger id="assignment">
              <SelectValue placeholder="Zuweisung waehlen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Mir selbst</SelectItem>
              <SelectItem value="user">Bestimmter Mitarbeiter</SelectItem>
              <SelectItem value="all">Alle Mitarbeiter</SelectItem>
            </SelectContent>
          </Select>

          {assignmentType === 'user' && (
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Mitarbeiter waehlen" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {assignmentType === 'all' && (
            <p className="text-sm text-muted-foreground mt-2">
              Ein separates Todo wird fuer jeden Mitarbeiter der Firma erstellt.
            </p>
          )}
        </div>
      )}

      {isEdit && (
        <div className="space-y-2">
          <Label>Zugewiesen an</Label>
          <p className="text-sm text-muted-foreground">{initialData.user.name}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          {isEdit ? 'Speichern' : 'Erstellen'}
        </Button>
      </div>
    </form>
  )
}
