"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Plus, Edit, Trash2, Target, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { DatabaseService } from "@/lib/database"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useAuth } from "@/contexts/auth-context"

interface Budget {
  id: number
  sub_category: string
  budget: number
  category: string
}

interface BudgetManagerProps {
  transactions: any[]
  onBudgetChange?: () => void
}

export function BudgetManager({ transactions, onBudgetChange }: BudgetManagerProps) {

  
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [currentView, setCurrentView] = useState<"manage" | "analytics">("analytics")
  const [formData, setFormData] = useState({
    sub_category: "",
    budget: "",
  })

  const expenseSubcategories = [
    "Belanja Bulanan",
    "Internet",
    "Bensin",
    "Hiburan",
    "Makan & Minum",
    "Transport",
    "Kesehatan",
    "Pendidikan",
    "Lainnya",
  ]

  useEffect(() => {
    if (user?.id) {
      fetchBudgets()
    }
  }, [user?.id])

  const fetchBudgets = async () => {
    if (!user?.id) return

    try {
      const categories = await DatabaseService.getCategories(user.id)
      // Filter categories where category = "Pengeluaran" and budget > 0
      const budgetCategories = categories.filter((cat) => cat.category === "Pengeluaran" && cat.budget > 0)
      setBudgets(budgetCategories)
    } catch (error) {
      console.error("Error fetching budgets:", error)
      setBudgets([])
    }
  }

  const getBudgetAnalyticsData = () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    return budgets
      .map((budget) => {
        // Calculate spent amount from transactions for this sub_category in current month
        const spent = transactions
          .filter(
            (tx) =>
              tx.category === "Pengeluaran" &&
              tx.subCategory === budget.sub_category &&
              tx.date.startsWith(currentMonth),
          )
          .reduce((sum, tx) => sum + Math.abs(tx.nominal), 0)

        const percentage = budget.budget > 0 ? (spent / budget.budget) * 100 : 0
        const remaining = Math.max(0, budget.budget - spent)

        const spent2 = transactions
  .filter(
    (tx) => {
      // Kita tambahkan console.log di sini
      console.log(`Checking tx.nominal for transaction ID ${tx.id}:`, tx.nominal);
      
      return tx.category === "Pengeluaran" &&
             tx.subCategory === budget.sub_category &&
             tx.date.startsWith(currentMonth);
    }
  )
  .reduce((sum, tx) => sum + Math.abs(tx.nominal), 0); // Kode ini masih menggunakan .nominal

        return {
          subcategory: budget.sub_category,
          budget: budget.budget,
          spent: spent,
          remaining: remaining,
          percentage: percentage,
          status: percentage >= 100 ? "over" : percentage >= 80 ? "warning" : "safe",
        }
      })
      .sort((a, b) => b.percentage - a.percentage)
  }

  const getMonthlyComparisonData = () => {
    const months = []
    const now = new Date()

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7)
      const monthName = date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })

      const monthData = {
        month: monthName,
        monthKey: monthKey,
        totalBudget: 0,
        totalSpent: 0,
      }

      budgets.forEach((budget) => {
        const spent = transactions
          .filter(
            (tx) =>
              tx.category === "Pengeluaran" &&
              tx["sub-category"] === budget.sub_category &&
              tx.date.startsWith(monthKey),
          )
          .reduce((sum, tx) => sum + Math.abs(tx.nominal), 0)

        monthData.totalBudget += budget.budget
        monthData.totalSpent += spent
      })

      months.push(monthData)
    }

    return months
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) return

    try {
      if (editingBudget) {
        // Update existing budget in categories table
        await DatabaseService.updateSubCategory(
          editingBudget.id,
          { budget: Number.parseFloat(formData.budget) },
          user.id,
        )
      } else {
        // Add new budget by updating existing category or creating new one
        await DatabaseService.addSubCategory(
          {
            sub_category: formData.sub_category,
            budget: Number.parseFloat(formData.budget),
            type: "expense",
          },
          user.id,
        )
      }

      await fetchBudgets()
      setIsDialogOpen(false)
      setEditingBudget(null)
      setFormData({ sub_category: "", budget: "" })
      onBudgetChange?.()
    } catch (error) {
      console.error("Error saving budget:", error)
      alert("Gagal menyimpan budget")
    }
  }

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setFormData({
      sub_category: budget.sub_category,
      budget: budget.budget.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!user?.id) return

    if (confirm("Hapus budget ini?")) {
      try {
        // Set budget to 0 instead of deleting the category
        await DatabaseService.updateSubCategory(id, { budget: 0 }, user.id)
        await fetchBudgets()
        onBudgetChange?.()
      } catch (error) {
        console.error("Error deleting budget:", error)
        alert("Gagal menghapus budget")
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
    return amount.toString()
  }

  const analyticsData = getBudgetAnalyticsData()
  const monthlyComparison = getMonthlyComparisonData()

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={currentView === "analytics" ? "default" : "outline"}
          onClick={() => setCurrentView("analytics")}
          className="neobrutalism-button"
        >
          <Target className="h-4 w-4 mr-2" />
          Laporan Budget
        </Button>
        <Button
          variant={currentView === "manage" ? "default" : "outline"}
          onClick={() => setCurrentView("manage")}
          className="neobrutalism-button"
        >
          <Edit className="h-4 w-4 mr-2" />
          Kelola Budget
        </Button>
      </div>

      {currentView === "analytics" && (
        <div className="space-y-6">
          {/* Budget vs Expense Comparison Chart */}
          <Card className="neobrutalism-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Perbandingan Budget vs Pengeluaran Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subcategory" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                    <Bar dataKey="spent" fill="#ef4444" name="Pengeluaran" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Belum ada data budget untuk ditampilkan</div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card className="neobrutalism-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tren Budget vs Pengeluaran (6 Bulan Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="totalBudget" fill="#22c55e" name="Total Budget" />
                  <Bar dataKey="totalSpent" fill="#ef4444" name="Total Pengeluaran" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Budget Analysis */}
          <Card className="neobrutalism-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Analisis Detail Budget per Sub-Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.length > 0 ? (
                  analyticsData.map((item, index) => (
                    <div key={index} className="border-2 border-black p-4 bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{item.subcategory}</h3>
                          {item.status === "over" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {item.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-medium ${
                              item.status === "over"
                                ? "text-red-500"
                                : item.status === "warning"
                                  ? "text-yellow-500"
                                  : "text-green-500"
                            }`}
                          >
                            {item.percentage.toFixed(1)}% terpakai
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-xs text-blue-600 font-medium">BUDGET</div>
                          <div className="text-lg font-bold text-blue-700">{formatCurrency(item.budget)}</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 border border-red-200 rounded">
                          <div className="text-xs text-red-600 font-medium">PENGELUARAN</div>
                          <div className="text-lg font-bold text-red-700">{formatCurrency(item.spent)}</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                          <div className="text-xs text-green-600 font-medium">SISA</div>
                          <div className="text-lg font-bold text-green-700">{formatCurrency(item.remaining)}</div>
                        </div>
                      </div>

                      <Progress value={Math.min(item.percentage, 100)} className="h-3" />

                      <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
                        <span>
                          {item.spent > item.budget ? (
                            <span className="text-red-500 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Melebihi budget {formatCurrency(item.spent - item.budget)}
                            </span>
                          ) : (
                            <span className="text-green-500 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Dalam batas budget
                            </span>
                          )}
                        </span>
                        <span>
                          {item.percentage < 50
                            ? "Aman"
                            : item.percentage < 80
                              ? "Perhatian"
                              : item.percentage < 100
                                ? "Hampir Habis"
                                : "Melebihi Budget"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada budget yang dibuat untuk dianalisis
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentView === "manage" && (
        <Card className="neobrutalism-card">
          <CardHeader className="border-b-2 border-black bg-primary text-primary-foreground">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Kelola Budget Bulanan
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="neobrutalism-button bg-background text-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Budget
                  </Button>
                </DialogTrigger>
                <DialogContent className="neobrutalism-card">
                  <DialogHeader>
                    <DialogTitle>{editingBudget ? "Edit Budget" : "Tambah Budget Baru"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="subcategory">Sub-Kategori</Label>
                      <Select
                        value={formData.sub_category}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, sub_category: value }))}
                      >
                        <SelectTrigger className="neobrutalism-input">
                          <SelectValue placeholder="Pilih sub-kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseSubcategories.map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Jumlah Budget</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                        className="neobrutalism-input"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="neobrutalism-button flex-1">
                        {editingBudget ? "Update" : "Tambah"} Budget
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="neobrutalism-button"
                      >
                        Batal
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {budgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada budget yang dibuat. Klik "Tambah Budget" untuk memulai.
                </div>
              ) : (
                budgets.map((budget) => {
                  // Calculate current month spending for this budget
                  const currentMonth = new Date().toISOString().slice(0, 7)
                  const spent = transactions
                    .filter(
                      (tx) =>
                        tx.category === "Pengeluaran" &&
                        tx["sub-category"] === budget.sub_category &&
                        tx.date.startsWith(currentMonth),
                    )
                    .reduce((sum, tx) => sum + Math.abs(tx.nominal), 0)

                  const percentage = budget.budget > 0 ? (spent / budget.budget) * 100 : 0
                  const isOverBudget = percentage >= 100
                  const isWarning = percentage >= 80

                  return (
                    <div key={budget.id} className="border-2 border-black p-4 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{budget.sub_category}</h3>
                          {(isOverBudget || isWarning) && (
                            <AlertTriangle className={`h-4 w-4 ${isOverBudget ? "text-red-500" : "text-yellow-500"}`} />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(budget)}
                            className="neobrutalism-button"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(budget.id)}
                            className="neobrutalism-button"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Terpakai: {formatCurrency(spent)}</span>
                          <span>Budget: {formatCurrency(budget.budget)}</span>
                        </div>
                        <Progress value={Math.min(percentage, 100)} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(1)}% terpakai</span>
                          <span>Sisa: {formatCurrency(Math.max(0, budget.budget - spent))}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
