"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { FloatingActionButton } from "@/components/floating-action-button"
import { accounts as initialAccounts } from "@/lib/data"
import type { Account, Category } from "@/types"
import { supabase } from "@/lib/supabase"
import { useIsMobile } from "@/hooks/use-mobile"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
    }
  }, [isMobile])

  const fetchData = async () => {
    try {
      const { data: platformData, error: platformError } = await supabase.from("platforms").select("*")
      if (platformError) throw platformError

      const { data: categoryData, error: categoryError } = await supabase.from("categories").select("*")
      if (categoryError) throw categoryError

      const categoryMap = new Map<string, { type: string; subcategories: string[] }>()
      ;(categoryData || []).forEach((item) => {
        if (!categoryMap.has(item.category)) {
          categoryMap.set(item.category, {
            type: item.category === "Pemasukan" ? "income" : "expense",
            subcategories: [],
          })
        }
        if (item["sub-category"]) {
          categoryMap.get(item.category)!.subcategories.push(item["sub-category"])
        }
      })

      categoryMap.set("Mutasi", { type: "transfer", subcategories: ["Alokasi saldo ke", "Tarik Tunai dari"] })

      const structuredCategories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        id: name,
        name,
        ...data,
      }))

      setAccounts(
        (platformData || []).map((p) => ({
          id: p.id,
          name: p.account,
          type: p.type_account,
          balance: p.saldo,
          isSavings: p.saving,
          color: `bg-${p.color}-500`,
        })),
      )
      setCategories(structuredCategories)
    } catch (err) {
      console.error("Error fetching layout data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pathname !== "/login") {
      fetchData()
    }
  }, [pathname])

  if (pathname === "/login") {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        accounts={initialAccounts}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      <main
        className={`flex-1 transition-all duration-300 ${
          isMobile ? "ml-0" : isCollapsed ? "ml-16" : "ml-64 sm:ml-80"
        } min-h-screen`}
      >
        <div className="w-full min-h-screen">
          <div className={`${isMobile ? "pt-12" : "pt-0"}`}>{children}</div>
        </div>
        {!loading && (
          <FloatingActionButton
            accounts={accounts}
            categories={categories}
            onTransactionAdded={() => {
              // Trigger a custom event to refresh data on the current page
              window.dispatchEvent(new CustomEvent("transactionAdded"))
            }}
          />
        )}
      </main>
    </div>
  )
}
