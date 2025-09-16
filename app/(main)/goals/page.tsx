"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/contexts/language-context"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Plus, Target, Home, Car, Plane, GraduationCap, Heart, Edit, Trash2, Loader2 } from "lucide-react"
import type { SavingsGoal, Account } from "@/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export default function GoalsPage() {
  const { user } = useAuth()
  // State untuk data dari Supabase
  const [accounts, setAccounts] = useState<Account[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State untuk form
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    deadline: "",
    description: "",
  })

  // Fetch data saat komponen dimuat
  const fetchData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at")
      if (goalsError) throw goalsError

      const { data: platformData, error: platformError } = await supabase
        .from("platforms")
        .select("*")
        .eq("user_id", user.id)
      if (platformError) throw platformError

      setAccounts(
        platformData.map((p) => ({
          id: p.id,
          name: p.account,
          type: p.type_account,
          balance: p.saldo,
          isSavings: p.saving,
          color: `bg-${p.color}-500`,
        })) || [],
      )

      setGoals(
        goalsData.map((g) => ({
          id: g.id,
          name: g.goal,
          targetAmount: g.target,
          currentAmount: 0, // Akan dihitung nanti
          deadline: g.deadline,
          description: g.description,
          isActive: true, // Asumsi semua aktif
          createdAt: g.created_at,
        })) || [],
      )
    } catch (err) {
      console.error("Error fetching goals data:", err)
      setError("Gagal memuat data tujuan tabungan.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleTransactionAdded = () => {
      fetchData() // Refresh data when transaction is added
    }

    const handleDataRefresh = () => {
      fetchData() // Refresh data on general refresh
    }

    window.addEventListener("transactionAdded", handleTransactionAdded)
    window.addEventListener("dataRefresh", handleDataRefresh)

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionAdded)
      window.removeEventListener("dataRefresh", handleDataRefresh)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [user])

  const totalSavingsBalance = accounts
    .filter((account) => account.isSavings)
    .reduce((sum, account) => sum + account.balance, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getGoalIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes("rumah")) return Home
    if (lowerName.includes("mobil")) return Car
    if (lowerName.includes("liburan") || lowerName.includes("travel")) return Plane
    if (lowerName.includes("pendidikan") || lowerName.includes("kuliah")) return GraduationCap
    if (lowerName.includes("kesehatan")) return Heart
    return Target
  }

  const handleSubmit = async () => {
    if (!newGoal.name || !newGoal.targetAmount || !user) {
      alert("Nama Tujuan dan Target Jumlah wajib diisi.")
      return
    }

    const goalData = {
      goal: newGoal.name,
      target: Number.parseInt(newGoal.targetAmount),
      deadline: newGoal.deadline || null,
      description: newGoal.description || null,
      user_id: user.id, // Added user_id to goal data
    }

    if (editingGoal) {
      // Update goal
      const { error } = await supabase.from("goals").update(goalData).eq("id", editingGoal.id).eq("user_id", user.id)
      if (error) {
        console.error("Error updating goal:", error)
        alert("Gagal memperbarui tujuan.")
      } else {
        await fetchData()
        window.dispatchEvent(new CustomEvent("dataRefresh"))
      }
    } else {
      // Add new goal
      const { data, error } = await supabase.from("goals").insert([goalData]).select().single()
      if (error) {
        console.error("Error adding goal:", error)
        alert("Gagal menambahkan tujuan.")
      } else {
        await fetchData()
        window.dispatchEvent(new CustomEvent("dataRefresh"))
      }
    }

    setNewGoal({ name: "", targetAmount: "", deadline: "", description: "" })
    setShowAddForm(false)
    setEditingGoal(null)
  }

  const handleDelete = async (goalId: string) => {
    if (!user) return

    if (window.confirm(t("goals.confirmDelete"))) {
      const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id)
      if (error) {
        console.error("Error deleting goal:", error)
        alert("Gagal menghapus tujuan.")
      } else {
        await fetchData()
        window.dispatchEvent(new CustomEvent("dataRefresh"))
      }
    }
  }

  const startEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal)
    setNewGoal({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline || "",
      description: goal.description || "",
    })
    setShowAddForm(true)
  }

  const calculateProgress = (targetAmount: number) => {
    if (targetAmount === 0) return 0
    return Math.min((totalSavingsBalance / targetAmount) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-20 text-destructive">{error}</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8" />
          <h1 className="text-3xl font-bold font-manrope">{t("goals.title")}</h1>
        </div>
        <Button
          onClick={() => {
            setEditingGoal(null)
            setShowAddForm(true)
          }}
          className="bg-black hover:bg-gray-800 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-75 font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("goals.addGoal")}
        </Button>
      </div>

      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-black text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t("goals.totalSavingsBalance")}</h3>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSavingsBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">
                {t("common.for")} {goals.length} {t("goals.title")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Goal Form */}
      {showAddForm && (
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black bg-black text-white">
            <CardTitle>{editingGoal ? t("goals.editGoal") : t("goals.addNewGoal")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goalName">{t("goals.goalName")}</Label>
                <Input
                  id="goalName"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={`${t("common.exp")}: Rumah Impian`}
                  className="border-2 border-black focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <Label htmlFor="targetAmount">{t("goals.targetAmount")} (IDR)</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal((prev) => ({ ...prev, targetAmount: e.target.value }))}
                  placeholder="500000000"
                  className="border-2 border-black focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <Label htmlFor="deadline">{t("goals.dueDate")} (Opsional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal((prev) => ({ ...prev, deadline: e.target.value }))}
                  className="border-2 border-black focus:ring-black focus:border-black"
                />
              </div>
              <div>
                <Label htmlFor="description">{t("common.descriptions")} (Opsional)</Label>
                <Input
                  id="description"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi singkat"
                  className="border-2 border-black focus:ring-black focus:border-black"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleSubmit}
                className="bg-black hover:bg-gray-800 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-75"
              >
                {editingGoal ? "Update" : "Simpan"}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingGoal(null)
                  setNewGoal({ name: "", targetAmount: "", deadline: "", description: "" })
                }}
                variant="outline"
                className="border-2 border-black hover:bg-gray-50"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const Icon = getGoalIcon(goal.name)
          const progress = calculateProgress(goal.targetAmount)
          const remaining = goal.targetAmount - totalSavingsBalance

          return (
            <Card
              key={goal.id}
              className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-75"
            >
              <CardHeader className="border-b-2 border-black bg-white">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-black" />
                    <span className="text-lg">{goal.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(goal)}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(goal.id)}
                      className="h-8 w-8 p-0 hover:bg-gray-100 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-bold">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-3 border border-black" />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Target:</span>
                      <span className="font-bold text-foreground">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("goals.collectedFunds")}:</span>
                      <span className="font-bold text-black text-foreground">
                        {formatCurrency(totalSavingsBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("goals.remaining")}:</span>
                      <span className="font-bold text-gray-600 text-foreground">
                        {formatCurrency(Math.max(0, remaining))}
                      </span>
                    </div>
                    {goal.deadline && (
                      <div className="flex justify-between">
                        <span>{t("goals.dueDate")}:</span>
                        <span className="font-bold">
                          {new Date(goal.deadline).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {goal.description && <p className="text-sm text-foreground italic">{goal.description}</p>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
