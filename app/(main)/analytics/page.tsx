"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  PieChartIcon,
  BarChart3,
  CalendarIcon,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  ChevronDown,
  Loader2,
  Target,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HelpTooltip } from "@/components/help-tooltip"
import { supabase } from "@/lib/supabase"
import { BudgetManager } from "@/components/budget-manager"
import { useAuth } from "@/contexts/auth-context"

// Tipe data untuk transaksi yang sudah diproses
interface ProcessedTransaction {
  id: string
  date: string
  type: "income" | "expense"
  category: string
  subCategory: string
  amount: number
}

// Fungsi helper untuk mendapatkan tanggal awal dan akhir bulan ini
const getMonthDateRange = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const formatDate = (date: Date) => date.toISOString().split("T")[0]

  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay),
  }
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [accountData, setAccountData] = useState<any[]>([])
  const [platformBalances, setPlatformBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(getMonthDateRange().start)
  const [endDate, setEndDate] = useState(getMonthDateRange().end)
  const [chartType, setChartType] = useState("overview")
  const { t } = useTranslation()

  const colorMap: Record<string, string> = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    purple: "#8b5cf6",
    pink: "#ec4899",
    orange: "#f97316",
    gray: "#6b7280",
    indigo: "#6366f1",
    teal: "#14b8a6",
  }

  // DIUBAH: Fungsi ini sekarang mengurutkan bulan dengan benar
  const processMonthlyData = (data: ProcessedTransaction[]) => {
    const monthlyStats: Record<string, { income: number; expense: number; date: Date }> = {}
    data.forEach((tx) => {
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { income: 0, expense: 0, date: date }
      }
      if (tx.type === "income") {
        monthlyStats[monthKey].income += tx.amount
      } else if (tx.type === "expense") {
        monthlyStats[monthKey].expense += tx.amount
      }
    })

    return Object.values(monthlyStats)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((values) => ({
        month: values.date.toLocaleDateString("id-ID", { year: "2-digit", month: "short" }),
        income: values.income,
        expense: Math.abs(values.expense),
        savings: values.income - Math.abs(values.expense),
      }))
  }

  const processCategoryData = (data: ProcessedTransaction[]) => {
    const categoryStats: Record<string, number> = {}
    const expenseTransactions = data.filter((tx) => tx.type === "expense")
    expenseTransactions.forEach((tx) => {
      const categoryName = tx.subCategory || "Lainnya"
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = 0
      }
      categoryStats[categoryName] += Math.abs(tx.amount)
    })
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]
    return Object.entries(categoryStats).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate || !user) return

      setLoading(true)
      setError(null)

      try {
        const transactionQuery = supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .neq("category", "Mutasi")
          .gte("date", startDate)
          .lte("date", endDate)

        const { data: transactionData, error: transactionError } = await transactionQuery
        if (transactionError) throw transactionError

        const { data: platformData, error: platformError } = await supabase
          .from("platforms")
          .select("*")
          .eq("user_id", user.id)
        if (platformError) throw platformError
        console.log("Fetched platform data:", platformData)

        const processedTransactions: ProcessedTransaction[] = transactionData.map((tx) => ({
          id: tx.id,
          date: tx.date,
          type: tx.category === "Pemasukan" ? "income" : "expense",
          category: tx.category,
          subCategory: tx["sub-category"],
          amount: tx.nominal,
        }))

        setTransactions(processedTransactions)
        setMonthlyData(processMonthlyData(processedTransactions))
        setCategoryData(processCategoryData(processedTransactions))
        setPlatformBalances(platformData)

        setAccountData(
          platformData.map((acc) => ({
            name: acc.account || acc.name || "Unknown Account",
            balance: acc.saldo || 0,
            type: acc.type_account || acc.type || "unknown",
            color: acc.color ? acc.color.replace("bg-", "").replace("-500", "") : "gray",
          })),
        )
      } catch (err) {
        console.error("Error fetching analytics data:", err)
        setError("Gagal memuat data analytics. Periksa koneksi database dan pastikan tabel sudah dibuat.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, user])

  const { totalIncome, totalExpense, totalSavings, savingsRate, finalBalance, savingsChange } = useMemo(() => {
    const income = monthlyData.reduce((sum, period) => sum + period.income, 0)
    const expense = Math.abs(monthlyData.reduce((sum, period) => sum + period.expense, 0))
    const savings = income - expense
    const rate = income > 0 ? ((savings / income) * 100).toFixed(1) : "0"

    // Calculate final balance: initial platform balances + net transactions
    const initialBalance = platformBalances.reduce((sum, platform) => sum + (platform.saldo || 0), 0)
    const finalBal = initialBalance + savings
    console.log("Initial Balance:", initialBalance, "Savings from Transactions:", savings, "Final Balance:", finalBal)

    const savingsAccountBalances = platformBalances
      .filter((platform) => platform.type_account === "tabungan" || platform.type === "tabungan")
      .reduce((sum, platform) => sum + (platform.saldo || 0), 0)

    // For savings change, we use the net savings from transactions in the period
    const savingsChangeAmount = savings

    return {
      totalIncome: income,
      totalExpense: Math.abs(expense),
      totalSavings: savingsChangeAmount, // Now shows change in savings for the period
      savingsRate: rate,
      finalBalance: finalBal,
      savingsChange: savingsChangeAmount,
    }
  }, [monthlyData, platformBalances])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompactCurrency = (amount: number) => {
    const sign = amount < 0 ? "-" : ""  // simpan tanda minus kalau negatif
    const absAmount = Math.abs(amount)  // pakai nilai absolut untuk formatting

    if (absAmount >= 1_000_000) return `${sign}${(absAmount / 1_000_000).toFixed(1)}M`
    if (absAmount >= 1_000) return `${sign}${(absAmount / 1_000).toFixed(0)}K`
    return `${sign}${absAmount.toString()}`
  }


  // DIUBAH: Fungsi ini sekarang berfungsi untuk mengunduh file CSV
  const exportToCSV = () => {
    if (transactions.length === 0) {
      alert("Tidak ada data untuk diexport.")
      return
    }
    const headers = ["ID", "Tanggal", "Tipe", "Kategori", "Sub-Kategori", "Jumlah"]
    const csvRows = [
      headers.join(","),
      ...transactions.map((tx) =>
        [tx.id, tx.date, tx.type, tx.category, `"${tx.subCategory || ""}"`, tx.amount].join(","),
      ),
    ]

    const csvString = csvRows.join("\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `analytics_export_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const exportToPDF = () => {
    alert("Fitur Export PDF akan segera tersedia")
  }
  const exportToJPEG = () => {
    alert("Fitur Export JPEG akan segera tersedia")
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-foreground font-manrope flex items-center gap-2">
              Analytics
              <HelpTooltip content="Halaman analisis keuangan dengan berbagai grafik dan metrik." />
            </h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate" className="text-sm font-semibold">
                {t("common.from")}:
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="neobrutalism-input w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate" className="text-sm font-semibold">
                {t("common.to")}:
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="neobrutalism-input w-auto"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="neobrutalism-button flex items-center gap-1">
                  <FileText className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <Button variant="ghost" className="w-full justify-start text-sm" onClick={exportToPDF}>
                  <FileText className="h-4 w-4 mr-2" /> Export PDF
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" onClick={exportToJPEG}>
                  <ImageIcon className="h-4 w-4 mr-2" /> Export JPEG
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" onClick={exportToCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV (Excel)
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">{error}</div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 max-w-6xl">
              <Card className="neobrutalism-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">{t("analytics.totalIncome")}</CardTitle>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-primary break-words">{formatCompactCurrency(totalIncome)}</div>
                  <div className="text-xs text-foreground mt-1">{formatCurrency(totalIncome)}</div>
                </CardContent>
              </Card>
              <Card className="neobrutalism-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">{t("analytics.totalExpense")}</CardTitle>
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-destructive break-words">
                    {formatCompactCurrency(totalExpense)}
                  </div>
                  <div className="text-xs text-foreground mt-1">{formatCurrency(totalExpense)}</div>
                </CardContent>
              </Card>
              <Card className="neobrutalism-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">{t("analytics.totalSavings")}</CardTitle>
                  <TrendingUp className="h-5 w-5 text-chart-1" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-chart-1 break-words">
                    {formatCompactCurrency(totalSavings)}
                  </div>
                  <div className="text-xs text-foreground mt-1">{formatCurrency(totalSavings)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Perubahan periode ini</div>
                </CardContent>
              </Card>
              <Card className="neobrutalism-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">{t("analytics.finalBalance")}</CardTitle>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-blue-500 break-words">
                    {formatCompactCurrency(finalBalance)}
                  </div>
                  <div className="text-xs text-foreground mt-1">{formatCurrency(finalBalance)}</div>
                </CardContent>
              </Card>
              <Card className="neobrutalism-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">{t("analytics.savingRate")}</CardTitle>
                  <PieChartIcon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-primary">{savingsRate}%</div>
                  <p className="text-xs text-foreground">Target: 30%</p>
                </CardContent>
              </Card>
            </div>

            {/* DIUBAH: Tombol Tren dan Forecasting dikembalikan */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={chartType === "overview" ? "default" : "outline"}
                  onClick={() => setChartType("overview")}
                  className="neobrutalism-button flex items-center gap-1"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </Button>
                <Button
                  variant={chartType === "categories" ? "default" : "outline"}
                  onClick={() => setChartType("categories")}
                  className="neobrutalism-button flex items-center gap-1"
                >
                  <PieChartIcon className="h-4 w-4 mr-2" />
                  Kategori
                </Button>
                <Button
                  variant={chartType === "accounts" ? "default" : "outline"}
                  onClick={() => setChartType("accounts")}
                  className="neobrutalism-button flex items-center gap-1"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Akun
                </Button>
                <Button
                  variant={chartType === "budget" ? "default" : "outline"}
                  onClick={() => setChartType("budget")}
                  className="neobrutalism-button flex items-center gap-1"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Budget
                </Button>
                <Button
                  variant={chartType === "trends" ? "default" : "outline"}
                  onClick={() => setChartType("trends")}
                  className="neobrutalism-button flex items-center gap-1"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Tren
                </Button>
                <Button
                  variant={chartType === "forecast" ? "default" : "outline"}
                  onClick={() => setChartType("forecast")}
                  className="neobrutalism-button flex items-center gap-1"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t("analytics.forecasting")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {chartType === "overview" && (
                <>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">
                        {t("transactions.income")} vs {t("transactions.expense")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="income" fill="#22c55e" name="Pemasukan" />
                          <Bar dataKey="expense" fill="#ef4444" name="Pengeluaran" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">{t("analytics.savingsOverTime")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Area
                            type="monotone"
                            dataKey="savings"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                            name="Tabungan"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
              {chartType === "categories" && (
                <>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">
                        {t("analytics.expenseByCategory")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">
                        {t("analytics.expenseComposition")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {categoryData.map((category, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                              <span className="font-medium text-sm">{category.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">{formatCompactCurrency(category.value)}</div>
                              <div className="text-xs text-foreground">
                                {(
                                  (category.value / categoryData.reduce((sum, cat) => sum + cat.value, 0)) *
                                  100
                                ).toFixed(1)}
                                %
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              {chartType === "accounts" && (
                <>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">{t("analytics.accountBalances")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={accountData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                          <YAxis dataKey="name" type="category" width={80} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="balance" fill="#3b82f6" name="Saldo" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">
                        {t("analytics.accountComposition")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {accountData.map((account, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full border border-black"
                                style={{ backgroundColor: colorMap[account.color] || colorMap.gray }}
                              />
                              <div>
                                <div className="font-medium text-sm">{account.name}</div>
                                <div className="text-xs text-foreground capitalize">{account.type}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">{formatCompactCurrency(account.balance)}</div>
                              <div className="text-xs text-foreground">
                                {accountData.reduce((sum, acc) => sum + acc.balance, 0) > 0
                                  ? (
                                      (account.balance / accountData.reduce((sum, acc) => sum + acc.balance, 0)) *
                                      100
                                    ).toFixed(1)
                                  : "0"}
                                %
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              {chartType === "budget" && (
                <div className="col-span-1 lg:col-span-2">
                  <BudgetManager transactions={transactions} />
                </div>
              )}
              {/* DIUBAH: Grafik Tren dan Forecasting dikembalikan */}
              {chartType === "trends" && (
                <>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">
                        {t("analytics.monthlyExpenseTrends")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} name="Pengeluaran" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="neobrutalism-card">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold font-manrope">
                        {t("analytics.monthlyIncomeTrends")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} name="Pemasukan" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
              {chartType === "forecast" && (
                <Card className="neobrutalism-card col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold font-manrope">Forecasting (Segera Hadir)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-20 text-muted-foreground">
                      {t("analytics.forecastingComingSoon")}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
