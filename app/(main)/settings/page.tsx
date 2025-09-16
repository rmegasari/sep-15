"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import { CategoryManager } from "@/components/category-manager"
import { Settings, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProfileService, type UserSettings } from "@/lib/profile-service"

export default function SettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [language, setLanguage] = useState("id")

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return

      setLoading(true)
      const settingsData = await ProfileService.getSettings(user.id)

      if (settingsData) {
        setSettings(settingsData)
        setLanguage(settingsData.language)
      }
      setLoading(false)
    }

    if (user) {
      loadSettings()
    }
  }, [user])

  const saveSettings = async () => {
    if (!user || !settings) return

    setSaving(true)
    const updatedSettings = await ProfileService.updateSettings(user.id, {
      language,
      payroll_date: settings.payroll_date,
      budget_warning_threshold: settings.budget_warning_threshold,
    })

    if (updatedSettings) {
      setSettings(updatedSettings)
      alert("Pengaturan berhasil disimpan!")
    } else {
      alert("Gagal menyimpan pengaturan.")
    }
    setSaving(false)
  }

  const updateSetting = (key: keyof UserSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Pengaturan</h1>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="px-6">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Simpan
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-8">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">Umum</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Bahasa</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Bahasa Indonesia</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Tema</Label>
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Financial Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">Keuangan</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Tanggal Gajian</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings?.payroll_date || 28}
                  onChange={(e) => updateSetting("payroll_date", Number.parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Peringatan Budget (%)</Label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={settings?.budget_warning_threshold || 80}
                  onChange={(e) => updateSetting("budget_warning_threshold", Number.parseInt(e.target.value) || 80)}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">Kategori</h2>
            <CategoryManager />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
