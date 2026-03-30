'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Building2, ChevronDown, Plus, Check, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'

export function CompanySelector() {
  const { currentCompany, companies, switchCompany, canManageCompany } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyEmail, setNewCompanyEmail] = useState('')

  const handleSwitch = async (companyId: string) => {
    if (companyId === currentCompany?.id) return
    const result = await switchCompany(companyId)
    if (result.success) {
      setIsOpen(false)
    }
  }

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompanyName,
          email: newCompanyEmail,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        await switchCompany(data.company.id)
        setIsCreateDialogOpen(false)
        setNewCompanyName('')
        setNewCompanyEmail('')
      }
    } catch (error) {
      console.error('Error creating company:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!currentCompany) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Firma erstellen
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {currentCompany.logo ? (
                  <AvatarImage src={currentCompany.logo} alt={currentCompany.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(currentCompany.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{currentCompany.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {companies.map((membership) => (
            <DropdownMenuItem
              key={membership.company.id}
              onClick={() => handleSwitch(membership.company.id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {membership.company.logo ? (
                    <AvatarImage
                      src={membership.company.logo}
                      alt={membership.company.name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {getInitials(membership.company.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm">{membership.company.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {membership.role.toLowerCase()}
                  </span>
                </div>
              </div>
              {membership.company.id === currentCompany.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {canManageCompany() && (
            <DropdownMenuItem asChild>
              <Link href="/settings/company" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Firmeneinstellungen
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Firma erstellen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Firma erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Firma, um Ihre Daten zu verwalten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Firmenname</Label>
              <Input
                id="company-name"
                placeholder="Meine Firma GmbH"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">E-Mail (optional)</Label>
              <Input
                id="company-email"
                type="email"
                placeholder="kontakt@firma.de"
                value={newCompanyEmail}
                onChange={(e) => setNewCompanyEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateCompany}
              disabled={isCreating || !newCompanyName.trim()}
            >
              {isCreating ? 'Erstellt...' : 'Firma erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
