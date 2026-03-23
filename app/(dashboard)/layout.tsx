import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AuthProvider } from '@/lib/auth-context'
import { Separator } from '@/components/ui/separator'
import { GlobalSearch } from '@/components/global-search'
import { ThemeProvider } from '@/components/theme-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <GlobalSearch />
            </header>
            <main className="flex-1 p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
