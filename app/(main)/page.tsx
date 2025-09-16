"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import type { TransformedCategory } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, TrendingUp, TrendingDown, Wallet, Loader2, ImageIcon, Eye, EyeOff } from "lucide-react"
import { AccountSelector } from "@/components/account-selector"
import { CategorySelector } from "@/components/category-selector"
import { TransferPreview } from "@/components/transfer-preview"
import { TransactionActions } from "@/components/transaction-actions"
import { HelpTooltip } from "@/components/help-tooltip"
import { ClockWidget } from "@/components/clock-widget"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "@/contexts/language-context"
import { useCurrency } from "@/hooks/use-currency"
import { useDateFormat } from "@/hooks/use-date-format"
import { DatabaseService } from "@/lib/database"
import { ProfileService, type UserProfile } from "@/lib/profile-service"
import type { Account, Transaction, DashboardPeriod, Category, Debt } from "@/types"

// 2. TAMBAHKAN FUNGSI TRANSFORMASI DI SINI (DI LUAR KOMPONEN)
function transformCategories(rawCategories: Category[], debts: Debt[]): TransformedCategory[] {
  // 1. Proses kategori dari database seperti sebelumnya
  const grouped = new Map<string, TransformedCategory>()
  rawCategories.forEach((item) => {
    if (item.category === "Mutasi" || item.category === "Bayar Hutang") return // Abaikan dari DB

    let type: "income" | "expense" | "transfer" | "debt" = "expense"
    if (item.category === "Pemasukan") type = "income"
    if (item.category === "Hutang") type = "debt"

    if (!grouped.has(item.category)) {
      grouped.set(item.category, {
        id: item.category,
        name: item.category,
        type: type,
        subcategories: [],
      })
    }

    if (item.sub_category) {
      grouped.get(item.category)!.subcategories.push(item.sub_category)
    }
  })

  const databaseCategories = Array.from(grouped.values())

  // 2. Siapkan daftar untuk kategori manual/dinamis
  const specialCategories: TransformedCategory[] = []

  // 3. Selalu tambahkan kategori "Mutasi"
  specialCategories.push({
    id: "Mutasi",
    name: "Mutasi",
    type: "transfer",
    subcategories: ["Alokasi saldo ke", "Tarik Tunai dari"],
  })

  // 4. Tambahkan "Bayar Hutang" HANYA JIKA ada data hutang
  //    dan sub-kategorinya adalah nama hutang tersebut.
  if (debts && debts.length > 0) {
    specialCategories.push({
      id: "Bayar Hutang",
      name: "Bayar Hutang",
      type: "expense",
      // Ambil nama dari setiap item hutang sebagai sub-kategori
      subcategories: debts.map((debt) => debt.name), // Pastikan tipe 'Debt' Anda memiliki properti 'name'
    })
  }

  // 5. Gabungkan semua kategori menjadi satu
  return [...databaseCategories, ...specialCategories].sort((a, b) => a.name.localeCompare(b.name))
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { formatAmount } = useCurrency()
  const { formatDateString } = useDateFormat()

  // State untuk data dari Supabase
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<TransformedCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State untuk UI
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("monthly")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showSavingsBalance, setShowSavingsBalance] = useState(true)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "expense",
    category: "",
    subcategory: "",
    accountId: "",
    toAccountId: "",
    date: new Date().toISOString().split("T")[0],
    receiptFile: null as File | null,
  })

  // GANTI SELURUH FUNGSI fetchData ANDA DENGAN INI

  // Di dalam fungsi fetchData

  const fetchData = async () => {
    if (!user) return

    try {
      // Anda sudah mengambil semua data yang diperlukan di sini
      const [platformData, transactionData, rawCategoryData, profileData, debtData] = await Promise.all([
        DatabaseService.getPlatforms(user.id),
        DatabaseService.getTransactions(user.id),
        DatabaseService.getCategories(user.id),
        ProfileService.getProfile(user.id),
        DatabaseService.getDebts(user.id), // Pastikan Anda juga mengambil data hutang
      ])

      // GANTI PEMANGGILAN FUNGSI DI SINI
      // Teruskan 'debtData' sebagai argumen kedua
      const structuredCategories = transformCategories(rawCategoryData, debtData)

      // (Opsional) Tambahkan log ini untuk memastikan hasilnya benar
      // console.log("✅ Data Kategori yang Dikirim ke UI:", structuredCategories)

      setAccounts(
        platformData.map((p) => ({
          id: p.id,
          name: p.account,
          type: p.type_account,
          balance: p.saldo,
          isSavings: p.saving,
          color: `bg-${p.color}-500`,
        })),
      )

      // SIMPAN HASIL TRANSFORMASI KE STATE
      setCategories(structuredCategories)

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
        })),
      )

      if (profileData) {
        setUserProfile(profileData)
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError("Gagal memuat data dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  useEffect(() => {
    const handleTransactionAdded = () => {
      fetchData()
    }

    const handleDataRefresh = () => {
      fetchData()
    }

    window.addEventListener("transactionAdded", handleTransactionAdded)
    window.addEventListener("dataRefresh", handleDataRefresh)

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionAdded)
      window.removeEventListener("dataRefresh", handleDataRefresh)
    }
  }, [user])

  const { totalBalance, savingsBalance, dailyBalance, periodData } = useMemo(() => {
    const total = accounts.reduce((sum, account) => sum + account.balance, 0)
    const savings = accounts.filter((account) => account.isSavings).reduce((sum, account) => sum + account.balance, 0)

    const now = new Date()
    let startDate: Date
    switch (dashboardPeriod) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "weekly":
        const day = now.getDay()
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
        break
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    const currentPeriodTransactions = transactions.filter((t) => new Date(t.date) >= startDate)
    const currentIncome = currentPeriodTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
    const currentExpense = Math.abs(
      currentPeriodTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
    )

    return {
      totalBalance: total,
      savingsBalance: savings,
      dailyBalance: total - savings,
      periodData: { currentIncome, currentExpense },
    }
  }, [accounts, transactions, dashboardPeriod])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const amount = Number.parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert("Jumlah harus berupa angka positif.")
      return
    }

    const fromAccount = accounts.find((acc) => String(acc.id) === String(formData.accountId))
    if (!fromAccount) {
      alert("Akun asal tidak valid.")
      return
    }

    let toAccountName = null
    if (formData.category === "Mutasi") {
      if (formData.subcategory === "Tarik Tunai dari") {
        const cashAccount = accounts.find((acc) => acc.type === "Cash")
        if (!cashAccount) {
          alert("Akun dengan tipe 'Cash' tidak ditemukan. Mohon buat akun CASH terlebih dahulu.")
          return
        }
        toAccountName = cashAccount.name
      } else {
        toAccountName = accounts.find((acc) => String(acc.id) === String(formData.toAccountId))?.name || null
      }
    }

    const transactionData = {
      date: formData.date,
      description: formData.description,
      category: formData.category,
      "sub-category": formData.subcategory,
      nominal: formData.type === "expense" ? -amount : amount,
      account: fromAccount.name,
      destination_account: toAccountName,
      receipt_url: null,
      user_id: user.id,
    }

    const result = await DatabaseService.addTransaction(transactionData, user.id)
    if (!result) {
      alert("Gagal menyimpan transaksi.")
      return
    }

    const newFromBalance = fromAccount.balance + transactionData.nominal
    await DatabaseService.updatePlatform(fromAccount.id, { saldo: newFromBalance }, user.id)

    if (formData.category === "Mutasi") {
      const toAccount = accounts.find((acc) => acc.name === toAccountName)
      if (toAccount) {
        const newToBalance = toAccount.balance + amount
        await DatabaseService.updatePlatform(toAccount.id, { saldo: newToBalance }, user.id)
      }
    }

    await fetchData()
    window.dispatchEvent(new CustomEvent("dataRefresh"))
    setIsModalOpen(false)
    setFormData({
      description: "",
      amount: "",
      type: "expense",
      category: "",
      subcategory: "",
      accountId: "",
      toAccountId: "",
      date: new Date().toISOString().split("T")[0],
      receiptFile: null,
    })
  }

  const handleTransactionUpdate = async (updatedTransaction: Transaction) => {
    if (!user) return

    const transactionDataToUpdate = {
      date: updatedTransaction.date,
      description: updatedTransaction.description,
      category: updatedTransaction.category,
      "sub-category": updatedTransaction.subcategory,
      nominal: updatedTransaction.amount,
      account: updatedTransaction.accountId,
      destination_account: updatedTransaction.toAccountId,
    }

    const result = await DatabaseService.updateTransaction(updatedTransaction.id, transactionDataToUpdate, user.id)
    if (!result) {
      alert("Gagal memperbarui transaksi.")
    } else {
      await fetchData()
      window.dispatchEvent(new CustomEvent("dataRefresh"))
    }
  }

  const handleTransactionDelete = async (transactionId: string) => {
    if (!user) return

    const transactionToDelete = transactions.find((t) => t.id === transactionId)
    if (!transactionToDelete) return

    const success = await DatabaseService.deleteTransaction(transactionId, user.id)
    if (!success) {
      alert("Gagal menghapus transaksi.")
      return
    }

    const fromAccount = accounts.find((acc) => acc.name === transactionToDelete.accountId)
    if (fromAccount) {
      const newBalance = fromAccount.balance - transactionToDelete.amount
      await DatabaseService.updatePlatform(fromAccount.id, { saldo: newBalance }, user.id)
    }

    if (transactionToDelete.type === "transfer" && transactionToDelete.toAccountId) {
      const toAccount = accounts.find((acc) => acc.name === transactionToDelete.toAccountId)
      if (toAccount) {
        const newBalance = toAccount.balance - Math.abs(transactionToDelete.amount)
        await DatabaseService.updatePlatform(toAccount.id, { saldo: newBalance }, user.id)
      }
    }

    await fetchData()
    window.dispatchEvent(new CustomEvent("dataRefresh"))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(
      amount,
    )
  }

  const handleCategoryChange = (category: string) => {
    const categoryData = categories.find((cat) => cat.name === category)
    setFormData({ ...formData, category, subcategory: "", type: categoryData?.type || "expense" })
  }

  const handleSubcategoryChange = (subcategory: string) => {
    setFormData({ ...formData, subcategory })
  }

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData({ ...formData, receiptFile: file })
  }

  const fromAccountForPreview = accounts.find((acc) => String(acc.id) === String(formData.accountId))
  const toAccountForPreview = accounts.find((acc) => String(acc.id) === String(formData.toAccountId))
  const transferAmount = Number.parseFloat(formData.amount) || 0

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
    <div className="p-2 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col gap-2 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={userProfile?.avatar_url || "/diverse-user-avatars.png"}
                alt="Avatar"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black flex-shrink-0"
              />
              <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-manrope break-words leading-tight">
                {user
                  ? `Brankas ${userProfile?.full_name || user.user_metadata?.full_name || "User"}`
                  : "Brankas Pribadi"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 justify-start lg:justify-end flex-wrap">
            <LanguageSwitcher />
            <ClockWidget />
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="neobrutalism-button bg-[#00A86B] text-white hover:bg-[#008A5A] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-75 text-xs sm:text-sm md:text-base px-2 sm:px-4 py-1 sm:py-2">
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">{t("dashboard.newTransaction")}</span>
                  <span className="sm:hidden">Tambah</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="neobrutalism-card w-[95vw] max-w-md max-h-[90vh] overflow-y-auto mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold font-manrope flex items-center gap-2">
                    {t("dashboard.newTransaction")}
                    <HelpTooltip content={t("dashboard.newTransaction")} />
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor="date" className="text-xs sm:text-sm font-semibold">
                      {t("transactions.date")}
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      className="neobrutalism-input mt-1 text-sm"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-semibold">
                      {t("transactions.category")} & {t("transactions.subcategory")}
                    </Label>
                    <CategorySelector
                      categories={categories}
                      selectedCategory={formData.category}
                      selectedSubcategory={formData.subcategory}
                      onCategoryChange={handleCategoryChange}
                      onSubcategoryChange={handleSubcategoryChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-xs sm:text-sm font-semibold">
                      {t("transactions.description")}
                    </Label>
                    <Input
                      id="description"
                      className="neobrutalism-input mt-1 text-sm"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t("transactions.description")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount" className="text-xs sm:text-sm font-semibold">
                      {t("transactions.amount")}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      className="neobrutalism-input mt-1 text-sm"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="account" className="text-xs sm:text-sm font-semibold">
                      {formData.category === "Mutasi" ? "Akun Asal" : t("transactions.account")}
                    </Label>
                    <AccountSelector
                      accounts={accounts}
                      value={formData.accountId}
                      onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                      placeholder={t("transactions.account")}
                    />
                  </div>

                  {formData.category === "Mutasi" && formData.subcategory !== "Tarik Tunai dari" && (
                    <div>
                      <Label htmlFor="toAccount" className="text-xs sm:text-sm font-semibold">
                        Akun Tujuan
                      </Label>
                      <AccountSelector
                        accounts={accounts}
                        value={formData.toAccountId}
                        onValueChange={(value) => setFormData({ ...formData, toAccountId: value })}
                        placeholder={t("transactions.account_destination")}
                        excludeAccountId={formData.accountId}
                      />
                    </div>
                  )}

                  {formData.category === "Mutasi" &&
                    fromAccountForPreview &&
                    toAccountForPreview &&
                    transferAmount > 0 && (
                      <TransferPreview
                        fromAccount={fromAccountForPreview}
                        toAccount={toAccountForPreview}
                        amount={transferAmount}
                        subcategory={formData.subcategory}
                      />
                    )}
                  <div>
                    <Label htmlFor="receipt" className="text-xs sm:text-sm font-semibold">
                      {t("transactions.receipt")}
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        className="neobrutalism-input text-sm"
                        onChange={handleReceiptChange}
                      />
                      {formData.receiptFile && (
                        <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{formData.receiptFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="neobrutalism-button w-full bg-[#00A86B] text-white text-sm sm:text-base py-2 sm:py-3"
                    disabled={
                      !formData.category ||
                      !formData.accountId ||
                      (formData.category === "Mutasi" &&
                        formData.subcategory !== "Tarik Tunai dari" &&
                        !formData.toAccountId)
                    }
                  >
                    {t("common.save")} {t("transactions.title")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 md:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl">
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">
                {t("dashboard.monthlyIncome")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-sm sm:text-base lg:text-lg font-bold text-primary break-words hyphens-auto leading-tight">
                {formatCurrency(periodData.currentIncome)}
              </div>
            </CardContent>
          </Card>

          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">
                {t("dashboard.monthlyExpense")}
              </CardTitle>
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-sm sm:text-base lg:text-lg font-bold text-destructive break-words hyphens-auto leading-tight">
                {formatCurrency(periodData.currentExpense)}
              </div>
            </CardContent>
          </Card>

          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">
                {t("dashboard.availableBalance")}
              </CardTitle>
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-sm sm:text-base lg:text-lg font-bold text-primary break-words hyphens-auto leading-tight">
                {formatCurrency(dailyBalance)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t("dashboard.availableforExpense")}</div>
            </CardContent>
          </Card>

          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg md:text-xl font-bold font-manrope">
                {t("dashboard.savingFund")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavingsBalance(!showSavingsBalance)}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-muted flex-shrink-0"
              >
                {showSavingsBalance ? (
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-sm sm:text-base lg:text-lg font-bold text-chart-1 break-words hyphens-auto leading-tight">
                {showSavingsBalance ? formatCurrency(savingsBalance) : "••••••••"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="neobrutalism-card max-w-6xl">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg md:text-xl font-bold font-manrope">
              {t("dashboard.recentTransactions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[70px] px-2 sm:px-4">
                      {t("transactions.date")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[100px] px-2 sm:px-4">
                      {t("transactions.description")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[80px] px-2 sm:px-4">
                      {t("transactions.account")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-xs sm:text-sm min-w-[80px] px-2 sm:px-4">
                      {t("transactions.category")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground text-right text-xs sm:text-sm min-w-[80px] px-2 sm:px-4">
                      {t("transactions.amount")}
                    </TableHead>
                    <TableHead className="font-bold text-foreground w-8 sm:w-12 px-1 sm:px-2">Bukti</TableHead>
                    <TableHead className="font-bold text-foreground w-12 sm:w-16 px-1 sm:px-2">
                      {t("transactions.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 5).map((transaction) => {
                    const account = accounts.find((acc) => acc.name === transaction.accountId)
                    const toAccount = transaction.toAccountId
                      ? accounts.find((acc) => acc.name === transaction.toAccountId)
                      : null
                    return (
                      <TableRow key={transaction.id} className="neobrutalism-table-row border-b border-border">
                        <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4">
                          <div className="min-w-[60px]">{formatDateString(new Date(transaction.date))}</div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm px-2 sm:px-4">
                          <div
                            className="max-w-[80px] sm:max-w-[120px] md:max-w-none truncate"
                            title={transaction.description}
                          >
                            {transaction.description}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm px-2 sm:px-4">
                          <div className="flex items-center gap-1 sm:gap-2 min-w-[60px]">
                            <div className={`w-2 h-2 rounded-full ${account?.color} flex-shrink-0`} />
                            <span className="truncate max-w-[40px] sm:max-w-[60px] md:max-w-none" title={account?.name}>
                              {account?.name}
                            </span>
                            {toAccount && (
                              <>
                                <span className="text-xs text-muted-foreground">→</span>
                                <div className={`w-2 h-2 rounded-full ${toAccount.color} flex-shrink-0`} />
                                <span
                                  className="truncate max-w-[40px] sm:max-w-[60px] md:max-w-none"
                                  title={toAccount.name}
                                >
                                  {toAccount.name}
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm px-2 sm:px-4">
                          <div className="min-w-[60px]">
                            <div
                              className="truncate max-w-[60px] sm:max-w-[80px] md:max-w-none"
                              title={transaction.category}
                            >
                              {transaction.category}
                            </div>
                            {transaction.subcategory && (
                              <div
                                className="text-xs text-muted-foreground truncate max-w-[60px] sm:max-w-[80px] md:max-w-none"
                                title={transaction.subcategory}
                              >
                                {transaction.subcategory}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold text-xs sm:text-sm px-2 sm:px-4 ${
                            transaction.type === "income"
                              ? "text-primary"
                              : transaction.type === "transfer"
                                ? "text-primary"
                                : "text-destructive"
                          }`}
                        >
                          <div className="min-w-[60px] sm:min-w-[80px]">
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2">
                          {transaction.receiptUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-6 w-6 sm:h-8 sm:w-8"
                              onClick={() => window.open(transaction.receiptUrl, "_blank")}
                            >
                              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            </Button>
                          ) : (
                            <div className="h-6 w-6 sm:h-8 sm:w-8" />
                          )}
                        </TableCell>
                        <TableCell className="px-1 sm:px-2">
                          <TransactionActions
                            transaction={transaction}
                            accounts={accounts}
                            onUpdate={handleTransactionUpdate}
                            onDelete={handleTransactionDelete}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
