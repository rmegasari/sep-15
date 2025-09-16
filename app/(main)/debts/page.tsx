"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Plus, Edit2, Trash2, Loader2, ShieldCheck } from "lucide-react"
import type { Debt } from "@/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export default function DebtsPage() {
  const { user } = useAuth()
  // State untuk data, loading, dan error
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paidTransactions, setPaidTransactions] = useState<any[]>([])

  // State untuk form
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    totalAmount: "",
    remainingAmount: "",
    interestRate: "",
    minimumPayment: "",
    dueDate: "",
    description: "",
  })

  // Fungsi untuk mengambil data dari Supabase
  const fetchDebts = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true })

      if (error) {
        throw error
      }

      const transformedData = data.map((debt) => ({
        id: debt.id,
        name: debt.name,
        totalAmount: debt.total,
        remainingAmount: debt.remaining,
        interestRate: debt.interest,
        minimumPayment: debt.minimum_payment,
        dueDate: debt.due_date,
        description: debt.description,
        isActive: debt.is_active,
        createdAt: debt.created_at,
      }))

      setDebts(transformedData || [])
    } catch (err) {
      console.error("Error fetching debts:", err)
      setError("Gagal memuat data hutang. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  const fetchPaidDebts = async () => {
    if (!user) {
      setPaidTransactions([])
      return
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("category", "Bayar Hutang")

    if (error) {
      console.error("Error fetching paid debts:", error)
      setPaidTransactions([])
      return
    }

    setPaidTransactions(data ?? [])
  }

  useEffect(() => {
    fetchPaidDebts()
  }, [user])

  // Jalankan fetchDebts saat komponen pertama kali dimuat
  useEffect(() => {
    fetchDebts()
  }, [user])

  useEffect(() => {
    const handleTransactionAdded = () => {
      fetchDebts() // Refresh debts when transaction is added
      fetchPaidDebts() // Also refresh paid transactions
    }

    const handleDataRefresh = () => {
      fetchDebts() // Refresh debts on general refresh
      fetchPaidDebts() // Also refresh paid transactions
    }

    window.addEventListener("transactionAdded", handleTransactionAdded)
    window.addEventListener("dataRefresh", handleDataRefresh)

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionAdded)
      window.removeEventListener("dataRefresh", handleDataRefresh)
    }
  }, [user])

  // Fungsi untuk mengirim data (Tambah/Update) ke Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    const debtData = {
      name: formData.name,
      total: Number.parseFloat(formData.totalAmount),
      remaining: Number.parseFloat(formData.remainingAmount),
      interest: formData.interestRate ? Number.parseFloat(formData.interestRate) : null,
      minimum_payment: formData.minimumPayment ? Number.parseFloat(formData.minimumPayment) : null,
      due_date: formData.dueDate || null,
      description: formData.description || null,
      user_id: user.id, // Added user_id to debt data
    }

    let error
    if (editingDebt) {
      const { error: updateError } = await supabase
        .from("debts")
        .update(debtData)
        .eq("id", editingDebt.id)
        .eq("user_id", user.id) // Added user_id check for security
      error = updateError
    } else {
      const { error: insertError } = await supabase.from("debts").insert([debtData])
      error = insertError
    }

    if (error) {
      console.error("Error saving debt:", error)
      alert("Gagal menyimpan data.")
    } else {
      await fetchDebts()
      window.dispatchEvent(new CustomEvent("dataRefresh"))
      resetForm()
    }
  }

  // Fungsi untuk menghapus data dari Supabase
  const handleDelete = async (id: string) => {
    if (!user) return

    if (window.confirm("Apakah Anda yakin ingin menghapus hutang ini?")) {
      const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", user.id) // Added user_id check for security
      if (error) {
        console.error("Error deleting debt:", error)
        alert("Gagal menghapus data.")
      } else {
        await fetchDebts()
        window.dispatchEvent(new CustomEvent("dataRefresh"))
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      totalAmount: "",
      remainingAmount: "",
      interestRate: "",
      minimumPayment: "",
      dueDate: "",
      description: "",
    })
    setShowAddForm(false)
    setEditingDebt(null)
  }

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setFormData({
      name: debt.name,
      totalAmount: debt.totalAmount.toString(),
      remainingAmount: debt.remainingAmount.toString(),
      interestRate: debt.interestRate?.toString() || "",
      minimumPayment: debt.minimumPayment?.toString() || "",
      dueDate: debt.dueDate || "",
      description: debt.description || "",
    })
    setShowAddForm(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(
      amount,
    )
  }

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
    return amount.toString()
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* --- HEADER --- */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground font-manrope">Manajemen Hutang</h1>
          {!showAddForm && !loading && !error && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="neobrutalism-button bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Hutang
            </Button>
          )}
        </div>

        {/* --- FORM TAMBAH/EDIT --- */}
        {showAddForm && (
          <Card className="neobrutalism-card mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-manrope">
                {editingDebt ? "Edit Hutang" : "Tambah Hutang Baru"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nama Hutang *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="neobrutalism-input"
                      placeholder="Contoh: KTA Bank Mandiri"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalAmount">Total Hutang *</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                      className="neobrutalism-input"
                      placeholder="50000000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="remainingAmount">Sisa Hutang *</Label>
                    <Input
                      id="remainingAmount"
                      type="number"
                      value={formData.remainingAmount}
                      onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                      className="neobrutalism-input"
                      placeholder="35000000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="interestRate">Bunga (% per tahun)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      className="neobrutalism-input"
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimumPayment">Pembayaran Minimum</Label>
                    <Input
                      id="minimumPayment"
                      type="number"
                      value={formData.minimumPayment}
                      onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                      className="neobrutalism-input"
                      placeholder="2500000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Jatuh Tempo</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="neobrutalism-input"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="neobrutalism-input"
                    placeholder="Deskripsi hutang..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="neobrutalism-button bg-primary text-primary-foreground">
                    {editingDebt ? "Update" : "Tambah"} Hutang
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="neobrutalism-button bg-transparent"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* --- KONTEN UTAMA (LOADING / ERROR / DATA) --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Memuat data hutang...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">{error}</div>
        ) : debts.length === 0 && !showAddForm ? (
          <Card className="neobrutalism-card">
            <CardContent className="text-center py-12">
              <ShieldCheck className="h-12 w-12 mx-auto text-secondary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selamat, Anda Bebas Hutang!</h3>
              <p className="text-muted-foreground mb-4">Tidak ada data hutang yang tercatat saat ini.</p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="neobrutalism-button bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Catat Hutang Baru
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {debts.map((debt) => {
              const progress =
                debt.totalAmount > 0 ? ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100 : 0

              const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date()

              const filteredTransactions = paidTransactions.filter((t) => {
                console.log("sub-category:", t["sub-category"], "| debt.name:", debt.name)

                return (
                  (t["sub-category"] ?? "").toString().trim().toLowerCase() ===
                  (debt.name ?? "").toString().trim().toLowerCase()
                )
              })

              const debtPaid = filteredTransactions.reduce((sum, t) => sum + Math.abs(Number(t?.nominal ?? 0)), 0)

              console.log("Total paid for", debt.name, "=", debtPaid)
              const remainingFullDebt = debt.remainingAmount - debtPaid

              return (
                <Card key={debt.id} className="neobrutalism-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold font-manrope">{debt.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(debt)}
                          className="neobrutalism-button p-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(debt.id)}
                          className="neobrutalism-button p-2 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Hutang</div>
                        <div className="font-bold">{formatCurrency(debt.totalAmount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sisa Hutang</div>
                        <div className="font-bold text-destructive">{formatCurrency(debt.remainingAmount)}</div>
                      </div>
                      {debt.interestRate != null && (
                        <div>
                          <div className="text-muted-foreground">Bunga</div>
                          <div className="font-bold">{debt.interestRate}% / tahun</div>
                        </div>
                      )}
                      {debt.minimumPayment != null && (
                        <div>
                          <div className="text-muted-foreground">Bayar Minimum</div>
                          <div className="font-bold">{formatCurrency(debt.minimumPayment)}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress Pembayaran</span>
                        <span className="font-bold">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                    {debt.dueDate && (
                      <div className={`text-sm ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        <span className="font-medium">Jatuh Tempo: </span>
                        {new Date(debt.dueDate).toLocaleDateString("id-ID")}
                        {isOverdue && <span className="ml-2 font-bold">(TERLAMBAT)</span>}
                      </div>
                    )}
                    {debt.description && <p className="text-sm text-muted-foreground">{debt.description}</p>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
