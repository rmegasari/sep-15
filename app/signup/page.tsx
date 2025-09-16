"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Wallet, ArrowRight, User, Mail, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Nama lengkap harus diisi")
      return false
    }
    if (!formData.email.trim()) {
      setError("Email harus diisi")
      return false
    }
    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Konfirmasi password tidak cocok")
      return false
    }
    if (!acceptTerms) {
      setError("Anda harus menyetujui syarat dan ketentuan")
      return false
    }
    return true
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) return

    setIsLoading(true)

    const { error: signUpError } = await signUp(formData.email, formData.password, formData.name)

    if (signUpError) {
      setError(signUpError)
    } else {
      router.push("/")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Wallet className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground font-manrope mb-2">Brankas Pribadi</h1>
          <p className="text-sm text-muted-foreground">Mulai kelola keuangan pribadi Anda</p>
        </div>

        {/* Signup Form */}
        <Card className="neobrutalism-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold font-manrope">Buat Akun Baru</CardTitle>
            <p className="text-sm text-muted-foreground">Daftar untuk memulai perjalanan finansial Anda</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive/10 border-2 border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nama Lengkap
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="neobrutalism-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="neobrutalism-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="neobrutalism-input pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Konfirmasi Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="neobrutalism-input pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 border-2 border-black rounded mt-1"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                  Saya menyetujui{" "}
                  <Button
                    type="button"
                    variant="ghost"
                    className="p-0 h-auto text-primary hover:bg-transparent hover:underline"
                  >
                    Syarat dan Ketentuan
                  </Button>{" "}
                  serta{" "}
                  <Button
                    type="button"
                    variant="ghost"
                    className="p-0 h-auto text-primary hover:bg-transparent hover:underline"
                  >
                    Kebijakan Privasi
                  </Button>
                </Label>
              </div>

              <Button
                type="submit"
                className="neobrutalism-button w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Mendaftar...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Daftar Sekarang
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">© 2024 Brankas Pribadi. Semua hak dilindungi.</p>
        </div>
      </div>
    </div>
  )
}
