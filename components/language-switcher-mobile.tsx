"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { languages } from "@/lib/i18n"

export function LanguageSwitcherMobile() {
  const { language, setLanguage, t } = useLanguage()

  const toggleLanguage = () => {
    const newLanguage = language === "id" ? "en" : "id"
    setLanguage(newLanguage)
  }

  const currentLanguage = languages.find((lang) => lang.code === language)
  const nextLanguage = languages.find((lang) => lang.code !== language)

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="neobrutalism-button bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
      title={`${t("settings.language")}: ${nextLanguage?.name}`}
    >
      <span className="mr-1">{currentLanguage?.flag}</span>
      <span className="text-xs">{currentLanguage?.code.toUpperCase()}</span>
    </Button>
  )
}
