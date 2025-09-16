"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/contexts/language-context"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CreditCard,
  Wallet,
  PiggyBank,
  Plus,
  Settings,
  TrendingUp,
  TrendingDown,
  Eye,
  Loader2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type { Account, Transaction } from "@/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export default function PlatformsPage() {
  const { user } = useAuth()
  // State untuk data dari Supabase
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State untuk modal dan form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "Rekening Bank" as "Rekening Bank" | "E-Wallet" | "Cash",
    balance: "",
    isSavings: false,
    color: "blue",
  })

  // Fetch data saat komponen dimuat
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setLoading(true)
      setError(null)
      try {
        const { data: platformData, error: platformError } = await supabase
          .from("platforms")
          .select("*")
          .eq("user_id", user.id)
          .order("account", { ascending: true })
        if (platformError) throw platformError

        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
        if (transactionError) throw transactionError

        // Transformasi data platforms dari Supabase
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

        // Transformasi data transactions dari Supabase
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
          })) || [],
        )
      } catch (err) {
        console.error("Error fetching platform data:", err)
        setError("Gagal memuat data platform. Pastikan RLS Policy sudah benar.")
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

  const getAccountStats = (accountName: string) => {
    const accountTransactions = transactions.filter((t) => t.accountId === accountName || t.toAccountId === accountName)
    const income = accountTransactions
      .filter(
        (t) =>
          (t.type === "income" && t.accountId === accountName) ||
          (t.type === "transfer" && t.toAccountId === accountName),
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const expense = accountTransactions
      .filter(
        (t) =>
          (t.type === "expense" && t.accountId === accountName) ||
          (t.type === "transfer" && t.accountId === accountName),
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
      console.log(`Stats for ${accountName} - Income: ${income}, Expense: ${expense}, Transactions: ${accountTransactions.length}`)
    return { income, expense, transactionCount: accountTransactions.length }

  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const accountData = {
      account: newAccount.name,
      type_account: newAccount.type,
      saldo: Number.parseFloat(newAccount.balance) || 0,
      saving: newAccount.isSavings,
      color: newAccount.color,
      user_id: user.id, // Added user_id to new account data
    }

    const { data, error } = await supabase.from("platforms").insert([accountData]).select().single()

    if (error) {
      console.error("Error adding account:", error)
      alert("Gagal menambahkan akun.")
    } else if (data) {
      const addedAccount: Account = {
        id: data.id,
        name: data.account,
        type: data.type_account,
        balance: data.saldo,
        isSavings: data.saving,
        color: `bg-${data.color}-500`,
      }
      setAccounts([...accounts, addedAccount].sort((a, b) => a.name.localeCompare(b.name)))
      setIsAddModalOpen(false)
      setNewAccount({ name: "", type: "Rekening Bank", balance: "", isSavings: false, color: "blue" })
    }
  }

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccount || !user) return

    const updatedData = {
      account: selectedAccount.name,
      type_account: selectedAccount.type,
      saldo: selectedAccount.balance,
      saving: selectedAccount.isSavings,
      color: selectedAccount.color.replace("bg-", "").replace("-500", ""),
    }

    const { error } = await supabase
      .from("platforms")
      .update(updatedData)
      .eq("id", selectedAccount.id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error updating account:", error)
      alert("Gagal memperbarui akun.")
    } else {
      setAccounts(accounts.map((acc) => (acc.id === selectedAccount.id ? selectedAccount : acc)))
      setIsEditModalOpen(false)
      setSelectedAccount(null)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!user) return

    if (window.confirm("Apakah Anda yakin ingin menghapus akun ini? Semua transaksi terkait tidak akan terhapus.")) {
      const { error } = await supabase.from("platforms").delete().eq("id", accountId).eq("user_id", user.id)
      if (error) {
        console.error("Error deleting account:", error)
        alert("Gagal menghapus akun.")
      } else {
        setAccounts(accounts.filter((acc) => acc.id !== accountId))
      }
    }
  }

  const colorOptions = [
    { value: "blue", label: "Biru", color: "bg-blue-500" },
    { value: "green", label: "Hijau", color: "bg-green-500" },
    { value: "yellow", label: "Kuning", color: "bg-yellow-500" },
    { value: "red", label: "Merah", color: "bg-red-500" },
    { value: "purple", label: "Ungu", color: "bg-purple-500" },
    { value: "orange", label: "Oranye", color: "bg-orange-500" },
    { value: "pink", label: "Pink", color: "bg-pink-500" },
    { value: "indigo", label: "Indigo", color: "bg-indigo-500" },
    { value: "gray", label: "Abu-abu", color: "bg-gray-500" },
  ]

  const bankAccounts = accounts.filter((account) => account.type === "Rekening Bank")
  const ewalletAccounts = accounts.filter((account) => account.type === "E-Wallet")
  const cashAccounts = accounts.filter((account) => account.type === "Cash")

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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground font-manrope">
            {t("accounts.title")}
          </h1>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="neobrutalism-button bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                {t("accounts.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="neobrutalism-card max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-manrope">{t("accounts.add")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold">
                    {t("accounts.accountName")}
                  </Label>
                  <Input
                    id="name"
                    className="neobrutalism-input mt-1"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder={`${t("common.exp")}: BCA, GoPay`}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type" className="text-sm font-semibold">
                    {t("accounts.accountType")}
                  </Label>
                  <Select
                    value={newAccount.type}
                    onValueChange={(value: "Rekening Bank" | "E-Wallet" | "Cash") =>
                      setNewAccount({ ...newAccount, type: value })
                    }
                  >
                    <SelectTrigger className="neobrutalism-input mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rekening Bank">
                      {t("accounts.bankAccount")}
                      </SelectItem>
                      <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="balance" className="text-sm font-semibold">
                    {t("accounts.initialBalance")}
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    className="neobrutalism-input mt-1"
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="color" className="text-sm font-semibold">
                    {t("common.color")}
                  </Label>
                  <Select
                    value={newAccount.color}
                    onValueChange={(value) => setNewAccount({ ...newAccount, color: value })}
                  >
                    <SelectTrigger className="neobrutalism-input mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="savings"
                    checked={newAccount.isSavings}
                    onCheckedChange={(checked) => setNewAccount({ ...newAccount, isSavings: checked })}
                  />
                  <Label htmlFor="savings" className="text-sm font-semibold">
                    {t("accounts.markAsSavings")}
                  </Label>
                </div>
                <Button type="submit" className="neobrutalism-button w-full bg-primary text-primary-foreground">
                  {t("accounts.add")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("accounts.totalAccounts")}
              </CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accounts.length}</div>
            </CardContent>
          </Card>
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("accounts.bankAccounts")}
              </CardTitle>
              <CreditCard className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bankAccounts.length}</div>
            </CardContent>
          </Card>
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">E-Wallet</CardTitle>
              <Wallet className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ewalletAccounts.length}</div>
            </CardContent>
          </Card>
          <Card className="neobrutalism-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("accounts.savingsAccount")}
              </CardTitle>
              <PiggyBank className="h-5 w-5 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accounts.filter((acc) => acc.isSavings).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Accounts Section */}
        {bankAccounts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-manrope mb-4 flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              {t("accounts.bankAccount")}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bankAccounts.map((account) => {
                const stats = getAccountStats(account.name)
                return (
                  <Card key={account.id} className="neobrutalism-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${account.color}`} />
                        {account.name}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {account.isSavings && <PiggyBank className="h-4 w-4 text-chart-1" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account)
                            setIsEditModalOpen(true)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("accounts.currentBalance")}{account.isSavings && " • Tabungan"}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <span className="text-primary font-semibold">{formatCurrency(stats.income)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-destructive" />
                          <span className="text-destructive font-semibold">{formatCurrency(stats.expense)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{stats.transactionCount} 
                        {t("accounts.transactionsThisMonth")}
                      </div>
                      <Link href={`/platforms/${account.id}`}>
                        <Button className="neobrutalism-button w-full bg-transparent border-2 border-black hover:bg-muted">
                          <Eye className="h-4 w-4 mr-2" />
                          {t("accounts.viewDetails")}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* E-Wallet Accounts Section */}
        {ewalletAccounts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-manrope mb-4 flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              E-Wallet
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ewalletAccounts.map((account) => {
                const stats = getAccountStats(account.name)
                return (
                  <Card key={account.id} className="neobrutalism-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${account.color}`} />
                        {account.name}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {account.isSavings && <PiggyBank className="h-4 w-4 text-chart-1" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account)
                            setIsEditModalOpen(true)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("accounts.currentBalance")}
                          {account.isSavings && ` • ${t("accounts.savings")}`}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <span className="text-primary font-semibold">{formatCurrency(stats.income)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-destructive" />
                          <span className="text-destructive font-semibold">{formatCurrency(stats.expense)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{stats.transactionCount} {t("accounts.transactionsThisMonth")}</div>
                      <Link href={`/platforms/${account.id}`}>
                        <Button className="neobrutalism-button w-full bg-transparent border-2 border-black hover:bg-muted">
                          <Eye className="h-4 w-4 mr-2" />
                          {t("accounts.viewDetails")}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Cash Accounts Section */}
        {cashAccounts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-manrope mb-4 flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              {t("accounts.cash")}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cashAccounts.map((account) => {
                const stats = getAccountStats(account.name)
                return (
                  <Card key={account.id} className="neobrutalism-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${account.color}`} />
                        {account.name}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {account.isSavings && <PiggyBank className="h-4 w-4 text-chart-1" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account)
                            setIsEditModalOpen(true)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("accounts.currentBalance")}{account.isSavings && " • Tabungan"}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <span className="text-primary font-semibold">{formatCurrency(stats.income)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-destructive" />
                          <span className="text-destructive font-semibold">{formatCurrency(stats.expense)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{stats.transactionCount} {t("accounts.transactionsThisMonth")}</div>
                      <Link href={`/platforms/${account.id}`}>
                        <Button className="neobrutalism-button w-full bg-transparent border-2 border-black hover:bg-muted">
                          <Eye className="h-4 w-4 mr-2" />
                          {t("accounts.viewDetails")}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="neobrutalism-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-manrope">Edit Akun</DialogTitle>
            </DialogHeader>
            {selectedAccount && (
              <form onSubmit={handleEditAccount} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name" className="text-sm font-semibold">
                    {t("accounts.accountName")}
                  </Label>
                  <Input
                    id="edit-name"
                    className="neobrutalism-input mt-1"
                    value={selectedAccount.name}
                    onChange={(e) => setSelectedAccount({ ...selectedAccount, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-color" className="text-sm font-semibold">
                    {t("common.color")}
                  </Label>
                  <Select
                    value={selectedAccount.color.replace("bg-", "").replace("-500", "")}
                    onValueChange={(value) => setSelectedAccount({ ...selectedAccount, color: `bg-${value}-500` })}
                  >
                    <SelectTrigger className="neobrutalism-input mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-savings"
                    checked={selectedAccount.isSavings}
                    onCheckedChange={(checked) => setSelectedAccount({ ...selectedAccount, isSavings: checked })}
                  />
                  <Label htmlFor="edit-savings" className="text-sm font-semibold">
                    {t("accounts.markAsSavings")}
                  </Label>
                </div>
                <Button type="submit" className="neobrutalism-button w-full bg-primary text-primary-foreground">
                  {t("common.saveChanges")}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
