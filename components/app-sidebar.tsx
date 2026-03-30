'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Ticket,
  CheckSquare,
  FolderOpen,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  User,
  MessageSquare,
  TrendingUp,
  Share2,
  Mail,
  BarChart3,
  Lock,
  Monitor,
  Globe,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth-context'
import { CompanySelector } from './company-selector'
import type { ModuleId } from '@prisma/client'

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  module?: ModuleId
  items?: NavItem[]
}

// Module-aware navigation items
const getModuleNavItems = (accessibleModules: ModuleId[]): NavItem[] => {
  const allItems: NavItem[] = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
      module: 'CORE',
    },
    {
      title: 'Kunden',
      url: '/customers',
      icon: Users,
      module: 'CORE',
      items: [
        { title: 'Alle Kunden', url: '/customers', icon: Users, module: 'CORE' },
        { title: 'Kontakte', url: '/customers/contacts', icon: User, module: 'CORE' },
        { title: 'PCs & Geraete', url: '/customers/computers', icon: Building2, module: 'CORE' },
      ],
    },
    {
      title: 'Verkauf',
      url: '/sales',
      icon: ShoppingCart,
      module: 'SALES',
      items: [
        { title: 'Services', url: '/sales/services', icon: ShoppingCart, module: 'SALES' },
      ],
    },
    {
      title: 'IT',
      url: '/it',
      icon: Monitor,
      module: 'IT',
      items: [
        { title: 'Uebersicht', url: '/it', icon: Monitor, module: 'IT' },
        { title: 'PCs & Geraete', url: '/it/computers', icon: Monitor, module: 'IT' },
        { title: 'Domains', url: '/it/domains', icon: Globe, module: 'IT' },
      ],
    },
    {
      title: 'Tickets',
      url: '/tickets',
      icon: Ticket,
      module: 'CORE',
    },
    {
      title: 'Nachrichten',
      url: '/messages',
      icon: MessageSquare,
      module: 'MESSAGE',
      items: [
        { title: 'Alle', url: '/messages', icon: MessageSquare, module: 'MESSAGE' },
        { title: 'Posteingang', url: '/messages/inbox', icon: Mail, module: 'MESSAGE' },
        { title: 'Entwuerfe', url: '/messages/drafts', icon: Mail, module: 'MESSAGE' },
      ],
    },
    {
      title: 'Soziale Medien',
      url: '/socials',
      icon: Share2,
      module: 'SOCIALS',
      items: [
        { title: 'Accounts', url: '/socials/accounts', icon: Share2, module: 'SOCIALS' },
        { title: 'Posts', url: '/socials/posts', icon: Share2, module: 'SOCIALS' },
        { title: 'Analytics', url: '/socials/analytics', icon: BarChart3, module: 'SOCIALS' },
      ],
    },
    {
      title: 'Kampagnen',
      url: '/campaigns',
      icon: TrendingUp,
      module: 'CAMPAIGNS',
      items: [
        { title: 'Alle', url: '/campaigns', icon: TrendingUp, module: 'CAMPAIGNS' },
        { title: 'Erstellen', url: '/campaigns/create', icon: TrendingUp, module: 'CAMPAIGNS' },
        { title: 'Berichte', url: '/campaigns/reports', icon: BarChart3, module: 'CAMPAIGNS' },
      ],
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: BarChart3,
      module: 'ANALYTICS',
      items: [
        { title: 'Dashboard', url: '/analytics', icon: BarChart3, module: 'ANALYTICS' },
        { title: 'Reports', url: '/analytics/reports', icon: BarChart3, module: 'ANALYTICS' },
        { title: 'Daten Export', url: '/analytics/export', icon: BarChart3, module: 'ANALYTICS' },
      ],
    },
    {
      title: 'Todos',
      url: '/todos',
      icon: CheckSquare,
      module: 'CORE',
    },
    {
      title: 'Datenablage',
      url: '/files',
      icon: FolderOpen,
      module: 'CORE',
    },
  ]

  // Filter items based on accessible modules
  return allItems
    .filter(item => !item.module || accessibleModules.includes(item.module) || item.module === 'CORE')
    .map(item => ({
      ...item,
      items: item.items?.filter(
        subItem => !subItem.module || accessibleModules.includes(subItem.module) || subItem.module === 'CORE'
      ),
    }))
}

const adminNavItems: NavItem[] = [
  {
    title: 'Einstellungen',
    url: '/settings',
    icon: Settings,
    items: [
      { title: 'Allgemein', url: '/settings', icon: Settings },
      { title: 'Unternehmen', url: '/settings/company', icon: Building2 },
      { title: 'Module', url: '/settings/modules', icon: Lock },
      { title: 'Benutzer', url: '/settings/users', icon: Users },
      { title: 'E-Mail', url: '/settings/email', icon: Mail },
      { title: 'System', url: '/settings/system', icon: Settings },
    ],
  },
]

// Superadmin-only navigation
const superadminNavItems: NavItem[] = [
  {
    title: 'Superadmin',
    url: '/admin/superadmin',
    icon: Shield,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout, companyId, accessibleModules = [] } = useAuth()
  
  const isActive = (url: string) => {
    if (url === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(url)
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN'
  const isSuperAdmin = user?.role === 'SUPERADMIN'
  const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'].includes(user?.role || '')
  
  // Get module-aware navigation
  const visibleNavItems = getModuleNavItems(accessibleModules as ModuleId[])
  
  // Filter based on role for customers
  const filteredNavItems = visibleNavItems.filter(item => {
    if (user?.role === 'KUNDE') {
      // Customers see only Dashboard, Tickets and Files
      return ['Dashboard', 'Tickets', 'Datenablage'].includes(item.title)
    }
    return true
  })
  
  return (
    <Sidebar>
      <SidebarHeader className="border-b space-y-3 p-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold">Hublio CRM</span>
        </Link>
        
        {/* Company Selector */}
        {companyId && <CompanySelector />}
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                item.items ? (
                  <Collapsible
                    key={item.title}
                    defaultOpen={isActive(item.url)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isActive(item.url)}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <Link href={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Superadmin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superadminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  item.items ? (
                    <Collapsible
                      key={item.title}
                      defaultOpen={isActive(item.url)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={isActive(item.url)}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.url}
                                >
                                  <Link href={subItem.url}>{subItem.title}</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-sm font-medium">{user?.name || 'Benutzer'}</span>
                    <span className="text-xs text-muted-foreground">{user?.role || ''}</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
