"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, ArrowRightLeft, CreditCard, Wallet, PiggyBank, Loader2 } from "lucide-react"
import { useTranslation } from "@/contexts/language-context"
import Link from "next/link"
import { useParams } from "next/navigation"
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import type { Account, Transaction } from "@/types"
import { supabase } from "@/lib/supabase"

export default function AccountDetailPage() {
  // State untuk data dari Supabase
  const [account, setAccount] = useState<Account | null>(null)
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])  
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = useParams()
  const accountId = params.id as string

  // Fetch data saat komponen dimuat
  useEffect(() => {
    if (!accountId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // 1. Ambil detail akun yang spesifik berdasarkan ID dari URL
        const { data: platformData, error: platformError } = await supabase
          .from("platforms")
          .select("*")
          .eq("id", accountId)
          .single()

        if (platformError || !platformData) {
          throw new Error("Akun tidak ditemukan.")
        }

        const currentAccount: Account = {
          id: platformData.id,
          name: platformData.account,
          type: platformData.type_account,
          balance: platformData.saldo,
          isSavings: platformData.saving,
          color: `bg-${platformData.color}-500`,
        }
        setAccount(currentAccount)

        // 2. Ambil SEMUA transaksi yang terkait dengan NAMA akun ini
        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*")
          .or(`account.eq.${currentAccount.name},destination_account.eq.${currentAccount.name}`)

        if (transactionError) throw transactionError

        const transformedTransactions = transactionData.map((tx) => ({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          category: tx.category,
          subcategory: tx["sub-category"],
          amount: tx.nominal,
          type: tx.category === "Pemasukan" ? "income" : tx.category === "Mutasi" ? "transfer" : "expense",
          accountId: tx.account,
          toAccountId: tx.destination_account,
        }))
        setTransactions(transformedTransactions)

        // 3. Ambil SEMUA akun untuk referensi (misal: mencari nama akun tujuan)
        const { data: allPlatformsData, error: allPlatformsError } = await supabase.from("platforms").select("*")
        if (allPlatformsError) throw allPlatformsError
        setAllAccounts(
          allPlatformsData.map((p) => ({
            id: p.id,
            name: p.account,
            type: p.type_account,
            balance: p.saldo,
            isSavings: p.saving,
            color: `bg-${p.color}-500`,
          })),
        )
      } catch (err) {
        console.error("Error fetching account detail:", err)
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  // Kalkulasi statistik menggunakan useMemo
  const [accountTransactions, stats, monthlyData] = useMemo(() => {
    if (!account) return [[], {}, []]

    const accountName = account.name
    const transactionsForAccount = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // --- AWAL PERUBAHAN ---
    // 1. Dapatkan tanggal hari ini untuk filter "Bulan ini"
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // 2. Filter transaksi agar hanya yang ada di bulan & tahun ini
    const transactionsThisMonth = transactionsForAccount.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth
    })

    // 3. Hitung income & expense dari data yang sudah difilter
    const income = transactionsThisMonth // <- Gunakan data bulan ini
      .filter(
        (t) =>
          (t.type === "income" && t.accountId === accountName) ||
          (t.type === "transfer" && t.toAccountId === accountName),
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const expense = transactionsThisMonth // <- Gunakan data bulan ini
      .filter(
        (t) =>
          (t.type === "expense" && t.accountId === accountName) ||
          (t.type === "transfer" && t.accountId === accountName),
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    // --- AKHIR PERUBAHAN ---

    const transfers = transactionsForAccount.filter((t) => t.type === "transfer").length

    const monthlyStats: Record<string, { income: number; expense: number }> = {}
    transactionsForAccount.forEach((transaction) => {
      const month = new Date(transaction.date).toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
      if (!monthlyStats[month]) {
        monthlyStats[month] = { income: 0, expense: 0 }
      }
      if (
        (transaction.type === "income" && transaction.accountId === accountName) ||
        (transaction.type === "transfer" && transaction.toAccountId === accountName)
      ) {
        monthlyStats[month].income += Math.abs(transaction.amount)
      } else if (
        (transaction.type === "expense" && transaction.accountId === accountName) ||
        (transaction.type === "transfer" && transaction.accountId === accountName)
      ) {
        monthlyStats[month].expense += Math.abs(transaction.amount)
      }
    })

    return [
      transactionsForAccount,
      { income, expense, transfers, total: transactionsForAccount.length },
      Object.entries(monthlyStats).map(([month, data]) => ({ month, ...data })),
    ]
  }, [account, transactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(
      amount,
    )
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-4 w-4 text-primary" />
      case "expense":
        return <TrendingDown className="h-4 w-4 text-destructive" />
      case "transfer":
        return <ArrowRightLeft className="h-4 w-4 text-primary" />
      default:
        return null
    }
  }

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case "income":
        return "bg-primary/10 text-primary border-primary/20"
      case "expense":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "transfer":
        return "bg-primary/10 text-primary border-primary/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">{error || "Akun tidak ditemukan"}</h1>
            <Link href="/platforms">
              <Button className="neobrutalism-button">
                {t("accounts.backToPlatforms")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full ${account.color}`} />
              <h1 className="text-4xl font-bold text-foreground font-manrope">{account.name}</h1>
              {account.type === "Rekening Bank" ? (
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Wallet className="h-6 w-6 text-muted-foreground" />
              )}
              {account.isSavings && <PiggyBank className="h-6 w-6 text-chart-1" />}
            </div>
          </div>
        </div>

        {/* Account Summary */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("accounts.currentBalance")}
              </CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(account.balance)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {account.type}
                {account.isSavings && ` • ${t("accounts.savings")}`}
              </div>
            </CardContent>
          </Card>
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("analytics.totalIncome")}
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(stats.income)}</div>
              <div className="text-xs text-muted-foreground">
                {t("accounts.thisMonth")}
              </div>
            </CardContent>
          </Card>
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("analytics.totalExpense")}
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.expense)}</div>
              <div className="text-xs text-muted-foreground"> {t("accounts.thisMonth")}</div>
            </CardContent>
          </Card>
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("analytics.totalTransactions")}
              </CardTitle>
              <ArrowRightLeft className="h-5 w-5 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-1">{stats.total}</div>
              <div className="text-xs text-muted-foreground">{stats.transfers} transfer</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Chart */}
        {monthlyData.length > 0 && (
          <Card className="neobrutalism-card mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-manrope">
                {t("analytics.monthlyOverview")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="income" fill="#22c55e" name="Pemasukan" />
                  <Bar dataKey="expense" fill="#ef4444" name="Pengeluaran" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card className="neobrutalism-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-manrope">
              {t("analytics.transactionHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accountTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("transactions.noTransactions")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="font-bold text-foreground">
                      {t("common.date")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground">
                      {t("common.description")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground">
                      {t("common.category")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground">
                      {t("common.type")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-right">
                      {t("common.amount")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {accountTransactions.map((transaction) => {
                    const toAccount = transaction.toAccountId
                        ? allAccounts.find((acc) => acc.name === transaction.toAccountId)
                        : null
                    
                    // Logika KREDIT (dana masuk) sudah benar
                    const isCredit = 
                        (transaction.type === "income" && transaction.accountId === account.name) || 
                        (transaction.type === "transfer" && transaction.toAccountId === account.name);

                    return (
                        <TableRow
                        key={transaction.id}
                        className="neobrutalism-table-row border-b border-border transition-all duration-75"
                        >
                        <TableCell className="font-medium">
                            {new Date(transaction.date).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell>
                            <div>
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.subcategory && (
                                <div className="text-xs text-muted-foreground">{transaction.subcategory}</div>
                            )}
                            {/* INI BAGIAN YANG DIPERBAIKI */}
                            {toAccount && transaction.type === "transfer" && (
                                <div className="text-xs text-muted-foreground">
                                {transaction.toAccountId === account.name ? `Dari ${transaction.accountId}` : `Ke ${toAccount.name}`}
                                </div>
                            )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="text-sm">{transaction.category}</div>
                        </TableCell>
                        <TableCell>
                            <Badge
                            className={`${getTransactionBadgeColor(transaction.type)} flex items-center gap-1 w-fit`}
                            >
                            {getTransactionIcon(transaction.type)}
                            {transaction.type === "income"
                                ? "Masuk"
                                : transaction.type === "expense"
                                ? "Keluar"
                                : "Transfer"}
                            </Badge>
                        </TableCell>
                        <TableCell
                            className={`text-right font-semibold ${isCredit ? "text-primary" : "text-destructive"}`}
                        >
                            {isCredit ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                        </TableCell>
                        </TableRow>
                    )
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
