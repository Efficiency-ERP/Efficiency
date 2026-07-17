"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useNavigation } from "@/contexts/navigation-context"
import { TeamSwitcher } from "@/components/team-switcher"
import { ContactsProvider } from "@/contexts/contacts-store"
import { ArticlesProvider } from "@/contexts/articles-store"
import { LogsProvider } from "@/contexts/logs-provider"
import { PMEProvider } from "@/contexts/pme-provider"
import { SidebarPrefsProvider } from "@/contexts/sidebar-prefs-provider"
import { useUser } from "@/contexts/user-context"
import Link from "next/link"
import { usePathname } from "next/navigation"

function PMEWrapper({ children }: { children: React.ReactNode }) {
  const { organizations } = useUser()
  return <PMEProvider organizations={organizations}>{children}</PMEProvider>
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { getBreadcrumbsForPath } = useNavigation()
  const breadcrumbs = getBreadcrumbsForPath(pathname)
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user.id) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }

  if (!user.id) {
    return null
  }

  return (
    <ContactsProvider>
      <PMEWrapper>
        <ArticlesProvider>
          <LogsProvider>
            <SidebarPrefsProvider>
              <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset>
                  <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                      <SidebarTrigger className="-ml-1" />
                      <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                      />
                      <div className="mr-2">
                        <TeamSwitcher />
                      </div>
                      <Breadcrumb>
                        <BreadcrumbList>
                          {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.href} className="flex items-center">
                              {index > 0 && (
                                <BreadcrumbSeparator className="hidden sm:block" />
                              )}
                              <BreadcrumbItem className={index === 0 ? "hidden sm:block" : ""}>
                                {crumb.isLast ? (
                                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                ) : (
                                  <BreadcrumbLink asChild>
                                    <Link href={crumb.href}>{crumb.label}</Link>
                                  </BreadcrumbLink>
                                )}
                              </BreadcrumbItem>
                            </div>
                          ))}
                        </BreadcrumbList>
                      </Breadcrumb>
                    </div>
                    <div className="ml-auto px-4">
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="p-6">{children}</main>
                </SidebarInset>
              </SidebarProvider>
            </SidebarPrefsProvider>
          </LogsProvider>
        </ArticlesProvider>
      </PMEWrapper>
    </ContactsProvider>
  )
}
