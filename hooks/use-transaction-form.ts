"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useDataStore } from "@/store/data-store"
import { DatabaseService } from "@/lib/database"

// Hook ini akan mengelola semua state dan logika untuk form tambah transaksi
export function useTransactionForm(onSuccess: () => void) {
  const { user } = useAuth()
  const { accounts, categories, debts, fetchData, loading } = useDataStore()

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

  const resetForm = () => {
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, files } = e.target
    if (files) {
      setFormData((prev) => ({ ...prev, [id]: files[0] || null }))
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handleValueChange = (id: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleCategoryChange = (category: string) => {
    const categoryData = categories.find((cat) => cat.name === category)
    setFormData((prev) => ({ ...prev, category, subcategory: "", type: categoryData?.type || "expense" }))
  }

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

    let subId: number | null = null

    if (formData.category === "Pemasukan" || formData.category === "Pengeluaran") {
      // Find subcategory ID from categories table
      const categoryData = await DatabaseService.getCategories(user.id)
      const subcategoryItem = categoryData.find(
        (cat) => cat.category === formData.category && cat.sub_category === formData.subcategory,
      )
      subId = subcategoryItem?.id || null
    } else if (formData.category === "Bayar Hutang") {
      // Find debt ID from debts table
      const debtItem = debts.find((debt) => debt.name === formData.subcategory)
      subId = debtItem?.id || null
    }
    // For "Mutasi", subId remains null

    let destinationAccountId: number | null = null
    if (formData.category === "Mutasi") {
      if (formData.subcategory === "Tarik Tunai dari") {
        const cashAccount = accounts.find((acc) => acc.type === "Cash")
        if (!cashAccount) {
          alert("Akun dengan tipe 'Cash' tidak ditemukan. Mohon buat akun CASH terlebih dahulu.")
          return
        }
        destinationAccountId = cashAccount.id
      } else {
        destinationAccountId = Number(formData.toAccountId) || null
      }
    }

    const transactionData = {
      date: formData.date,
      description: formData.description,
      category: formData.category,
      sub_id: subId,
      nominal: amount,
      account_id: fromAccount.id,
      destination_account_id: destinationAccountId,
      receipt_url: null,
      user_id: user.id,
    }

    const result = await DatabaseService.addTransaction(transactionData, user.id)
    if (!result) {
      alert("Gagal menyimpan transaksi.")
      return
    }

    // Update Saldo Akun
    const balanceChange = formData.type === "expense" ? -amount : amount
    const newFromBalance = fromAccount.balance + balanceChange
    await DatabaseService.updatePlatform(fromAccount.id, { saldo: newFromBalance }, user.id)

    if (formData.category === "Mutasi" && destinationAccountId) {
      const toAccount = accounts.find((acc) => acc.id === destinationAccountId)
      if (toAccount) {
        const newToBalance = toAccount.balance + amount
        await DatabaseService.updatePlatform(toAccount.id, { saldo: newToBalance }, user.id)
      }
    }

    // Panggil fetchData dari store untuk refresh data global
    fetchData(user.id)

    // Panggil callback onSuccess (misalnya untuk menutup dialog)
    onSuccess()

    // Reset form untuk input berikutnya
    resetForm()
  }

  return {
    formData,
    accounts,
    categories,
    debts, // Added debts to return for debt payment options
    handleSubmit,
    handleFormChange,
    handleValueChange,
    handleCategoryChange,
    loading,
  }
}
