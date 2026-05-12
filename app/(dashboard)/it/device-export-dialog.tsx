'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileDown, Calendar, Building2 } from 'lucide-react'
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
import { Spinner } from '@/components/ui/spinner'

type Customer = {
  id: string
  customerNumber: string
  companyName: string | null
  firstName: string
  lastName: string
}

export function DeviceExportDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)

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

  const handleExport = async () => {
    if (!selectedCustomerId || !selectedMonth) return

    setIsExporting(true)
    try {
      const response = await fetch(
        `/api/it/export/device-assignments?customerId=${selectedCustomerId}&month=${selectedMonth}`
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Geraetezuweisungen exportieren
          </DialogTitle>
          <DialogDescription>
            Exportieren Sie eine Uebersicht aller Geraetezuweisungen fuer einen Kunden als PDF.
            Das Dokument enthaelt Kundeninformationen, alle Kontakte, Geraetezuweisungen und 
            Aenderungen im ausgewaehlten Monat.
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

          {selectedCustomer && selectedMonth && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <p className="font-medium">Vorschau:</p>
              <p className="text-muted-foreground">
                PDF fuer {selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                {' '}({monthOptions.find(m => m.value === selectedMonth)?.label})
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
            disabled={!selectedCustomerId || !selectedMonth || isExporting}
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
