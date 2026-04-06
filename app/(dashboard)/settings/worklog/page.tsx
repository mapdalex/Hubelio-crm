'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth-context'

type Project = {
  id: string
  name: string
  description: string | null
  color: string
  isActive: boolean
}

type Activity = {
  id: string
  name: string
  description: string | null
  hourlyRate: number
  isActive: boolean
}

export default function WorklogSettingsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProjectCreateOpen, setIsProjectCreateOpen] = useState(false)
  const [isActivityCreateOpen, setIsActivityCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  const [projectForm, setProjectForm] = useState({ name: '', description: '', color: '#3b82f6' })
  const [activityForm, setActivityForm] = useState({ name: '', description: '', hourlyRate: '0' })

  // Check if user is admin
  if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN') {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Worklog-Einstellungen</h1>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base">Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sie benötigen Admin-Rechte, um Worklog-Einstellungen zu verwalten.
          </CardContent>
        </Card>
      </div>
    )
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [projectsRes, activitiesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/activities'),
      ])

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
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectForm.name) {
      alert('Projektname ist erforderlich')
      return
    }

    setIsSubmitting(true)
    try {
      const method = editingProject ? 'PATCH' : 'POST'
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm),
      })

      if (res.ok) {
        setIsProjectCreateOpen(false)
        setEditingProject(null)
        setProjectForm({ name: '', description: '', color: '#3b82f6' })
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Fehler beim Speichern des Projekts')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityForm.name) {
      alert('Tätigkeitsname ist erforderlich')
      return
    }

    setIsSubmitting(true)
    try {
      const method = editingActivity ? 'PATCH' : 'POST'
      const url = editingActivity ? `/api/activities/${editingActivity.id}` : '/api/activities'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activityForm.name,
          description: activityForm.description,
          hourlyRate: parseFloat(activityForm.hourlyRate),
        }),
      })

      if (res.ok) {
        setIsActivityCreateOpen(false)
        setEditingActivity(null)
        setActivityForm({ name: '', description: '', hourlyRate: '0' })
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving activity:', error)
      alert('Fehler beim Speichern der Tätigkeit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      } else {
        alert('Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return

    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      } else {
        alert('Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Worklog-Einstellungen</h1>
        <p className="text-muted-foreground">Verwalten Sie Projekte und Tätigkeitsarten für die Stundenerfassung</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* PROJEKTE SEKTION */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Projekte</CardTitle>
                <CardDescription>Verwaltung aller verfügbaren Projekte</CardDescription>
              </div>
              <Dialog open={isProjectCreateOpen} onOpenChange={setIsProjectCreateOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingProject(null)
                    setProjectForm({ name: '', description: '', color: '#3b82f6' })
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Projekt hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSaveProject}>
                    <DialogHeader>
                      <DialogTitle>{editingProject ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="proj-name">Projektname *</Label>
                        <Input
                          id="proj-name"
                          value={projectForm.name}
                          onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                          placeholder="z.B. Website Entwicklung"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="proj-desc">Beschreibung</Label>
                        <Textarea
                          id="proj-desc"
                          value={projectForm.description || ''}
                          onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                          placeholder="Projektbeschreibung"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="proj-color">Farbe</Label>
                        <div className="flex items-center gap-2">
                          <input
                            id="proj-color"
                            type="color"
                            value={projectForm.color}
                            onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                            className="h-10 w-20 rounded border"
                          />
                          <span className="text-sm text-muted-foreground">{projectForm.color}</span>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                        Speichern
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Keine Projekte vorhanden</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Farbe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-sm text-muted-foreground">{project.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded border"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="text-sm">{project.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={project.isActive ? 'default' : 'secondary'}>
                            {project.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingProject(project)
                                  setProjectForm({
                                    name: project.name,
                                    description: project.description || '',
                                    color: project.color,
                                  })
                                  setIsProjectCreateOpen(true)
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* TÄTIGKEITEN SEKTION */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tätigkeitsarten</CardTitle>
                <CardDescription>Verwaltung aller verfügbaren Tätigkeitsarten</CardDescription>
              </div>
              <Dialog open={isActivityCreateOpen} onOpenChange={setIsActivityCreateOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingActivity(null)
                    setActivityForm({ name: '', description: '', hourlyRate: '0' })
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tätigkeit hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSaveActivity}>
                    <DialogHeader>
                      <DialogTitle>{editingActivity ? 'Tätigkeit bearbeiten' : 'Neue Tätigkeit'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="act-name">Tätigkeitsname *</Label>
                        <Input
                          id="act-name"
                          value={activityForm.name}
                          onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                          placeholder="z.B. Entwicklung, Testing, Dokumentation"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="act-desc">Beschreibung</Label>
                        <Textarea
                          id="act-desc"
                          value={activityForm.description || ''}
                          onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                          placeholder="Tätigkeitsbeschreibung"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="act-rate">Stundensatz (€) (optional)</Label>
                        <Input
                          id="act-rate"
                          type="number"
                          step="0.01"
                          value={activityForm.hourlyRate}
                          onChange={(e) => setActivityForm({ ...activityForm, hourlyRate: e.target.value })}
                          placeholder="0"
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
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Keine Tätigkeiten vorhanden</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Stundensatz</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{activity.name}</div>
                            <div className="text-sm text-muted-foreground">{activity.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {activity.hourlyRate > 0 ? `€ ${activity.hourlyRate.toFixed(2)}` : 'Nicht festgelegt'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={activity.isActive ? 'default' : 'secondary'}>
                            {activity.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingActivity(activity)
                                  setActivityForm({
                                    name: activity.name,
                                    description: activity.description || '',
                                    hourlyRate: activity.hourlyRate.toString(),
                                  })
                                  setIsActivityCreateOpen(true)
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteActivity(activity.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
