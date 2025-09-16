"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Jangan lakukan apa-apa jika status auth masih loading
    if (loading) {
      return
    }

    const publicRoutes = ["/login", "/signup"]
    const isPublicRoute = publicRoutes.includes(pathname)

    // Jika pengguna tidak login DAN mencoba akses halaman privat, arahkan ke login
    if (!user && !isPublicRoute) {
      router.push("/login")
    }

    // Jika pengguna sudah login DAN mencoba akses halaman login/signup, arahkan ke dashboard
    if (user && isPublicRoute) {
      router.push("/")
    }
  }, [user, loading, pathname, router]) // Menggunakan pathname di dependency array lebih aman

  // Tampilkan loading spinner selagi memeriksa status otentikasi
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium">Memuat...</p>
        </div>
      </div>
    )
  }

  // Setelah loading selesai, selalu render konten halaman.
  // useEffect akan menangani pengalihan jika diperlukan.
  return <>{children}</>
}
