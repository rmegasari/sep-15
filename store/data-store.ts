"use client"

import { create } from "zustand"
import { DatabaseService } from "@/lib/database"
import type { Account, Category, Debt, Transaction, TransformedCategory } from "@/types"

// PINDAHKAN FUNGSI INI KE SINI
function transformCategories(rawCategories: Category[], debts: Debt[]): TransformedCategory[] {
  const grouped = new Map<string, TransformedCategory>()
  ;(rawCategories || []).forEach((item) => {
    if (item.category === "Mutasi" || item.category === "Bayar Hutang") return
    let type: "income" | "expense" | "transfer" | "debt" = "expense"
    if (item.category === "Pemasukan") type = "income"
    if (item.category === "Hutang") type = "debt"

    if (!grouped.has(item.category)) {
      grouped.set(item.category, { id: item.category, name: item.category, type, subcategories: [] })
    }
    if (item.sub_category) {
      grouped.get(item.category)!.subcategories.push(item.sub_category)
    }
  })

  const databaseCategories = Array.from(grouped.values())
  const specialCategories: TransformedCategory[] = [
    { id: "Mutasi", name: "Mutasi", type: "transfer", subcategories: ["Alokasi saldo ke", "Tarik Tunai dari"] },
  ]

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

// Definisikan bentuk state dan aksi store kita
interface DataState {
  accounts: Account[]
  categories: TransformedCategory[]
  transactions: Transaction[]
  debts: Debt[]
  loading: boolean
  fetchData: (userId: string) => Promise<void>
}

export const useDataStore = create<DataState>((set, get) => ({
  accounts: [],
  categories: [],
  transactions: [],
  debts: [],
  loading: true,

  fetchData: async (userId) => {
    set({ loading: true })
    try {
      // Ambil semua data sekaligus
      const [platformData, rawCategoryData, debtData, transactionData] = await Promise.all([
        DatabaseService.getPlatforms(userId),
        DatabaseService.getCategories(userId),
        DatabaseService.getDebts(userId),
        DatabaseService.getTransactions(userId),
      ])

      const transformedAccounts = platformData.map((p) => ({
        id: p.id,
        name: p.account,
        type: p.type_account,
        balance: p.saldo,
        isSavings: p.saving,
        color: `bg-${p.color}-500`,
      }))

      const transformedCats = transformCategories(rawCategoryData, debtData)

      const transformedTransactions = transactionData.map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        category: tx.category,
        subcategory: tx.sub_id ? getSubcategoryName(tx.sub_id, tx.category, rawCategoryData, debtData) : "",
        amount: tx.nominal,
        type: tx.category === "Pemasukan" ? "income" : tx.category === "Mutasi" ? "transfer" : "expense",
        accountId: tx.account_id ? getAccountName(tx.account_id, platformData) : "",
        toAccountId: tx.destination_account_id ? getAccountName(tx.destination_account_id, platformData) : "",
        receiptUrl: tx.receipt_url,
        struck: tx.struck || false,
      }))

      set({
        accounts: transformedAccounts,
        categories: transformedCats,
        debts: debtData,
        transactions: transformedTransactions,
      })
    } catch (error) {
      console.error("Gagal mengambil data untuk store:", error)
    } finally {
      set({ loading: false })
    }
  },
}))

function getSubcategoryName(subId: number, category: string, categories: Category[], debts: Debt[]): string {
  if (category === "Pemasukan" || category === "Pengeluaran") {
    const categoryItem = categories.find((cat) => cat.id === subId)
    return categoryItem?.sub_category || ""
  } else if (category === "Bayar Hutang") {
    const debtItem = debts.find((debt) => debt.id === subId)
    return debtItem?.name || ""
  }
  return ""
}

function getAccountName(accountId: number, platforms: any[]): string {
  const platform = platforms.find((p) => p.id === accountId)
  return platform?.account || ""
}
