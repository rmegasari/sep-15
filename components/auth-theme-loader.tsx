"use client"

import { useAuthTheme } from "@/hooks/use-auth-theme"

export function AuthThemeLoader() {
  useAuthTheme()
  return null
}
