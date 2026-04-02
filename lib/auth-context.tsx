'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Role, CompanyRole, ModuleId } from '@prisma/client'

type User = {
  id: string
  email: string
  name: string
  role: Role
}

type Company = {
  id: string
  name: string
  slug: string
  logo?: string | null
}

type CompanyMembership = {
  company: Company
  role: CompanyRole
  isDefault: boolean
}

type ModulePermission = {
  moduleId: ModuleId
  canAccess: boolean
  canEdit: boolean
  canAdmin: boolean
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  // Company context
  currentCompany: Company | null
  companyRole: CompanyRole | null
  companies: CompanyMembership[]
  accessibleModules: ModuleId[]
  modulePermissions: ModulePermission[]
  // Convenience getter for companyId
  companyId: string | null
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>
  // Permission checks
  hasModuleAccess: (moduleId: ModuleId) => boolean
  canEditModule: (moduleId: ModuleId) => boolean
  canManageCompany: () => boolean
  isSuperAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [companyRole, setCompanyRole] = useState<CompanyRole | null>(null)
  const [companies, setCompanies] = useState<CompanyMembership[]>([])
  const [accessibleModules, setAccessibleModules] = useState<ModuleId[]>(['CORE'])
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([{ moduleId: 'CORE', canAccess: true, canEdit: false, canAdmin: false }])
  const router = useRouter()
  
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      
      setUser(data.user || null)
      setCurrentCompany(data.company || null)
      setCompanyRole(data.companyRole || null)
      setCompanies(data.companies || [])
      setAccessibleModules(data.accessibleModules || ['CORE'])
      setModulePermissions(data.modulePermissions || [{ moduleId: 'CORE', canAccess: true, canEdit: false, canAdmin: false }])
    } catch {
      setUser(null)
      setCurrentCompany(null)
      setCompanyRole(null)
      setCompanies([])
      setAccessibleModules(['CORE'])
      setModulePermissions([{ moduleId: 'CORE', canAccess: true, canEdit: false, canAdmin: false }])
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    refresh()
  }, [refresh])
  
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        return { success: false, error: data.error }
      }
      
      setUser(data.user)
      setCurrentCompany(data.company || null)
      setCompanyRole(data.companyRole || null)
      setCompanies(data.companies || [])
      setAccessibleModules(data.accessibleModules || ['CORE'])
      setModulePermissions(data.modulePermissions || [{ moduleId: 'CORE', canAccess: true, canEdit: false, canAdmin: false }])
      
      return { success: true }
    } catch {
      return { success: false, error: 'Verbindungsfehler' }
    }
  }
  
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors
    }
    setUser(null)
    setCurrentCompany(null)
    setCompanyRole(null)
    setCompanies([])
    setAccessibleModules(['CORE'])
    setModulePermissions([{ moduleId: 'CORE', canAccess: true, canEdit: false, canAdmin: false }])
    router.push('/login')
    router.refresh()
  }
  
  const switchCompany = async (companyId: string) => {
    try {
      const res = await fetch('/api/auth/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        return { success: false, error: data.error }
      }
      
      setCurrentCompany(data.company)
      setCompanyRole(data.companyRole)
      setAccessibleModules(data.accessibleModules || ['CORE'])
      setModulePermissions(data.modulePermissions || [{ moduleId: 'CORE', canAccess: true, canEdit: false, canAdmin: false }])
      
      // Refresh the page to reload data with new company context
      router.refresh()
      
      return { success: true }
    } catch {
      return { success: false, error: 'Fehler beim Wechseln der Firma' }
    }
  }
  
  const hasModuleAccess = (moduleId: ModuleId): boolean => {
    if (moduleId === 'CORE') return true
    return accessibleModules.includes(moduleId)
  }
  
  const canEditModule = (moduleId: ModuleId): boolean => {
    // OWNER, ADMIN, MANAGER can always edit
    if (companyRole === 'OWNER' || companyRole === 'ADMIN' || companyRole === 'MANAGER') {
      return true
    }
    // MEMBER can edit CORE by default
    if (moduleId === 'CORE' && companyRole === 'MEMBER') {
      return true
    }
    // Check explicit module permissions
    const perm = modulePermissions.find(p => p.moduleId === moduleId)
    return perm?.canEdit ?? false
  }
  
  const canManageCompany = (): boolean => {
    return companyRole === 'OWNER' || companyRole === 'ADMIN'
  }
  
  const isSuperAdmin = (): boolean => {
    return user?.role === 'SUPERADMIN'
  }
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        currentCompany,
        companyRole,
        companies,
        accessibleModules,
        modulePermissions,
        companyId: currentCompany?.id || null,
        login,
        logout,
        refresh,
        switchCompany,
        hasModuleAccess,
        canEditModule,
        canManageCompany,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
