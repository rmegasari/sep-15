"use client"

import { useLanguage } from "@/contexts/language-context"
import { formatDate } from "@/lib/i18n"

export function useDateFormat() {
  const { language } = useLanguage()

  const formatDateString = (date: Date): string => {
    return formatDate(date, language)
  }

  return { formatDateString }
}
