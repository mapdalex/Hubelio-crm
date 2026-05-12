'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileDown, Calendar, Building2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'

type Customer = {
  id: string
  customerNumber: string
  companyName: string | null
  firstName: string
  lastName: string
}

// Alle verfuegbaren Spalten fuer den Export
const AVAILABLE_COLUMNS = [
  { id: 'name', label: 'Geraetename', default: true },
  { id: 'type', label: 'Typ', default: true },
  { id: 'contact', label: 'Zugewiesen an', default: true },
  { id: 'manufacturer', label: 'Hersteller', default: false },
  { id: 'model', label: 'Modell', default: false },
  { id: 'serialNumber', label: 'Seriennummer', default: false },
  { id: 'operatingSystem', label: 'Betriebssystem', default: false },
  { id: 'processor', label: 'Prozessor', default: false },
  { id: 'ram', label: 'RAM', default: false },
  { id: 'storage', label: 'Speicher', default: false },
  { id: 'ipAddress', label: 'IP-Adresse', default: false },
  { id: 'macAddress', label: 'MAC-Adresse', default: false },
  { id: 'purchaseDate', label: 'Kaufdatum', default: false },
  { id: 'warrantyUntil', label: 'Garantie bis', default: false },
  { id: 'notes', label: 'Notizen', default: false },
] as const

type ColumnId = typeof AVAILABLE_COLUMNS[number]['id']

export function DeviceExportDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  
  // Spaltenauswahl
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnId>>(() => {
    const defaults = new Set<ColumnId>()
    AVAILABLE_COLUMNS.forEach(col => {
      if (col.default) defaults.add(col.id)
    })
    return defaults
  })

  // Generate last 12 months
  const getMonthOptions = () => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    const monthNames = [
      'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ]
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const value = `${year}-${month}`
      const label = `${monthNames[date.getMonth()]} ${year}`
      options.push({ value, label })
    }
    
    return options
  }

  const monthOptions = getMonthOptions()

  const loadCustomers = useCallback(async () => {
    setIsLoadingCustomers(true)
    try {
      const res = await fetch('/api/customers?limit=200')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      loadCustomers()
    }
  }, [isOpen, customers.length, loadCustomers])

  // Set default month to current month
  useEffect(() => {
    if (!selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value)
    }
  }, [selectedMonth, monthOptions])

  const toggleColumn = (columnId: ColumnId) => {
    setSelectedColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        // Mindestens eine Spalte muss ausgewaehlt sein
        if (next.size > 1) {
          next.delete(columnId)
        }
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const selectAllColumns = () => {
    setSelectedColumns(new Set(AVAILABLE_COLUMNS.map(col => col.id)))
  }

  const selectDefaultColumns = () => {
    const defaults = new Set<ColumnId>()
    AVAILABLE_COLUMNS.forEach(col => {
      if (col.default) defaults.add(col.id)
    })
    setSelectedColumns(defaults)
  }

  const handleExport = async () => {
    if (!selectedCustomerId || !selectedMonth || selectedColumns.size === 0) return

    setIsExporting(true)
    try {
      const columnsParam = Array.from(selectedColumns).join(',')
      const response = await fetch(
        `/api/it/export/device-assignments?customerId=${selectedCustomerId}&month=${selectedMonth}&columns=${columnsParam}`
      )
      
      if (!response.ok) {
        throw new Error('Export fehlgeschlagen')
      }

      // Get the blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'Geraetezuweisungen.pdf'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setIsOpen(false)
    } catch (error) {
      console.error('Export error:', error)
      alert('Fehler beim PDF-Export. Bitte versuchen Sie es erneut.')
    } finally {
      setIsExporting(false)
    }
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          PDF Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Geraetezuweisungen exportieren
          </DialogTitle>
          <DialogDescription>
            Exportieren Sie eine Uebersicht aller Geraetezuweisungen fuer einen Kunden als PDF.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customer" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Kunde auswaehlen
            </Label>
            {isLoadingCustomers ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="h-5 w-5" />
                <span className="ml-2 text-sm text-muted-foreground">Lade Kunden...</span>
              </div>
            ) : (
              <Select 
                value={selectedCustomerId} 
                onValueChange={setSelectedCustomerId}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Kunde waehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                      <span className="ml-2 text-muted-foreground">
                        ({customer.customerNumber})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="month" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monat auswaehlen
            </Label>
            <Select 
              value={selectedMonth} 
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger id="month">
                <SelectValue placeholder="Monat waehlen..." />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Aenderungen werden fuer den ausgewaehlten Monat angezeigt
            </p>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Spalten auswaehlen
              </Label>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAllColumns}
                  className="h-7 text-xs"
                >
                  Alle
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectDefaultColumns}
                  className="h-7 text-xs"
                >
                  Standard
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 bg-muted/30">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`col-${column.id}`}
                    checked={selectedColumns.has(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  />
                  <label 
                    htmlFor={`col-${column.id}`}
                    className="text-sm cursor-pointer select-none"
                  >
                    {column.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedColumns.size} von {AVAILABLE_COLUMNS.length} Spalten ausgewaehlt
            </p>
          </div>

          {selectedCustomer && selectedMonth && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="font-medium">Vorschau:</p>
              <p className="text-muted-foreground">
                PDF fuer {selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                {' '}({monthOptions.find(m => m.value === selectedMonth)?.label})
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Spalten: {Array.from(selectedColumns).map(id => 
                  AVAILABLE_COLUMNS.find(c => c.id === id)?.label
                ).join(', ')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleExport}
            disabled={!selectedCustomerId || !selectedMonth || selectedColumns.size === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Exportiere...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                PDF erstellen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
