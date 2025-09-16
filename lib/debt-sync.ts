import type { Debt } from "@/types"

// Function to get current debt items that should be used as subcategories
export function getDebtSubcategories(debts: Debt[]): string[] {
  const activeDebtNames = debts.filter((debt) => debt.isActive).map((debt) => debt.name)

  // Always include default debt subcategories
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

  // Combine active debt names with default subcategories, removing duplicates
  const allSubcategories = [...new Set([...activeDebtNames, ...defaultSubcategories])]

  return allSubcategories.sort()
}

// Function to update transaction categories with current debt subcategories
export function updateDebtSubcategories(debts: Debt[]) {
  return getDebtSubcategories(debts)
}
