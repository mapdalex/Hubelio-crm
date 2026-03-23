'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, Building2, Ticket, Globe } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'

type SearchResult = {
  id: string
  type: 'customer' | 'contact' | 'ticket' | 'domain'
  title: string
  subtitle?: string
  url: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])
  
  // Search function
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([])
      return
    }
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [query, search])
  
  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.url)
  }
  
  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return <Building2 className="h-4 w-4" />
      case 'contact':
        return <User className="h-4 w-4" />
      case 'ticket':
        return <Ticket className="h-4 w-4" />
      case 'domain':
        return <Globe className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }
  
  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:w-64 md:w-80"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Suchen...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Kunde, Ticket, Domain suchen..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Suche...
            </div>
          ) : query.length < 2 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Mindestens 2 Zeichen eingeben...
            </div>
          ) : results.length === 0 ? (
            <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
          ) : (
            <>
              {['customer', 'contact', 'ticket', 'domain'].map((type) => {
                const typeResults = results.filter(r => r.type === type)
                if (typeResults.length === 0) return null
                
                const labels: Record<string, string> = {
                  customer: 'Kunden',
                  contact: 'Kontakte',
                  ticket: 'Tickets',
                  domain: 'Domains',
                }
                
                return (
                  <CommandGroup key={type} heading={labels[type]}>
                    {typeResults.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result)}
                      >
                        {getIcon(result.type as SearchResult['type'])}
                        <div className="ml-2 flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
