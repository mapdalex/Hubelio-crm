'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, MapPin, Euro, Home, Wrench, Car, Box, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type RentalCategory = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string
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
  isActive: boolean
  isAvailable: boolean
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

export default function RentalItemsPage() {
  const [categories, setCategories] = useState<RentalCategory[]>([])
  const [items, setItems] = useState<RentalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch('/api/rental/categories?isActive=true'),
        fetch('/api/rental/items?limit=200'),
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
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || item.category.id === selectedCategory

    const matchesAvailability =
      availabilityFilter === 'all' ||
      (availabilityFilter === 'available' && item.isAvailable) ||
      (availabilityFilter === 'rented' && !item.isAvailable)

    return matchesSearch && matchesCategory && matchesAvailability
  })

  // Stats
  const totalItems = items.length
  const availableItems = items.filter((i) => i.isAvailable).length
  const rentedItems = items.filter((i) => !i.isAvailable).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mietobjekte</h1>
          <p className="text-muted-foreground">
            {totalItems} Objekte ({availableItems} verfuegbar, {rentedItems} vermietet)
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/rental">
            <Settings className="mr-2 h-4 w-4" />
            Objekte verwalten
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Name, Beschreibung oder Standort..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-2 w-2 rounded-full" 
                    style={{ backgroundColor: cat.color }} 
                  />
                  {cat.name} ({cat._count.items})
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Verfuegbarkeit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="available">Verfuegbar</SelectItem>
            <SelectItem value="rented">Vermietet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Box className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Keine Mietobjekte gefunden</p>
            <Button className="mt-4" variant="outline" asChild>
              <Link href="/settings/rental">
                <Plus className="mr-2 h-4 w-4" />
                Objekte in Einstellungen erstellen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const Icon = getIconComponent(item.category.icon)
            return (
              <Card
                key={item.id}
                className={cn(
                  'relative overflow-hidden transition-shadow hover:shadow-md',
                  !item.isAvailable && 'opacity-75'
                )}
              >
                {/* Availability indicator */}
                <div
                  className={cn(
                    'absolute right-3 top-3 h-3 w-3 rounded-full',
                    item.isAvailable ? 'bg-green-500' : 'bg-red-500'
                  )}
                  title={item.isAvailable ? 'Verfuegbar' : 'Vermietet'}
                />

                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${item.category.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: item.category.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{item.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className="mt-1"
                        style={{ borderColor: item.category.color, color: item.category.color }}
                      >
                        {item.category.name}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 pb-3">
                  {item.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}
                  {item.pricePerDay && (
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Euro className="h-3 w-3" />
                      <span>{item.pricePerDay} / Tag</span>
                    </div>
                  )}
                  {item.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.features.slice(0, 3).map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {item.features.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t pt-3">
                  <div className="flex w-full items-center justify-between text-sm">
                    <Badge variant={item.isAvailable ? 'default' : 'destructive'}>
                      {item.isAvailable ? 'Verfuegbar' : 'Vermietet'}
                    </Badge>
                    <span className="text-muted-foreground">
                      {item._count.bookings} Buchungen
                    </span>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
