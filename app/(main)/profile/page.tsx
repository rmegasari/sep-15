"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ProfileService, type UserProfile, type UserSettings } from "@/lib/profile-service"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Save, User, Mail, Phone, MapPin, Calendar, Loader2, ImageIcon, Trash2, Key } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function ProfilePage() {
  const { user, changePassword, deleteAccount, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const { t } = useTranslation()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const { setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [avatarKey, setAvatarKey] = useState(Date.now()) // State untuk memaksa refresh gambar

  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    location: "",
    birth_date: "",
    language: "id",
    theme: "blue",
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return
      setLoading(true)
      const [profileData, settingsData] = await Promise.all([
        ProfileService.getOrCreateProfile(user.id, user.email || undefined),
        ProfileService.getSettings(user.id),
      ])

      if (profileData) {
        setProfile(profileData)
        setFormData((prev) => ({
          ...prev,
          full_name: profileData.full_name || "",
          phone_number: profileData.phone_number || "",
          location: profileData.location || "",
          birth_date: profileData.birth_date || "",
        }))
      }
      if (settingsData) {
        setSettings(settingsData)
        setFormData((prev) => ({
          ...prev,
          language: settingsData.language || "id",
          theme: settingsData.theme || "light",
        }))
      }
      setLoading(false)
    }

    if (user) loadUserData()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const profileUpdates = {
      full_name: formData.full_name,
      phone_number: formData.phone_number,
      location: formData.location,
      birth_date: formData.birth_date,
    }
    const settingsUpdates = {
      language: formData.language,
      theme: formData.theme,
    }

    const [updatedProfile, updatedSettings] = await Promise.all([
      ProfileService.updateProfile(user.id, profileUpdates),
      ProfileService.updateSettings(user.id, settingsUpdates),
    ])

    if (updatedProfile) setProfile(updatedProfile)
    if (updatedSettings) {
      setSettings(updatedSettings)
      setTheme(updatedSettings.theme as any)
    }

    setIsEditing(false)
    setSaving(false)
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return
    setSaving(true)

    const newAvatarUrl = await ProfileService.uploadAvatar(user.id, file)

    if (newAvatarUrl) {
      const currentUploaded = profile.uploaded_avatars || []
      const newUploadedAvatars = [newAvatarUrl, ...currentUploaded.filter((url) => url !== newAvatarUrl)]

      const updates = {
        avatar_url: newAvatarUrl,
        uploaded_avatars: newUploadedAvatars,
      }

      const updatedProfile = await ProfileService.updateProfile(user.id, updates)
      if (updatedProfile) {
        setProfile(updatedProfile)
        setAvatarKey(Date.now())
      }
    }
    setSaving(false)
    setShowAvatarDialog(false)
  }

  const handleExistingAvatarSelect = async (avatarUrl: string) => {
    if (!user) return
    setSaving(true)

    const updatedProfile = await ProfileService.updateProfile(user.id, { avatar_url: avatarUrl })
    if (updatedProfile) {
      setProfile(updatedProfile)
      setAvatarKey(Date.now())
    }
    setSaving(false)
    setShowAvatarDialog(false)
  }

  const handleChangePassword = async () => {
    if (!user) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Password baru dan konfirmasi password tidak cocok!")
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert("Password baru harus minimal 6 karakter!")
      return
    }

    setSaving(true)

    const { error } = await changePassword(passwordData.newPassword)

    if (error) {
      alert(`Gagal mengubah password: ${error}`)
    } else {
      alert("Password berhasil diubah!")
      setShowPasswordDialog(false)
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    }

    setSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    if (deleteConfirmText !== "HAPUS AKUN SAYA") {
      alert("Ketik 'HAPUS AKUN SAYA' untuk konfirmasi penghapusan")
      return
    }

    setSaving(true)

    const { error } = await deleteAccount()

    if (error) {
      alert(`Gagal menghapus akun: ${error}`)
    } else {
      alert("Akun berhasil dihapus. Anda akan dialihkan ke halaman login.")
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground font-manrope mb-2">{t("profile.title")}</h1>
            <p className="text-muted-foreground">{t("profile.manageYourInfo")}</p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="neobrutalism-button bg-transparent"
                  disabled={saving}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  className="neobrutalism-button bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t("common.saveChanges")}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="neobrutalism-button bg-transparent"
                disabled={saving}
              >
                {t("common.edit")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="neobrutalism-card lg:col-span-1">
            <CardHeader className="text-center">
              <div className="relative mx-auto w-24 h-24 mb-4">
                <Avatar className="w-24 h-24 border-2 border-black">
                  <AvatarImage
                    key={avatarKey}
                    src={profile?.avatar_url || "/placeholder.svg"}
                    alt={profile?.full_name || "User"}
                  />
                  <AvatarFallback>{(profile?.full_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                  <DialogTrigger asChild>
                    <button className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full border-2 border-black">
                      <Camera className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="neobrutalism-card">
                    <DialogHeader>
                      <DialogTitle>{t("profile.selectAvatar")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold">{t("profile.uploadNewAvatar")}</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          className="neobrutalism-input mt-2"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleAvatarUpload(file)
                          }}
                        />
                      </div>

                      {(profile?.uploaded_avatars || []).length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold mb-3 block">{t("profile.previousAvatars")}</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {(profile?.uploaded_avatars || []).map((avatarUrl, index) => (
                              <button
                                key={index}
                                onClick={() => handleExistingAvatarSelect(avatarUrl)}
                                className="p-2 border-2 border-black hover:bg-muted transition-colors"
                              >
                                <Avatar className="w-16 h-16">
                                  <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={`Avatar ${index + 1}`} />
                                  <AvatarFallback>
                                    <ImageIcon />
                                  </AvatarFallback>
                                </Avatar>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-semibold mb-3 block">{t("profile.defaultAvatars")}</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {ProfileService.getDefaultAvatars().map((avatarUrl, index) => (
                            <button
                              key={index}
                              onClick={() => handleExistingAvatarSelect(avatarUrl)}
                              className="p-2 border-2 border-black hover:bg-muted transition-colors"
                            >
                              <Avatar className="w-16 h-16">
                                <AvatarImage
                                  src={avatarUrl || "/placeholder.svg"}
                                  alt={`Avatar default ${index + 1}`}
                                />
                                <AvatarFallback>
                                  <ImageIcon />
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <CardTitle>{profile?.full_name || "User"}</CardTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </CardHeader>
            <CardContent>
              <div className="mb-6 pb-6 border-b-2 border-black">
                <Button
                  onClick={async () => {
                    if (confirm("Apakah Anda yakin ingin keluar?")) {
                      await signOut()
                    }
                  }}
                  variant="outline"
                  className="neobrutalism-button bg-transparent text-red-600 border-red-200 hover:bg-red-50 w-full"
                >
                  Keluar
                </Button>
              </div>
              <div className="mt-6 pt-6 border-t-2 border-black">
                <h3 className="text-lg font-bold font-manrope mb-4">{t("profile.dangerZone")}</h3>
                <div className="space-y-3">
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="neobrutalism-button bg-transparent text-primary border-primary hover:bg-primary hover:text-primary-foreground w-full"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {t("profile.changePassword")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="neobrutalism-card">
                      <DialogHeader>
                        <DialogTitle>Ubah Password</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">Password Baru</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                            className="neobrutalism-input"
                            placeholder="Masukkan password baru"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            className="neobrutalism-input"
                            placeholder="Konfirmasi password baru"
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={() => setShowPasswordDialog(false)}
                            variant="outline"
                            className="neobrutalism-button bg-transparent flex-1"
                            disabled={saving}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleChangePassword}
                            className="neobrutalism-button bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Key className="h-4 w-4 mr-2" />
                            )}
                            Ubah Password
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="neobrutalism-button bg-transparent text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("profile.deleteAccount")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="neobrutalism-card">
                      <DialogHeader>
                        <DialogTitle className="text-destructive">Hapus Akun Permanen</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-destructive/10 border-2 border-destructive rounded">
                          <p className="text-sm text-destructive font-semibold">
                            ⚠️ PERINGATAN: Tindakan ini tidak dapat dibatalkan!
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Semua data Anda akan dihapus secara permanen, termasuk:
                          </p>
                          <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                            <li>Semua transaksi dan riwayat keuangan</li>
                            <li>Data hutang dan tujuan tabungan</li>
                            <li>Pengaturan dan preferensi akun</li>
                            <li>Data profil dan avatar</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deleteConfirm">
                            Ketik <strong>"HAPUS AKUN SAYA"</strong> untuk konfirmasi:
                          </Label>
                          <Input
                            id="deleteConfirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="neobrutalism-input"
                            placeholder="HAPUS AKUN SAYA"
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={() => {
                              setShowDeleteDialog(false)
                              setDeleteConfirmText("")
                            }}
                            variant="outline"
                            className="neobrutalism-button bg-transparent flex-1"
                            disabled={saving}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleDeleteAccount}
                            variant="destructive"
                            className="neobrutalism-button bg-destructive hover:bg-destructive/90 text-destructive-foreground flex-1"
                            disabled={saving || deleteConfirmText !== "HAPUS AKUN SAYA"}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Hapus Akun
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card className="neobrutalism-card">
              <CardHeader>
                <CardTitle>{t("profile.personalInfo")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("profile.fullName")}
                    </Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                      className="neobrutalism-input"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("profile.emailAddress")}
                    </Label>
                    <Input id="email" type="email" value={user?.email || ""} className="neobrutalism-input" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number" className="text-sm font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t("profile.phoneNumber")}
                    </Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                      className="neobrutalism-input"
                      placeholder="Belum diisi"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t("profile.location")}
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                      className="neobrutalism-input"
                      placeholder="Belum diisi"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="birth_date" className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("profile.birthDate")}
                    </Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, birth_date: e.target.value }))}
                      className="neobrutalism-input"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="neobrutalism-card">
              <CardHeader>
                <CardTitle>{t("profile.preferences")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("common.language")}</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="neobrutalism-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("profile.theme")}</Label>
                    <Select
                      value={formData.theme}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, theme: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="neobrutalism-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light Mode</SelectItem>
                        <SelectItem value="dark">Dark Mode</SelectItem>
                        <SelectItem value="pink">Pink Theme</SelectItem>
                        <SelectItem value="blue">Blue Theme</SelectItem>
                        <SelectItem value="green">Green Theme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
