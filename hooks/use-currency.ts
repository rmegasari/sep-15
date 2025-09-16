"use client"

import { useLanguage } from "@/contexts/language-context"
import { formatCurrency } from "@/lib/i18n"

export function useCurrency() {
  const { language } = useLanguage()

  const formatAmount = (amount: number): string => {
    return formatCurrency(amount, language)
  }

  return { formatAmount }
}
