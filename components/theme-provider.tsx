"use client"

import * as React from "react"

type Theme = "light" | "dark" | "pink" | "blue" | "green" | "blackwhite"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  themes: Theme[]
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: Theme
  themes?: Theme[]
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  themes = ["light", "dark", "pink", "blue", "green", "blackwhite"],
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme
    if (savedTheme && themes.includes(savedTheme)) {
      setThemeState(savedTheme)
    } else if (enableSystem) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      setThemeState(systemTheme as Theme)
    }
    setMounted(true)
  }, [enableSystem, themes])

  React.useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    // Remove all theme classes
    themes.forEach((t) => root.classList.remove(t))

    // Add current theme class
    root.classList.add(theme)

    // Save to localStorage
    localStorage.setItem("theme", theme)
  }, [theme, themes, mounted])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      themes,
    }),
    [theme, setTheme, themes],
  )

  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    return {
      theme: "light" as Theme,
      setTheme: () => {},
      themes: ["light", "dark", "pink", "blue", "green", "blackwhite"] as Theme[],
    }
  }
  return context
}
