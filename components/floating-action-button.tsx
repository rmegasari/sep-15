"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { TransformedCategory } from "@/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ImageIcon } from "lucide-react"
import { AccountSelector } from "@/components/account-selector"
import { CategorySelector } from "@/components/category-selector"
import { TransferPreview } from "@/components/transfer-preview"
import { HelpTooltip } from "@/components/help-tooltip"
import { useTranslation } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { DatabaseService } from "@/lib/database"
import type { Account, Category, Debt } from "@/types"

interface FloatingActionButtonProps {
  onTransactionAdded: () => void
}

function transformCategories(rawCategories: Category[], debts: Debt[]): TransformedCategory[] {
  const grouped = new Map<string, TransformedCategory>()
  rawCategories.forEach((item) => {
    if (item.category === "Mutasi" || item.category === "Bayar Hutang") return

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
  const specialCategories: TransformedCategory[] = []

  specialCategories.push({
    id: "Mutasi",
    name: "Mutasi",
    type: "transfer",
    subcategories: ["Alokasi saldo ke", "Tarik Tunai dari"],
  })

  if (debts && debts.length > 0) {
    specialCategories.push({
      id: "Bayar Hutang",
      name: "Bayar Hutang",
      type: "expense",
      subcategories: debts.map((debt) => debt.name),
    })
  }

  return [...databaseCategories, ...specialCategories].sort((a, b) => a.name.localeCompare(b.name))
}

export function FloatingActionButton({ onTransactionAdded }: FloatingActionButtonProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<TransformedCategory[]>([])
  const [loading, setLoading] = useState(true)

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

  const fetchData = async () => {
    if (!user) return

    try {
      const [platformData, rawCategoryData, debtData] = await Promise.all([
        DatabaseService.getPlatforms(user.id),
        DatabaseService.getCategories(user.id),
        DatabaseService.getDebts(user.id),
      ])

      const structuredCategories = transformCategories(rawCategoryData, debtData)

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

      setCategories(structuredCategories)
    } catch (err) {
      console.error("Error fetching data:", err)
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
    const handleDataRefresh = () => {
      fetchData() // Refresh floating button data when global refresh occurs
    }

    window.addEventListener("dataRefresh", handleDataRefresh)

    return () => {
      window.removeEventListener("dataRefresh", handleDataRefresh)
    }
  }, [user])

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

    onTransactionAdded()
    window.dispatchEvent(new CustomEvent("transactionAdded"))
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

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full neobrutalism-button bg-[#00A86B] text-white hover:bg-[#008A5A] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-75"
        size="icon"
      >
        <Plus className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="neobrutalism-card w-[95vw] sm:w-[90vw] max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-auto p-4 sm:p-6">
          <DialogHeader className="pb-2 sm:pb-4">
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
                className="neobrutalism-input mt-1 text-sm h-10 sm:h-11"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm font-semibold">
                {t("transactions.category")} & {t("transactions.subcategory")}
              </Label>
              <div className="mt-1">
                <CategorySelector
                  categories={categories}
                  selectedCategory={formData.category}
                  selectedSubcategory={formData.subcategory}
                  onCategoryChange={handleCategoryChange}
                  onSubcategoryChange={handleSubcategoryChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-xs sm:text-sm font-semibold">
                {t("transactions.description")}
              </Label>
              <Input
                id="description"
                className="neobrutalism-input mt-1 text-sm h-10 sm:h-11"
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
                inputMode="decimal"
                className="neobrutalism-input mt-1 text-sm h-10 sm:h-11"
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
              <div className="mt-1">
                <AccountSelector
                  accounts={accounts}
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                  placeholder={t("transactions.account")}
                />
              </div>
            </div>

            {formData.category === "Mutasi" && formData.subcategory !== "Tarik Tunai dari" && (
              <div>
                <Label htmlFor="toAccount" className="text-xs sm:text-sm font-semibold">
                  Akun Tujuan
                </Label>
                <div className="mt-1">
                  <AccountSelector
                    accounts={accounts}
                    value={formData.toAccountId}
                    onValueChange={(value) => setFormData({ ...formData, toAccountId: value })}
                    placeholder="Pilih akun tujuan"
                    excludeAccountId={formData.accountId}
                  />
                </div>
              </div>
            )}

            {formData.category === "Mutasi" && fromAccountForPreview && toAccountForPreview && transferAmount > 0 && (
              <div className="mt-2">
                <TransferPreview
                  fromAccount={fromAccountForPreview}
                  toAccount={toAccountForPreview}
                  amount={transferAmount}
                  subcategory={formData.subcategory}
                />
              </div>
            )}
            <div>
              <Label htmlFor="receipt" className="text-xs sm:text-sm font-semibold">
                Bukti Transaksi (Opsional)
              </Label>
              <div className="mt-1">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  className="neobrutalism-input text-sm h-10 sm:h-11 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-muted-foreground"
                  onChange={handleReceiptChange}
                />
                {formData.receiptFile && (
                  <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground p-2 bg-muted rounded">
                    <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{formData.receiptFile.name}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              type="submit"
              className="neobrutalism-button w-full bg-[#00A86B] text-white text-sm sm:text-base py-3 sm:py-4 mt-4 sm:mt-6"
              disabled={
                !formData.category ||
                !formData.accountId ||
                (formData.category === "Mutasi" && formData.subcategory !== "Tarik Tunai dari" && !formData.toAccountId)
              }
            >
              {t("common.save")} {t("transactions.title")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
