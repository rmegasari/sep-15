"use client"

import React, { useEffect, useState } from "react"

import type { TransactionCategory } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ShoppingCart,
  Wifi,
  Fuel,
  Gamepad2,
  Coffee,
  Car,
  Heart,
  GraduationCap,
  Banknote,
  Briefcase,
  Gift,
  TrendingDown as TrendingUpDown,
  CreditCard,
  Landmark,
  Smartphone,
} from "lucide-react"

interface CategorySelectorProps {
  categories: TransactionCategory[]
  selectedCategory?: string
  selectedSubcategory?: string
  onCategoryChange: (category: string) => void
  onSubcategoryChange: (subcategory: string) => void
}

const categoryIcons = {
  Pengeluaran: TrendingDown,
  Pemasukan: TrendingUp,
  Mutasi: ArrowRightLeft,
  Hutang: CreditCard, // Added icon for Hutang category
}

const subcategoryIcons: Record<string, any> = {
  // Pengeluaran
  "Belanja Bulanan": ShoppingCart,
  Internet: Wifi,
  Bensin: Fuel,
  Hiburan: Gamepad2,
  "Makan & Minum": Coffee,
  Transport: Car,
  Kesehatan: Heart,
  Pendidikan: GraduationCap,

  // Pemasukan
  Gaji: Banknote,
  Freelance: Briefcase,
  Bonus: Gift,
  Investasi: TrendingUpDown,
  Hadiah: Gift,
  Lainnya: Banknote,

  // Mutasi
  "Transfer Antar Akun": CreditCard,
  "Tarik Tunai": Landmark,
  "Top Up": Smartphone,
  "Setor Tunai": Landmark,

  // Hutang
  "Kartu Kredit": CreditCard,
  "Pinjaman Bank": CreditCard,
  "Pinjaman Online": CreditCard,
  "Hutang Pribadi": CreditCard,
  "Cicilan Barang": CreditCard,
  "KTA (Kredit Tanpa Agunan)": CreditCard,
  Mortgage: CreditCard,
}

export function CategorySelector({
  categories,
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange,
}: CategorySelectorProps) {
  const [debtSubcategories, setDebtSubcategories] = useState<string[]>([])

  useEffect(() => {
    const loadDebtSubcategories = () => {
      try {
        const storedDebts = localStorage.getItem("debts")
        if (storedDebts) {
          const debts = JSON.parse(storedDebts)
          const activeDebtNames = debts.filter((debt: any) => debt.isActive).map((debt: any) => debt.name)

          // Default debt subcategories
          const defaultSubcategories = [
            "Kartu Kredit",
            "Pinjaman Bank",
            "Pinjaman Online",
            "Hutang Pribadi",
            "Cicilan Barang",
            "KTA (Kredit Tanpa Agunan)",
            "Mortgage",
            "Lainnya",
          ]

          // Combine active debt names with defaults, removing duplicates
          const allSubcategories = [...new Set([...activeDebtNames, ...defaultSubcategories])]
          setDebtSubcategories(allSubcategories.sort())
        }
      } catch (error) {
        console.error("Error loading debt subcategories:", error)
      }
    }

    loadDebtSubcategories()

    // Listen for storage changes to update subcategories when debts are modified
    const handleStorageChange = () => {
      loadDebtSubcategories()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const selectedCategoryData = categories.find((cat) => cat.name === selectedCategory)
  let subcategories = selectedCategoryData?.subcategories || []
  if (selectedCategory === "Hutang" && debtSubcategories.length > 0) {
    subcategories = debtSubcategories
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold mb-2 block">Kategori</label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="neobrutalism-input">
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => {
              const Icon = categoryIcons[category.name as keyof typeof categoryIcons]
              return (
                <SelectItem key={category.id} value={category.name}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{category.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        category.type === "income"
                          ? "border-secondary text-secondary"
                          : category.type === "expense"
                            ? "border-destructive text-destructive"
                            : "border-primary text-primary"
                      }`}
                    >
                      {category.subcategories.length} sub
                    </Badge>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {subcategories.length > 0 && (
        <div>
          <label className="text-sm font-semibold mb-2 block">Sub Kategori</label>
          <Select value={selectedSubcategory} onValueChange={onSubcategoryChange}>
            <SelectTrigger className="neobrutalism-input">
              <SelectValue placeholder="Pilih sub kategori" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((subcategory) => {
                const Icon = subcategoryIcons[subcategory]
                return (
                  <SelectItem key={subcategory} value={subcategory}>
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{subcategory}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedCategory && (
        <div className="p-3 bg-muted/50 border-2 border-black rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {categoryIcons[selectedCategory as keyof typeof categoryIcons] &&
              React.createElement(categoryIcons[selectedCategory as keyof typeof categoryIcons], {
                className: "h-4 w-4",
              })}
            <span className="font-semibold text-sm">{selectedCategory}</span>
          </div>
          {selectedSubcategory && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {subcategoryIcons[selectedSubcategory] &&
                React.createElement(subcategoryIcons[selectedSubcategory], { className: "h-3 w-3" })}
              <span>{selectedSubcategory}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
