"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { useTranslation } from "@/contexts/language-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  Filter,
  Download,
  CalendarIcon,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { TransactionActions } from "@/components/transaction-actions"
import type { Account, Category, Transaction } from "@/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export default function TransactionsPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const { t } = useTranslation()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [sortBy, setSortBy] = useState<"date" | "amount" | "description">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setLoading(true)
      setError(null)
      try {
        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
        if (transactionError) throw transactionError

        const { data: platformData, error: platformError } = await supabase
          .from("platforms")
          .select("*")
          .eq("user_id", user.id)
        if (platformError) throw platformError

        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id)
        if (categoryError) throw categoryError

        setAccounts(
          platformData.map((p) => ({
            id: p.id,
            name: p.account,
            type: p.type_account,
            balance: p.saldo,
            isSavings: p.saving,
            color: `bg-${p.color}-500`,
          })) || [],
        )

        setCategories(categoryData || [])

        setTransactions(
          transactionData.map((tx) => ({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            category: tx.category,
            subcategory: tx["sub-category"],
            amount: tx.nominal,
            type: tx.category === "Pemasukan" ? "income" : tx.category === "Mutasi" ? "transfer" : "expense",
            accountId: tx.account,
            toAccountId: tx.destination_account,
            receiptUrl: tx.receipt_url,
            struck: tx.struck || false,
          })) || [],
        )
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Gagal memuat data riwayat.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleTransactionUpdate = async (updatedTransaction: Transaction) => {
    if (!user) return

    const originalTransactions = [...transactions]
    // 1. Optimistic Update
    setTransactions(transactions.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t)))

    try {
      // 2. Siapkan payload untuk Supabase
      const supabasePayload = {
        date: updatedTransaction.date,
        description: updatedTransaction.description,
        category: updatedTransaction.category,
        "sub-category": updatedTransaction.subcategory,
        nominal: updatedTransaction.amount,
        account: updatedTransaction.accountId,
        destination_account: updatedTransaction.toAccountId,
        // ... field lainnya
      }

      // 3. Kirim permintaan UPDATE
      const { error } = await supabase
        .from("transactions")
        .update(supabasePayload)
        .eq("id", updatedTransaction.id)
        .eq("user_id", user.id)

      // 4. Handle error
      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Failed to update transaction:", error)
      alert("Gagal memperbarui transaksi di database.")
      // Rollback: kembalikan UI ke state semula jika gagal
      setTransactions(originalTransactions)
    }
  }
  const handleTransactionDelete = async (transactionId: string) => {
    if (!user) return

    const originalTransactions = transactions
    setTransactions(transactions.filter((t) => t.id !== transactionId))

    const { error } = await supabase.from("transactions").delete().eq("id", transactionId).eq("user_id", user.id)
    if (error) {
      console.error("Failed to delete transaction:", error)
      alert("Gagal menghapus transaksi.")
      setTransactions(originalTransactions)
    }
  }

  const handleStruckToggle = async (transactionId: string) => {
    if (!user) return

    const transaction = transactions.find((t) => t.id === transactionId)
    if (!transaction) return

    const newStruckValue = !transaction.struck
    setTransactions(transactions.map((t) => (t.id === transactionId ? { ...t, struck: newStruckValue } : t)))

    const { error } = await supabase
      .from("transactions")
      .update({ struck: newStruckValue })
      .eq("id", transactionId)
      .eq("user_id", user.id)
    if (error) {
      console.error("Failed to update struck status:", error)
      alert("Gagal memperbarui status transaksi.")
      setTransactions(transactions.map((t) => (t.id === transactionId ? { ...t, struck: !newStruckValue } : t)))
    }
  }

  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) return false

      // DIUBAH: Logika filter akun diperbaiki
      if (selectedAccount !== "all") {
        const selectedAccountName = accounts.find((a) => a.id === selectedAccount)?.name
        if (transaction.accountId !== selectedAccountName && transaction.toAccountId !== selectedAccountName) {
          return false
        }
      }

      if (selectedCategory !== "all" && transaction.category !== selectedCategory) return false
      if (selectedType !== "all" && transaction.type !== selectedType) return false
      if (dateRange.from || dateRange.to) {
        const transactionDate = new Date(transaction.date)
        if (dateRange.from && transactionDate < dateRange.from) return false
        if (dateRange.to && transactionDate > dateRange.to) return false
      }
      return true
    })

    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "date":
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime()
          break // Desc by default
        case "amount":
          comparison = Math.abs(b.amount) - Math.abs(a.amount)
          break // Desc by default
        case "description":
          comparison = a.description.localeCompare(b.description)
          break // Asc by default
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [
    transactions,
    accounts,
    searchTerm,
    selectedAccount,
    selectedCategory,
    selectedType,
    dateRange,
    sortBy,
    sortOrder,
  ])

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage)

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedAccount("all")
    setSelectedCategory("all")
    setSelectedType("all")
    setDateRange({})
    setCurrentPage(1)
  }

  const exportToCSV = () => {
    /* ... */
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-secondary" />
      case "expense":
        return <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
      case "transfer":
        return <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
      default:
        return null
    }
  }

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case "income":
        return "bg-secondary/10 text-secondary border-secondary/20"
      case "expense":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "transfer":
        return "bg-primary/10 text-primary border-primary/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const activeFiltersCount = [
    searchTerm,
    selectedAccount !== "all" ? selectedAccount : null,
    selectedCategory !== "all" ? selectedCategory : null,
    selectedType !== "all" ? selectedType : null,
    dateRange.from || dateRange.to ? "dateRange" : null,
  ].filter(Boolean).length

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-20 text-destructive">{error}</div>
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground font-manrope">
            {t("transactions.mainTitle")}
          </h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button className="neobrutalism-button bg-secondary text-secondary-foreground text-sm sm:text-base px-3 sm:px-4 py-2">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Export
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <Button variant="ghost" className="w-full justify-start text-sm" onClick={exportToCSV}>
                Export CSV
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Filters */}
        <Card className="neobrutalism-card mb-4 sm:mb-6">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg sm:text-xl font-bold font-manrope flex items-center gap-2">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                Filter & {t("common.search")}
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="neobrutalism-button bg-transparent text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {t("common.delete")} Filter ({activeFiltersCount})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="sm:col-span-2 xl:col-span-2">
                <label className="text-xs sm:text-sm font-semibold mb-2 block">
                  {t("common.find")} {t("common.transactions")}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder={`${t("common.find")} ${t("common.description")}...`}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="neobrutalism-input pl-8 sm:pl-10 text-sm h-9 sm:h-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-semibold mb-2 block">{t("common.account")}</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="neobrutalism-input text-sm h-9 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("common.all")} {t("common.account")}
                    </SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${account.color}`} />
                          <span className="truncate">{account.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-semibold mb-2 block">{t("common.category")}</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="neobrutalism-input text-sm h-9 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("common.all")} {t("common.categories")}
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <span className="truncate">{category.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-semibold mb-2 block">Tipe</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="neobrutalism-input text-sm h-9 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("common.all")} {t("common.type")}
                    </SelectItem>
                    <SelectItem value="income">{t("common.income")}</SelectItem>
                    <SelectItem value="expense">{t("common.expense")}</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs sm:text-sm font-semibold mb-2 block">{t("common.dateRange")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="neobrutalism-input w-full justify-start text-left font-normal bg-transparent text-sm h-9 sm:h-10"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd MMM", { locale: id })} -{" "}
                              {format(dateRange.to, "dd MMM yyyy", { locale: id })}
                            </>
                          ) : (
                            format(dateRange.from, "dd MMM yyyy", { locale: id })
                          )
                        ) : (
                          "Pilih tanggal"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-muted-foreground">
            {t("common.shows")} {paginatedTransactions.length} {t("common.from")} {filteredAndSortedTransactions.length}{" "}
            {t("common.transactions")}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-semibold whitespace-nowrap">{t("common.shows")}:</label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="neobrutalism-input w-16 sm:w-20 text-sm h-8 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value={filteredAndSortedTransactions.length.toString()}>{t("common.all")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-semibold whitespace-nowrap">{t("common.sortedBy")}:</label>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split("-")
                  setSortBy(field as any)
                  setSortOrder(order as any)
                }}
              >
                <SelectTrigger className="neobrutalism-input w-32 sm:w-48 text-sm h-8 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">
                    {t("common.date")} ({t("common.recent")} )
                  </SelectItem>
                  <SelectItem value="date-asc">
                    {t("common.date")} ({t("common.latest")} )
                  </SelectItem>
                  <SelectItem value="amount-desc">
                    {t("transactions.amount")} ({t("common.highest")})
                  </SelectItem>
                  <SelectItem value="amount-asc">
                    {t("transactions.amount")} ({t("common.lowest")})
                  </SelectItem>
                  <SelectItem value="description-asc">{t("common.descriptions")} (A-Z)</SelectItem>
                  <SelectItem value="description-desc">{t("common.descriptions")} (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <Card className="neobrutalism-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[80px] px-2 sm:px-4">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (sortBy === "date") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                          } else {
                            setSortBy("date")
                            setSortOrder("desc")
                          }
                        }}
                        className="h-auto p-0 font-bold hover:bg-transparent text-xs sm:text-sm"
                      >
                        {t("common.date")}
                        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[120px] px-2 sm:px-4">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (sortBy === "description") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                          } else {
                            setSortBy("description")
                            setSortOrder("asc")
                          }
                        }}
                        className="h-auto p-0 font-bold hover:bg-transparent text-xs sm:text-sm"
                      >
                        {t("transactions.description")}
                        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[100px] px-2 sm:px-4">
                      {t("common.account")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[80px] px-2 sm:px-4 hidden sm:table-cell">
                      {t("common.category")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[70px] px-2 sm:px-4 hidden md:table-cell">
                      {t("common.type")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-right text-xs sm:text-sm min-w-[100px] px-2 sm:px-4">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (sortBy === "amount") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                          } else {
                            setSortBy("amount")
                            setSortOrder("desc")
                          }
                        }}
                        className="h-auto p-0 font-bold hover:bg-transparent text-xs sm:text-sm"
                      >
                        {t("transactions.amount")}
                        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-bold text-foreground w-12 sm:w-16 px-1 sm:px-2 hidden sm:table-cell">
                      {t("common.receipt")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground w-12 sm:w-20 px-1 sm:px-2">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                        {t("transactions.noTransactionsFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((transaction) => {
                      // DIUBAH: Logika pencocokan dibuat lebih aman dengan trim()
                      const account = accounts.find((acc) => acc.name.trim() === transaction.accountId?.trim())
                      const toAccount = transaction.toAccountId
                        ? accounts.find((acc) => acc.name.trim() === transaction.toAccountId?.trim())
                        : null
                      return (
                        <TableRow
                          key={transaction.id}
                          className={`neobrutalism-table-row border-b border-border transition-all duration-75 ${
                            transaction.struck ? "opacity-60" : ""
                          }`}
                        >
                          <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4">
                            <div className="min-w-[70px]">
                              {format(new Date(transaction.date), "dd MMM yyyy", { locale: id })}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm px-2 sm:px-4">
                            <div className={transaction.struck ? "line-through" : ""}>
                              <div
                                className="font-medium truncate max-w-[100px] sm:max-w-[150px] md:max-w-none"
                                title={transaction.description}
                              >
                                {transaction.description}
                              </div>
                              {transaction.subcategory && (
                                <div
                                  className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[150px] md:max-w-none"
                                  title={transaction.subcategory}
                                >
                                  {transaction.subcategory}
                                </div>
                              )}
                              <div className="sm:hidden mt-1 flex flex-wrap gap-1">
                                <Badge className={`${getTransactionBadgeColor(transaction.type)} text-xs px-1 py-0`}>
                                  {getTransactionIcon(transaction.type)}
                                  <span className="ml-1">
                                    {transaction.type === "income"
                                      ? "Masuk"
                                      : transaction.type === "expense"
                                        ? "Keluar"
                                        : "Transfer"}
                                  </span>
                                </Badge>
                                <span className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                                  {transaction.category}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm px-2 sm:px-4">
                            <div className="flex items-center gap-1 sm:gap-2 min-w-[80px]">
                              <div className={`w-2 h-2 rounded-full ${account?.color} flex-shrink-0`} />
                              <span
                                className="text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[80px] md:max-w-none"
                                title={account?.name}
                              >
                                {account?.name}
                              </span>
                              {transaction.type === "transfer" && toAccount && (
                                <>
                                  <span className="text-xs text-muted-foreground">→</span>
                                  <div className={`w-2 h-2 rounded-full ${toAccount.color} flex-shrink-0`} />
                                  <span
                                    className="text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[80px] md:max-w-none"
                                    title={toAccount.name}
                                  >
                                    {toAccount.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm px-2 sm:px-4 hidden sm:table-cell">
                            <div className="text-sm truncate max-w-[100px] md:max-w-none" title={transaction.category}>
                              {transaction.category}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell px-2 sm:px-4">
                            <Badge
                              className={`${getTransactionBadgeColor(transaction.type)} flex items-center gap-1 w-fit text-xs`}
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
                            className={`text-right font-semibold text-xs sm:text-sm px-2 sm:px-4 ${
                              transaction.type === "income"
                                ? "text-secondary"
                                : transaction.type === "transfer"
                                  ? "text-primary"
                                  : "text-destructive"
                            } ${transaction.struck ? "line-through" : ""}`}
                          >
                            <div className="min-w-[80px] sm:min-w-[100px]">
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                          </TableCell>
                          <TableCell className="px-1 sm:px-2 hidden sm:table-cell">
                            <Checkbox
                              checked={transaction.struck || false}
                              onCheckedChange={() => handleStruckToggle(transaction.id)}
                              className="neobrutalism-input"
                            />
                          </TableCell>
                          <TableCell className="px-1 sm:px-2">
                            <div className="flex items-center gap-1">
                              <div className="sm:hidden">
                                <Checkbox
                                  checked={transaction.struck || false}
                                  onCheckedChange={() => handleStruckToggle(transaction.id)}
                                  className="neobrutalism-input"
                                />
                              </div>
                              <TransactionActions
                                transaction={transaction}
                                accounts={accounts}
                                onUpdate={handleTransactionUpdate}
                                onDelete={handleTransactionDelete}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="neobrutalism-button bg-transparent text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              {t("common.previous")}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    onClick={() => setCurrentPage(pageNum)}
                    className="neobrutalism-button w-8 h-8 sm:w-10 sm:h-10 p-0 text-xs sm:text-sm"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="neobrutalism-button bg-transparent text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              {t("common.next")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
