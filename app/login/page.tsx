"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Wallet, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { signIn } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError)
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
          <p className="text-muted-foreground">Kelola keuangan pribadi dengan mudah</p>
        </div>

        {/* Login Form */}
        <Card className="neobrutalism-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold font-manrope">Masuk ke Akun</CardTitle>
            <p className="text-sm text-muted-foreground">Silakan masuk untuk melanjutkan</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive/10 border-2 border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neobrutalism-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-2 border-black rounded" />
                  <span className="text-muted-foreground">Ingat saya</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="p-0 h-auto text-primary hover:bg-transparent hover:underline"
                >
                  Lupa password?
                </Button>
              </div>

              <Button
                type="submit"
                className="neobrutalism-button w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Masuk...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Masuk
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">© 2025 Brankas Pribadi. Semua hak dilindungi.</p>
        </div>
      </div>
    </div>
  )
}
