"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "@/components/theme-provider"
import { ProfileService } from "@/lib/profile-service"

export function useAuthTheme() {
  const { user } = useAuth()
  const { setTheme, theme } = useTheme()
  const [themeManuallyChanged, setThemeManuallyChanged] = useState(false)

  const loadUserTheme = async (userId: string) => {
    if (!setTheme) return

    try {
      const settings = await ProfileService.getSettings(userId)
      if (settings?.theme && !themeManuallyChanged) {
        setTheme(settings.theme as any)
      }
    } catch (error) {
      console.error("Error loading user theme:", error)
    }
  }

  useEffect(() => {
    if (user && theme) {
      setThemeManuallyChanged(true)
    }
  }, [theme, user])

  useEffect(() => {
    if (!setTheme) return

    if (user) {
      setThemeManuallyChanged(false)
      loadUserTheme(user.id)
    } else {
      setTheme("light")
      setThemeManuallyChanged(false)
    }
  }, [user, setTheme])

  return { themeManuallyChanged, setThemeManuallyChanged }
}
