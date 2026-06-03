"use client"

import { NavigationProvider } from "@/contexts/navigation-context"
import { UserProvider } from "@/contexts/user-provider"
import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <NavigationProvider>
        <UserProvider>{children}</UserProvider>
      </NavigationProvider>
    </ThemeProvider>
  )
}
