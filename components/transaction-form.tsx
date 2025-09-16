"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon } from "lucide-react";
import { AccountSelector } from "@/components/account-selector";
import { CategorySelector } from "@/components/category-selector";
import { TransferPreview } from "@/components/transfer-preview";
import type { Account, TransformedCategory as Category } from "@/types";

// Definisikan props yang diterima oleh komponen ini.
// Ini adalah semua hal yang dikembalikan oleh hook useTransactionForm.
interface TransactionFormProps {
  formData: any;
  accounts: Account[];
  categories: Category[];
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleValueChange: (id: string, value: string) => void;
  handleCategoryChange: (category: string) => void;
}

// Komponen ini hanya bertugas menampilkan UI, tanpa logika internal.
export function TransactionForm({
  formData,
  accounts,
  categories,
  handleSubmit,
  handleFormChange,
  handleValueChange,
  handleCategoryChange,
}: TransactionFormProps) {

  const fromAccountForPreview = accounts.find((acc) => String(acc.id) === String(formData.accountId));
  const toAccountForPreview = accounts.find((acc) => String(acc.id) === String(formData.toAccountId));
  const transferAmount = Number.parseFloat(formData.amount) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="date" className="text-sm font-semibold">Tanggal</Label>
        <Input id="date" type="date" className="neobrutalism-input mt-1" value={formData.date} onChange={handleFormChange} required />
      </div>
      <div>
        <Label className="text-sm font-semibold">Kategori & Sub Kategori</Label>
        <CategorySelector 
          categories={categories} 
          selectedCategory={formData.category} 
          selectedSubcategory={formData.subcategory} 
          onCategoryChange={handleCategoryChange} 
          onSubcategoryChange={(value) => handleValueChange("subcategory", value)}
        />
      </div>
      <div>
        <Label htmlFor="description" className="text-sm font-semibold">Deskripsi</Label>
        <Input id="description" className="neobrutalism-input mt-1" value={formData.description} onChange={handleFormChange} placeholder="Masukkan deskripsi transaksi" required />
      </div>
      <div>
        <Label htmlFor="amount" className="text-sm font-semibold">Jumlah</Label>
        <Input id="amount" type="number" className="neobrutalism-input mt-1" value={formData.amount} onChange={handleFormChange} placeholder="0" required />
      </div>
      <div>
        <Label htmlFor="account" className="text-sm font-semibold">{formData.category === "Mutasi" ? "Akun Asal" : "Akun"}</Label>
        <AccountSelector accounts={accounts} value={formData.accountId} onValueChange={(value) => handleValueChange("accountId", value)} placeholder="Pilih akun" />
      </div>
      {formData.category === "Mutasi" && formData.subcategory !== "Tarik Tunai dari" && (
        <div>
          <Label htmlFor="toAccount" className="text-sm font-semibold">Akun Tujuan</Label>
          <AccountSelector accounts={accounts} value={formData.toAccountId} onValueChange={(value) => handleValueChange("toAccountId", value)} placeholder="Pilih akun tujuan" excludeAccountId={formData.accountId} />
        </div>
      )}
      {formData.category === "Mutasi" && fromAccountForPreview && toAccountForPreview && transferAmount > 0 && (
        <TransferPreview fromAccount={fromAccountForPreview} toAccount={toAccountForPreview} amount={transferAmount} subcategory={formData.subcategory} />
      )}
      <div>
        <Label htmlFor="receiptFile" className="text-sm font-semibold">Bukti Transaksi (Opsional)</Label>
        <div className="mt-1">
          <Input id="receiptFile" name="receiptFile" type="file" accept="image/*" className="neobrutalism-input" onChange={handleFormChange} />
          {formData.receiptFile && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>{formData.receiptFile.name}</span>
            </div>
          )}
        </div>
      </div>
      <Button type="submit" className="neobrutalism-button w-full bg-[#00A86B] text-white" disabled={!formData.category || !formData.accountId || (formData.category === "Mutasi" && formData.subcategory !== "Tarik Tunai dari" && !formData.toAccountId)}>
        Simpan Transaksi
      </Button>
    </form>
  );
}
