'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, MoreHorizontal, Home, Wrench, Car, Box, MapPin, Euro, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth-context'

type RentalCategory = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string
  sortOrder: number
  isActive: boolean
  _count: {
    items: number
  }
}

type RentalItem = {
  id: string
  name: string
  description: string | null
  location: string | null
  image: string | null
  pricePerHour: number | null
  pricePerDay: number | null
  pricePerWeek: number | null
  pricePerMonth: number | null
  currency: string
  features: string[]
  notes: string | null
  cleaningDays: number | null
  isActive: boolean
  isAvailable?: boolean
  category: {
    id: string
    name: string
    color: string
    icon: string | null
  }
  _count: {
    bookings: number
  }
}

const iconOptions = [
  { value: 'home', label: 'Zimmer/Wohnungen', icon: Home },
  { value: 'wrench', label: 'Geraete', icon: Wrench },
  { value: 'car', label: 'Fahrzeuge', icon: Car },
  { value: 'box', label: 'Sonstige', icon: Box },
]

const colorOptions = [
  { value: '#3b82f6', label: 'Blau' },
  { value: '#22c55e', label: 'Gruen' },
  { value: '#ef4444', label: 'Rot' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#8b5cf6', label: 'Violett' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#6b7280', label: 'Grau' },
]

function getIconComponent(iconName: string | null) {
  switch (iconName) {
    case 'home':
      return Home
    case 'wrench':
      return Wrench
    case 'car':
      return Car
    case 'box':
    default:
      return Box
  }
}

export default function RentalSettingsPage() {
  const { user, companyRole } = useAuth()
  const [categories, setCategories] = useState<RentalCategory[]>([])
  const [items, setItems] = useState<RentalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCategory, setEditingCategory] = useState<RentalCategory | null>(null)
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'box',
    color: '#3b82f6',
  })

  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    location: '',
    pricePerHour: '',
    pricePerDay: '',
    pricePerWeek: '',
    pricePerMonth: '',
    features: '',
    notes: '',
    cleaningDays: '',
  })

  // Check permissions
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN'
  const canManage = isAdmin || companyRole === 'OWNER' || companyRole === 'ADMIN' || companyRole === 'MANAGER'

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch('/api/rental/categories'),
        fetch('/api/rental/items?limit=100'),
      ])

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }
      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error loading rental data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Category handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name) {
      alert('Kategoriename ist erforderlich')
      return
    }

    setIsSubmitting(true)
    try {
      const method = editingCategory ? 'PUT' : 'POST'
      const url = editingCategory
        ? `/api/rental/categories/${editingCategory.id}`
        : '/api/rental/categories'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })

      if (res.ok) {
        setIsCategoryDialogOpen(false)
        setEditingCategory(null)
        setCategoryForm({ name: '', description: '', icon: 'box', color: '#3b82f6' })
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Fehler beim Speichern')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Kategorie wirklich loeschen? Dies ist nur moeglich, wenn keine Mietobjekte zugeordnet sind.')) {
      return
    }

    try {
      const res = await fetch(`/api/rental/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  // Item handlers
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.name || !itemForm.categoryId) {
      alert('Name und Kategorie sind erforderlich')
      return
    }

    setIsSubmitting(true)
    try {
      const method = editingItem ? 'PUT' : 'POST'
      const url = editingItem ? `/api/rental/items/${editingItem.id}` : '/api/rental/items'

      const payload = {
        categoryId: itemForm.categoryId,
        name: itemForm.name,
        description: itemForm.description || null,
        location: itemForm.location || null,
        pricePerHour: itemForm.pricePerHour ? parseFloat(itemForm.pricePerHour) : null,
        pricePerDay: itemForm.pricePerDay ? parseFloat(itemForm.pricePerDay) : null,
        pricePerWeek: itemForm.pricePerWeek ? parseFloat(itemForm.pricePerWeek) : null,
        pricePerMonth: itemForm.pricePerMonth ? parseFloat(itemForm.pricePerMonth) : null,
        features: itemForm.features ? itemForm.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
        notes: itemForm.notes || null,
        cleaningDays: itemForm.cleaningDays ? parseInt(itemForm.cleaningDays) : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsItemDialogOpen(false)
        setEditingItem(null)
        setItemForm({
          categoryId: '',
          name: '',
          description: '',
          location: '',
          pricePerHour: '',
          pricePerDay: '',
          pricePerWeek: '',
          pricePerMonth: '',
          features: '',
          notes: '',
          cleaningDays: '',
        })
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Fehler beim Speichern')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Mietobjekt wirklich loeschen? Dies ist nur moeglich, wenn keine aktiven Buchungen existieren.')) {
      return
    }

    try {
      const res = await fetch(`/api/rental/items/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const filteredItems = selectedCategoryFilter === 'all'
    ? items
    : items.filter((item) => item.category.id === selectedCategoryFilter)

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vermietung-Einstellungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Kategorien und Mietobjekte</p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base">Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sie benoetigen Admin- oder Manager-Rechte, um Vermietung-Einstellungen zu verwalten.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vermietung-Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Kategorien und Mietobjekte fuer die Vermietung
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList>
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="items">Mietobjekte</TabsTrigger>
          </TabsList>

          {/* KATEGORIEN TAB */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Kategorien</CardTitle>
                  <CardDescription>
                    Kategorien fuer Mietobjekte (z.B. Zimmer, Geraete, Fahrzeuge)
                  </CardDescription>
                </div>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingCategory(null)
                        setCategoryForm({ name: '', description: '', icon: 'box', color: '#3b82f6' })
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Kategorie hinzufuegen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleSaveCategory}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
                        </DialogTitle>
                        <DialogDescription>
                          Erstellen Sie eine neue Kategorie fuer Ihre Mietobjekte
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="cat-name">Name *</Label>
                          <Input
                            id="cat-name"
                            value={categoryForm.name}
                            onChange={(e) =>
                              setCategoryForm({ ...categoryForm, name: e.target.value })
                            }
                            placeholder="z.B. Zimmer, Geraete, Fahrzeuge"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="cat-desc">Beschreibung</Label>
                          <Textarea
                            id="cat-desc"
                            value={categoryForm.description}
                            onChange={(e) =>
                              setCategoryForm({ ...categoryForm, description: e.target.value })
                            }
                            placeholder="Optionale Beschreibung"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="cat-icon">Icon</Label>
                          <Select
                            value={categoryForm.icon}
                            onValueChange={(val) =>
                              setCategoryForm({ ...categoryForm, icon: val })
                            }
                          >
                            <SelectTrigger id="cat-icon">
                              <SelectValue placeholder="Icon waehlen" />
                            </SelectTrigger>
                            <SelectContent>
                              {iconOptions.map((opt) => {
                                const Icon = opt.icon
                                return (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span>{opt.label}</span>
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="cat-color">Farbe</Label>
                          <div className="flex flex-wrap gap-2">
                            {colorOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`h-8 w-8 rounded-full border-2 ${
                                  categoryForm.color === opt.value
                                    ? 'border-foreground'
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: opt.value }}
                                onClick={() =>
                                  setCategoryForm({ ...categoryForm, color: opt.value })
                                }
                                title={opt.label}
                              />
                            ))}
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
                {categories.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">
                    Noch keine Kategorien vorhanden. Erstellen Sie Ihre erste Kategorie.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mietobjekte</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => {
                        const Icon = getIconComponent(cat.icon)
                        return (
                          <TableRow key={cat.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: `${cat.color}20` }}
                                >
                                  <Icon className="h-5 w-5" style={{ color: cat.color }} />
                                </div>
                                <div>
                                  <div className="font-medium">{cat.name}</div>
                                  {cat.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {cat.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{cat._count.items} Objekte</TableCell>
                            <TableCell>
                              <Badge variant={cat.isActive ? 'default' : 'secondary'}>
                                {cat.isActive ? 'Aktiv' : 'Inaktiv'}
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
                                      setEditingCategory(cat)
                                      setCategoryForm({
                                        name: cat.name,
                                        description: cat.description || '',
                                        icon: cat.icon || 'box',
                                        color: cat.color,
                                      })
                                      setIsCategoryDialogOpen(true)
                                    }}
                                  >
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Bearbeiten
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteCategory(cat.id)}
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
          </TabsContent>

          {/* MIETOBJEKTE TAB */}
          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Mietobjekte</CardTitle>
                  <CardDescription>Alle verfuegbaren Mietobjekte verwalten</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {categories.length > 0 && (
                    <Select
                      value={selectedCategoryFilter}
                      onValueChange={setSelectedCategoryFilter}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Alle Kategorien" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Kategorien</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setEditingItem(null)
                          setItemForm({
                            categoryId: categories[0]?.id || '',
                            name: '',
                            description: '',
                            location: '',
                            pricePerHour: '',
                            pricePerDay: '',
                            pricePerWeek: '',
                            pricePerMonth: '',
                            features: '',
                            notes: '',
                            cleaningDays: '',
                          })
                        }}
                        disabled={categories.length === 0}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Mietobjekt hinzufuegen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <form onSubmit={handleSaveItem}>
                        <DialogHeader>
                          <DialogTitle>
                            {editingItem ? 'Mietobjekt bearbeiten' : 'Neues Mietobjekt'}
                          </DialogTitle>
                          <DialogDescription>
                            Erstellen Sie ein neues Mietobjekt
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4 pr-2">
                          <div className="grid gap-2">
                            <Label htmlFor="item-category">Kategorie *</Label>
                            <Select
                              value={itemForm.categoryId}
                              onValueChange={(val) =>
                                setItemForm({ ...itemForm, categoryId: val })
                              }
                            >
                              <SelectTrigger id="item-category">
                                <SelectValue placeholder="Kategorie waehlen" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="item-name">Name *</Label>
                            <Input
                              id="item-name"
                              value={itemForm.name}
                              onChange={(e) =>
                                setItemForm({ ...itemForm, name: e.target.value })
                              }
                              placeholder="z.B. Zimmer 101, Bohrmaschine Bosch"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="item-desc">Beschreibung</Label>
                            <Textarea
                              id="item-desc"
                              value={itemForm.description}
                              onChange={(e) =>
                                setItemForm({ ...itemForm, description: e.target.value })
                              }
                              placeholder="Detaillierte Beschreibung"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="item-location">Standort</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="item-location"
                                value={itemForm.location}
                                onChange={(e) =>
                                  setItemForm({ ...itemForm, location: e.target.value })
                                }
                                placeholder="z.B. Gebaeude A, Lager 2"
                                className="pl-9"
                              />
                            </div>
                          </div>

                          {/* Preise */}
                          <div className="space-y-2">
                            <Label>Preise (optional)</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-1">
                                <Label htmlFor="item-price-hour" className="text-xs text-muted-foreground">
                                  Pro Stunde
                                </Label>
                                <div className="relative">
                                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="item-price-hour"
                                    type="number"
                                    step="0.01"
                                    value={itemForm.pricePerHour}
                                    onChange={(e) =>
                                      setItemForm({ ...itemForm, pricePerHour: e.target.value })
                                    }
                                    placeholder="0.00"
                                    className="pl-9"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor="item-price-day" className="text-xs text-muted-foreground">
                                  Pro Tag
                                </Label>
                                <div className="relative">
                                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="item-price-day"
                                    type="number"
                                    step="0.01"
                                    value={itemForm.pricePerDay}
                                    onChange={(e) =>
                                      setItemForm({ ...itemForm, pricePerDay: e.target.value })
                                    }
                                    placeholder="0.00"
                                    className="pl-9"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor="item-price-week" className="text-xs text-muted-foreground">
                                  Pro Woche
                                </Label>
                                <div className="relative">
                                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="item-price-week"
                                    type="number"
                                    step="0.01"
                                    value={itemForm.pricePerWeek}
                                    onChange={(e) =>
                                      setItemForm({ ...itemForm, pricePerWeek: e.target.value })
                                    }
                                    placeholder="0.00"
                                    className="pl-9"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor="item-price-month" className="text-xs text-muted-foreground">
                                  Pro Monat
                                </Label>
                                <div className="relative">
                                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="item-price-month"
                                    type="number"
                                    step="0.01"
                                    value={itemForm.pricePerMonth}
                                    onChange={(e) =>
                                      setItemForm({ ...itemForm, pricePerMonth: e.target.value })
                                    }
                                    placeholder="0.00"
                                    className="pl-9"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="item-features">Merkmale</Label>
                            <Input
                              id="item-features"
                              value={itemForm.features}
                              onChange={(e) =>
                                setItemForm({ ...itemForm, features: e.target.value })
                              }
                              placeholder="WLAN, Klimaanlage, Parkplatz (kommagetrennt)"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="item-notes">Notizen</Label>
                            <Textarea
                              id="item-notes"
                              value={itemForm.notes}
                              onChange={(e) =>
                                setItemForm({ ...itemForm, notes: e.target.value })
                              }
                              placeholder="Interne Notizen"
                            />
                          </div>

                          {/* Reinigung */}
                          <div className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-amber-500" />
                              <Label className="font-medium">Reinigung (optional)</Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Reinigung wird alle X Tage waehrend der Mietdauer im Kalender eingetragen. Z.B. bei 2 Tagen: Reinigung am 2., 4., 6. Tag usw.
                            </p>
                            <div className="flex items-center gap-3">
                              <Input
                                id="item-cleaning-days"
                                type="number"
                                min="0"
                                step="1"
                                value={itemForm.cleaningDays}
                                onChange={(e) =>
                                  setItemForm({ ...itemForm, cleaningDays: e.target.value })
                                }
                                placeholder="z.B. 2"
                                className="w-28"
                              />
                              <span className="text-sm text-muted-foreground">
                                {itemForm.cleaningDays && parseInt(itemForm.cleaningDays) > 0
                                  ? `Alle ${itemForm.cleaningDays} Tag(e) Reinigung`
                                  : 'Keine Reinigung'}
                              </span>
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
                </div>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">
                    Erstellen Sie zuerst eine Kategorie, um Mietobjekte hinzuzufuegen.
                  </p>
                ) : filteredItems.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">
                    Noch keine Mietobjekte vorhanden.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mietobjekt</TableHead>
                        <TableHead>Kategorie</TableHead>
                        <TableHead>Standort</TableHead>
                        <TableHead>Preis/Tag</TableHead>
                        <TableHead>Verfuegbarkeit</TableHead>
                        <TableHead>Reinigung</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: item.category.color,
                                color: item.category.color,
                              }}
                            >
                              {item.category.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.location ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {item.location}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.pricePerDay ? (
                              <span className="font-medium">
                                {Number(item.pricePerDay).toFixed(2)} {item.currency}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Nicht festgelegt</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.isAvailable ? 'default' : 'destructive'}
                              className={
                                item.isAvailable
                                  ? 'bg-green-500 hover:bg-green-600'
                                  : 'bg-red-500 hover:bg-red-600'
                              }
                            >
                              {item.isAvailable ? 'Frei' : 'Vermietet'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.cleaningDays && item.cleaningDays > 0 ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                <span>{item.cleaningDays} Tag(e)</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
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
                                    setEditingItem(item)
                                    setItemForm({
                                      categoryId: item.category.id,
                                      name: item.name,
                                      description: item.description || '',
                                      location: item.location || '',
                                      pricePerHour: item.pricePerHour?.toString() || '',
                                      pricePerDay: item.pricePerDay?.toString() || '',
                                      pricePerWeek: item.pricePerWeek?.toString() || '',
                                      pricePerMonth: item.pricePerMonth?.toString() || '',
                                      features: item.features.join(', '),
                                      notes: item.notes || '',
                                      cleaningDays: item.cleaningDays?.toString() || '',
                                    })
                                    setIsItemDialogOpen(true)
                                  }}
                                >
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Bearbeiten
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Loeschen
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
