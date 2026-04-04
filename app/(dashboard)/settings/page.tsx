'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Users,
  Mail,
  Lock,
  Smartphone,
  Bell,
  User,
  Shield,
  Settings,
  ChevronRight,
  Share2,
} from 'lucide-react'

const settingsSections = [
  {
    title: 'Profil',
    description: 'Verwalten Sie Ihr Benutzerprofil und Passwort',
    icon: User,
    href: '/settings/profile',
    role: ['ADMIN', 'MITARBEITER', 'KUNDE'],
  },
  {
    title: 'Unternehmen',
    description: 'Unternehmenseinstellungen und Informationen',
    icon: Building2,
    href: '/settings/company',
    role: ['ADMIN'],
  },
  {
    title: 'Benutzer',
    description: 'Benutzerverwaltung und Rollen',
    icon: Users,
    href: '/settings/users',
    role: ['ADMIN'],
  },
  {
    title: 'E-Mail',
    description: 'E-Mail-Konfiguration und Integration',
    icon: Mail,
    href: '/settings/email',
    role: ['ADMIN'],
  },
  {
    title: 'Social Media',
    description: 'Social Media Accounts verbinden und verwalten',
    icon: Share2,
    href: '/settings/social',
    role: ['ADMIN'],
  },
  {
    title: 'Benachrichtigungen',
    description: 'Benachrichtigungseinstellungen',
    icon: Bell,
    href: '/settings/notifications',
    role: ['ADMIN', 'MITARBEITER', 'KUNDE'],
  },
]

export default function SettingsPage() {
  const { user, companyRole } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || companyRole === 'ADMIN'

  const visibleSections = settingsSections.filter(
    section => section.role.includes(user?.role || 'GAST')
  )

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Konto- und Systemeinstellungen</p>
      </div>

      <div className="grid gap-4">
        {visibleSections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group"
            >
              <Card className="transition-colors hover:bg-muted">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      {!isAdmin && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Admin-Funktionen</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sie benötigen Admin-Rechte, um Unternehmen-, Modul- und Benutzereinstellungen zu verwalten.
          </CardContent>
        </Card>
      )}
    </main>
  )
}
