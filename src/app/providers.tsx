"use client"

import { NavigationProvider } from "@/contexts/navigation-context"
import { UserProvider } from "@/contexts/user-provider"
import { FeedbackWidget } from "@/components/feedback-widget"
import { ThemeProvider } from "next-themes"

const isTestingMode = process.env.NEXT_PUBLIC_TESTING_MODE === "true"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <NavigationProvider>
        <UserProvider>
          {children}
          {isTestingMode && <FeedbackWidget />}
        </UserProvider>
      </NavigationProvider>
    </ThemeProvider>
  )
}
