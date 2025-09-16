"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcherMobile } from "@/components/language-switcher-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  BarChart3,
  History,
  Settings,
  Wallet,
  CreditCard,
  PiggyBank,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Target,
  User,
  Loader2,
  Menu,
} from "lucide-react"
import { useTranslation } from "@/contexts/language-context"
import type { Account } from "@/types"
import { supabase } from "@/lib/supabase"
import { useIsMobile } from "@/hooks/use-mobile"

interface SidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [showBalances, setShowBalances] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMobile = useIsMobile()

  const fetchAccounts = async () => {
    setLoadingAccounts(true)
    const { data, error } = await supabase.from("platforms").select("*").order("account", { ascending: true })

    if (error) {
      console.error("Error fetching accounts for sidebar:", error)
    } else {
      setAccounts(
        data.map((p) => ({
          id: p.id,
          name: p.account,
          // Sesuaikan tipe agar cocok dengan logika ikon
          type: p.type_account === "Rekening Bank" ? "bank" : "ewallet",
          balance: p.saldo,
          isSavings: p.saving,
          color: `bg-${p.color}-500`,
        })) || [],
      )
    }
    setLoadingAccounts(false)
  }

  useEffect(() => {
    const handleTransactionAdded = () => {
      fetchAccounts() // Refresh accounts when transaction is added
    }

    const handleDataRefresh = () => {
      fetchAccounts() // Refresh accounts on general data refresh
    }

    window.addEventListener("transactionAdded", handleTransactionAdded)
    window.addEventListener("dataRefresh", handleDataRefresh)

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionAdded)
      window.removeEventListener("dataRefresh", handleDataRefresh)
    }
  }, [])

  // Fetch data akun (platforms) dari Supabase
  useEffect(() => {
    fetchAccounts()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const menuItems = [
    { href: "/", label: t("navigation.dashboard"), icon: LayoutDashboard },
    { href: "/analytics", label: t("navigation.analytics"), icon: BarChart3 },
    { href: "/transactions", label: t("navigation.transactions"), icon: History },
    { href: "/platforms", label: "Platform", icon: Settings },
    { href: "/goals", label: "Tujuan", icon: Target },
    { href: "/debts", label: t("navigation.debts"), icon: CreditCard },
    { href: "/profile", label: t("navigation.profile"), icon: User },
    { href: "/settings", label: t("navigation.settings"), icon: Settings },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b-2 border-sidebar-border flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-lg sm:text-xl font-bold font-manrope text-sidebar-foreground truncate">
            Brankas Pribadi
          </h1>
        )}
        <div className="flex items-center gap-1 sm:gap-2">
          {!isCollapsed && <LanguageSwitcherMobile />}
          {!isCollapsed && <ThemeToggle />}
          {!isMobile && (
            <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="p-1 hover:bg-sidebar-accent/10">
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="p-2 sm:p-4 space-y-1 sm:space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href} onClick={() => isMobile && setMobileOpen(false)}>
              <Button
                variant="ghost"
                className={`w-full justify-start p-2 sm:p-3 h-auto font-semibold transition-all duration-75 text-sm sm:text-base ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent/10 text-sidebar-foreground"
                } ${isCollapsed ? "px-2" : ""}`}
              >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isCollapsed ? "" : "mr-2 sm:mr-3"}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Platform Accounts */}
      {!isCollapsed && (
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="font-semibold text-xs sm:text-sm text-sidebar-foreground/60">BRANKAS</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
              className="p-1 hover:bg-sidebar-accent/10"
            >
              {showBalances ? <Eye className="h-3 w-3 sm:h-4 sm:w-4" /> : <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
          </div>

          <div className="space-y-1">
            {loadingAccounts ? (
              <div className="flex justify-center items-center h-16 sm:h-20">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
              </div>
            ) : (
              accounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/platforms/${account.id}`}
                  onClick={() => isMobile && setMobileOpen(false)}
                >
                  <div className="border-2 border-sidebar-border bg-sidebar hover:bg-sidebar-accent/10 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-75 cursor-pointer p-2 rounded-none">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                        {account.type === "bank" ? (
                          <CreditCard className="h-3 w-3 text-sidebar-foreground flex-shrink-0" />
                        ) : (
                          <Wallet className="h-3 w-3 text-sidebar-foreground flex-shrink-0" />
                        )}
                        <span className="font-medium text-xs text-sidebar-foreground truncate">{account.name}</span>
                        {account.isSavings && (
                          <PiggyBank className="h-2 w-2 text-sidebar-foreground/60 flex-shrink-0" />
                        )}
                      </div>

                      {showBalances && (
                        <span className="font-medium text-xs text-foreground whitespace-nowrap">
                          {formatCurrency(account.balance).replace("Rp", "").trim()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed top-2 left-2 z-50 neobrutalism-button bg-background border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all duration-75 p-2 h-8 w-8"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] sm:w-80 p-0 bg-sidebar border-r-2 border-sidebar-border max-w-[85vw]"
          >
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div
      className={`bg-sidebar border-r-2 border-sidebar-border transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64 sm:w-80"
      } min-h-screen flex flex-col fixed left-0 top-0 z-40`}
    >
      <SidebarContent />
    </div>
  )
}
