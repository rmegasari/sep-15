"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Edit, Trash2 } from "lucide-react"
import { AccountSelector } from "@/components/account-selector"
import { CategorySelector } from "@/components/category-selector"
import { TransferPreview } from "@/components/transfer-preview"
import { TransferService } from "@/lib/transfer-service"
import { transactionCategories } from "@/lib/data"
import type { Transaction, Account } from "@/types"

interface TransactionActionsProps {
  transaction: Transaction
  accounts: Account[]
  onUpdate: (updatedTransaction: Transaction, accountUpdates?: Account[]) => void
  onDelete: (transactionId: string, accountUpdates?: Account[]) => void
}

export function TransactionActions({ transaction, accounts, onUpdate, onDelete }: TransactionActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editData, setEditData] = useState({
    description: transaction.description,
    amount: Math.abs(transaction.amount).toString(),
    category: transaction.category,
    subcategory: transaction.subcategory || "",
    accountId: transaction.accountId,
    toAccountId: transaction.toAccountId || "",
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleEdit = () => {
    setEditData({
      description: transaction.description,
      amount: Math.abs(transaction.amount).toString(),
      category: transaction.category,
      subcategory: transaction.subcategory || "",
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId || "",
    })
    setIsEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const amount = Number.parseFloat(editData.amount)
    const originalAmount = transaction.amount
    const originalAccountId = transaction.accountId
    const originalToAccountId = transaction.toAccountId

    // Create updated transaction
    const updatedTransaction: Transaction = {
      ...transaction,
      description: editData.description,
      amount: transaction.type === "expense" ? -amount : amount,
      category: editData.category,
      subcategory: editData.subcategory,
      accountId: editData.accountId,
      toAccountId: editData.toAccountId || undefined,
    }

    // Handle account balance updates
    let updatedAccounts = [...accounts]

    if (transaction.type === "transfer") {
      // Revert original transfer
      updatedAccounts = updatedAccounts.map((account) => {
        if (account.id === originalAccountId) {
          return { ...account, balance: account.balance + Math.abs(originalAmount) }
        }
        if (account.id === originalToAccountId) {
          return { ...account, balance: account.balance - Math.abs(originalAmount) }
        }
        return account
      })

      // Apply new transfer
      if (editData.category === "Mutasi") {
        const transferRequest = {
          fromAccountId: editData.accountId,
          toAccountId: editData.toAccountId,
          amount: amount,
          description: editData.description,
          subcategory: editData.subcategory,
        }

        const result = TransferService.processTransfer(transferRequest, updatedAccounts, [])
        if (result.success && result.updatedAccounts) {
          updatedAccounts = result.updatedAccounts
        }
      }
    } else {
      // Revert original transaction
      updatedAccounts = updatedAccounts.map((account) => {
        if (account.id === originalAccountId) {
          return { ...account, balance: account.balance - originalAmount }
        }
        return account
      })

      // Apply new transaction
      updatedAccounts = updatedAccounts.map((account) => {
        if (account.id === editData.accountId) {
          return { ...account, balance: account.balance + updatedTransaction.amount }
        }
        return account
      })
    }

    onUpdate(updatedTransaction, updatedAccounts)
    setIsEditOpen(false)
  }

  const handleDelete = () => {
    let updatedAccounts = [...accounts]

    if (transaction.type === "transfer") {
      // Revert transfer
      updatedAccounts = updatedAccounts.map((account) => {
        if (account.id === transaction.accountId) {
          return { ...account, balance: account.balance + Math.abs(transaction.amount) }
        }
        if (account.id === transaction.toAccountId) {
          return { ...account, balance: account.balance - Math.abs(transaction.amount) }
        }
        return account
      })
    } else {
      // Revert regular transaction
      updatedAccounts = updatedAccounts.map((account) => {
        if (account.id === transaction.accountId) {
          return { ...account, balance: account.balance - transaction.amount }
        }
        return account
      })
    }

    onDelete(transaction.id, updatedAccounts)
    setIsDeleteOpen(false)
  }

  const handleCategoryChange = (category: string) => {
    const categoryData = transactionCategories.find((cat) => cat.name === category)
    setEditData({
      ...editData,
      category,
      subcategory: "",
    })
  }

  const handleSubcategoryChange = (subcategory: string) => {
    setEditData({ ...editData, subcategory })
  }

  const fromAccount = accounts.find((acc) => acc.id === editData.accountId)
  const toAccount = accounts.find((acc) => acc.id === editData.toAccountId)
  const transferAmount = Number.parseFloat(editData.amount) || 0

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleEdit} className="h-8 w-8 p-0 hover:bg-muted">
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDeleteOpen(true)}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="neobrutalism-card max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-manrope">Edit Transaksi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-description" className="text-sm font-semibold">
                Deskripsi
              </Label>
              <Input
                id="edit-description"
                className="neobrutalism-input mt-1"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-amount" className="text-sm font-semibold">
                Jumlah
              </Label>
              <Input
                id="edit-amount"
                type="number"
                className="neobrutalism-input mt-1"
                value={editData.amount}
                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                required
              />
            </div>

            <CategorySelector
              categories={transactionCategories}
              selectedCategory={editData.category}
              selectedSubcategory={editData.subcategory}
              onCategoryChange={handleCategoryChange}
              onSubcategoryChange={handleSubcategoryChange}
            />

            <div>
              <Label htmlFor="edit-account" className="text-sm font-semibold">
                {editData.category === "Mutasi" ? "Akun Asal" : "Akun"}
              </Label>
              <AccountSelector
                accounts={accounts}
                value={editData.accountId}
                onValueChange={(value) => setEditData({ ...editData, accountId: value })}
                placeholder="Pilih akun"
              />
            </div>

            {editData.category === "Mutasi" && (
              <div>
                <Label htmlFor="edit-toAccount" className="text-sm font-semibold">
                  Akun Tujuan
                </Label>
                <AccountSelector
                  accounts={accounts}
                  value={editData.toAccountId}
                  onValueChange={(value) => setEditData({ ...editData, toAccountId: value })}
                  placeholder="Pilih akun tujuan"
                  excludeAccountId={editData.accountId}
                />
              </div>
            )}

            {editData.category === "Mutasi" && fromAccount && toAccount && transferAmount > 0 && (
              <TransferPreview
                fromAccount={fromAccount}
                toAccount={toAccount}
                amount={transferAmount}
                subcategory={editData.subcategory}
              />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="neobrutalism-button flex-1 bg-transparent"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="neobrutalism-button flex-1 bg-primary text-primary-foreground"
                disabled={
                  !editData.category || !editData.accountId || (editData.category === "Mutasi" && !editData.toAccountId)
                }
              >
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="neobrutalism-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold font-manrope">Hapus Transaksi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi
              saldo akun.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-muted/50 border-2 border-black rounded-lg">
            <div className="space-y-2">
              <div className="font-semibold">{transaction.description}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString("id-ID")} • {transaction.category}
              </div>
              <div className="text-lg font-bold">{formatCurrency(Math.abs(transaction.amount))}</div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="neobrutalism-button bg-transparent">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="neobrutalism-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
