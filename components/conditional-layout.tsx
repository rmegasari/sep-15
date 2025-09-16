"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { LayoutWrapper } from "@/components/layout-wrapper"

export function ConditionalLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>
  }

  return <LayoutWrapper>{children}</LayoutWrapper>
}
