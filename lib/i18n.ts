import idTranslations from "./translations/id.json"
import enTranslations from "./translations/en.json"

export type Language = "id" | "en"

export type TranslationKey = keyof typeof idTranslations

export const translations = {
  id: idTranslations,
  en: enTranslations,
} as const

export const languages = [
  { code: "id" as const, name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "en" as const, name: "English", flag: "🇺🇸" },
]

export function getNestedTranslation(translations: any, key: string): string {
  return key.split(".").reduce((obj, k) => obj?.[k], translations) || key
}

export function formatCurrency(amount: number, language: Language): string {
  if (language === "id") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount / 15000) // Rough IDR to USD conversion for display
}

export function formatDate(date: Date, language: Language): string {
  if (language === "id") {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}
