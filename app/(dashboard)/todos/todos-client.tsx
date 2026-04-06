'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckSquare, Calendar, MoreHorizontal, Trash2, Edit2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TodoForm } from './todo-form'
import { cn } from '@/lib/utils'

type Todo = {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: string
  isCompleted: boolean
  completedAt: string | null
  createdAt: string
  user: { id: string; name: string }
  createdBy: { id: string; name: string }
}

const priorityColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const priorityLabels: Record<string, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
}

function getMonthOptions() {
  const options = []
  const today = new Date()
  
  // Aktueller Monat und die letzten 11 Monate
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
    options.push({ value, label })
  }
  
  return options
}

export function TodosClient() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  const monthOptions = getMonthOptions()

  const loadTodos = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMonth !== 'all') {
        params.append('month', selectedMonth)
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const res = await fetch(`/api/todos?${params}`)
      const data = await res.json()
      setTodos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading todos:', error)
      setTodos([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedMonth, statusFilter])

  const loadUsers = useCallback(async () => {
    try {
      // Lädt nur User innerhalb der eigenen Firma
      const res = await fetch('/api/todos/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTodos()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadTodos])

  const handleToggleComplete = async (todo: Todo) => {
    try {
      const method = todo.isCompleted ? 'DELETE' : 'POST'
      const res = await fetch(`/api/todos/${todo.id}/complete`, { method })
      if (res.ok) {
        loadTodos()
      }
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Todo wirklich loeschen?')) return
    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadTodos()
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`)
      const data = await res.json()
      setEditingTodo(data)
    } catch (error) {
      console.error('Error loading todo:', error)
    }
  }

  const openTodos = todos.filter(t => !t.isCompleted).length
  const completedTodos = todos.filter(t => t.isCompleted).length

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && !todos.find(t => t.dueDate === dueDate)?.isCompleted
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Todos</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Aufgaben und Todos</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neues Todo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Todo erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie ein neues Todo
              </DialogDescription>
            </DialogHeader>
            <TodoForm
              users={users}
              onSuccess={() => {
                setIsCreateOpen(false)
                loadTodos()
              }}
            />
          </DialogContent>
        </Dialog>

        {editingTodo && (
          <Dialog open={!!editingTodo} onOpenChange={(open) => !open && setEditingTodo(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Todo bearbeiten</DialogTitle>
                <DialogDescription>
                  Aktualisieren Sie Ihr Todo
                </DialogDescription>
              </DialogHeader>
              <TodoForm
                users={users}
                initialData={editingTodo}
                onSuccess={() => {
                  setEditingTodo(null)
                  loadTodos()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamt</p>
                <p className="text-2xl font-bold">{todos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Offen</p>
                <p className="text-2xl font-bold">{openTodos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erledigt</p>
                <p className="text-2xl font-bold">{completedTodos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Monat</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Monat waehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Monate</SelectItem>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="completed">Erledigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Todos</h3>
              <p className="text-muted-foreground">
                Erstellen Sie Ihr erstes Todo
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Zugewiesen an</TableHead>
                  <TableHead>Erstellt von</TableHead>
                  <TableHead>Faelligkeit</TableHead>
                  <TableHead>Prioritaet</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todos.map((todo) => {
                  const dueDate = todo.dueDate ? new Date(todo.dueDate) : null
                  const overdueCheck = dueDate && dueDate < new Date() && !todo.isCompleted
                  
                  return (
                    <TableRow 
                      key={todo.id}
                      className={cn(
                        todo.isCompleted && 'opacity-60'
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={todo.isCompleted}
                          onCheckedChange={() => handleToggleComplete(todo)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          'font-medium',
                          todo.isCompleted && 'line-through text-muted-foreground'
                        )}>
                          {todo.title}
                        </div>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {todo.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{todo.user.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {todo.createdBy.name}
                      </TableCell>
                      <TableCell>
                        {dueDate ? (
                          <div className={cn(
                            'flex items-center gap-1 text-sm',
                            overdueCheck && 'text-red-600 dark:text-red-400 font-medium'
                          )}>
                            <Calendar className="h-3.5 w-3.5" />
                            {dueDate.toLocaleDateString('de-DE')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[todo.priority]}>
                          {priorityLabels[todo.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(todo.id)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(todo.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Loeschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
