"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ error?: string }>
  deleteAccount: () => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: "Terjadi kesalahan saat login" }
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: "Terjadi kesalahan saat mendaftar" }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: "Terjadi kesalahan saat mengubah password" }
    }
  }

  const deleteAccount = async () => {
    if (!user) return { error: "User tidak ditemukan" }

    try {
      const deletePromises = [
        supabase.from("transactions").delete().eq("user_id", user.id),
        supabase.from("debts").delete().eq("user_id", user.id),
        supabase.from("goals").delete().eq("user_id", user.id),
        supabase.from("platforms").delete().eq("user_id", user.id),
        supabase.from("categories").delete().eq("user_id", user.id),
        supabase.from("user_settings").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]

      await Promise.all(deletePromises)

      const { error } = await supabase.rpc("delete_user")

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: "Terjadi kesalahan saat menghapus akun" }
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    changePassword,
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
