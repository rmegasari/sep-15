import { supabase, type Transaction, type Platform, type Debt, type Goal, type Category } from "./supabase"

export class DatabaseService {
  // --- Transactions ---
  static async getTransactions(userId?: string): Promise<Transaction[]> {
    let query = supabase.from("transactions").select("*").order("date", { ascending: false })

    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query

    if (error) {
      console.error("Error fetching transactions:", error)
      return []
    }

    return data || []
  }

  static async addTransaction(
    transaction: Omit<Transaction, "id" | "created_at">,
    userId?: string,
  ): Promise<Transaction | null> {
    const transactionData = userId ? { ...transaction, user_id: userId } : transaction
    const { data, error } = await supabase.from("transactions").insert([transactionData]).select().single()

    if (error) {
      console.error("Error adding transaction:", error)
      return null
    }

    return data
  }

  static async updateTransaction(
    id: number,
    transaction: Partial<Transaction>,
    userId?: string,
  ): Promise<Transaction | null> {
    let query = supabase.from("transactions").update(transaction).eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query.select().single()
    if (error) {
      console.error("Error updating transaction:", error)
      return null
    }

    return data
  }

  static async deleteTransaction(id: number, userId?: string): Promise<boolean> {
    let query = supabase.from("transactions").delete().eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { error } = await query
    if (error) {
      console.error("Error deleting transaction:", error)
      return false
    }
    return true
  }

  // --- Platforms ---
  static async getPlatforms(userId?: string): Promise<Platform[]> {
    let query = supabase.from("platforms").select("*").order("account")
    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query
    if (error) {
      console.error("Error fetching platforms:", error)
      return []
    }
    return data || []
  }

  static async addPlatform(platform: Omit<Platform, "id" | "created_at">, userId?: string): Promise<Platform | null> {
    const platformData = userId ? { ...platform, user_id: userId } : platform
    const { data, error } = await supabase.from("platforms").insert([platformData]).select().single()

    if (error) {
      console.error("Error adding platform:", error)
      return null
    }
    return data
  }

  static async updatePlatform(id: number, platform: Partial<Platform>, userId?: string): Promise<Platform | null> {
    let query = supabase.from("platforms").update(platform).eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query.select().single()
    if (error) {
      console.error("Error updating platform:", error)
      return null
    }
    return data
  }

  static async deletePlatform(id: number, userId?: string): Promise<boolean> {
    let query = supabase.from("platforms").delete().eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { error } = await query
    if (error) {
      console.error("Error deleting platform:", error)
      return false
    }
    return true
  }

  // --- Debts ---
  static async getDebts(userId?: string): Promise<Debt[]> {
    let query = supabase.from("debts").select("*").order("id")
    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query
    if (error) {
      console.error("Error fetching platforms:", error)
      return []
    }
    return data || []
  }

  static async addDebt(debt: Omit<Debt, "id" | "created_at">, userId?: string): Promise<Debt | null> {
    const debtData = userId ? { ...debt, user_id: userId } : debt
    const { data, error } = await supabase.from("debts").insert([debtData]).select().single()

    if (error) {
      console.error("Error adding debt:", error)
      return null
    }
    return data
  }

  static async updateDebt(id: number, debt: Partial<Debt>, userId?: string): Promise<Debt | null> {
    let query = supabase.from("debts").update(debt).eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query.select().single()
    if (error) {
      console.error("Error updating debt:", error)
      return null
    }
    return data
  }

  static async deleteDebt(id: number, userId?: string): Promise<boolean> {
    let query = supabase.from("debts").delete().eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { error } = await query
    if (error) {
      console.error("Error deleting debt:", error)
      return false
    }
    return true
  }

  // --- Goals ---
  static async getGoals(userId?: string): Promise<Goal[]> {
    let query = supabase.from("goals").select("*").order("deadline")
    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query
    if (error) {
      console.error("Error fetching goals:", error)
      return []
    }
    return data || []
  }

  static async addGoal(goal: Omit<Goal, "id" | "created_at">, userId?: string): Promise<Goal | null> {
    const goalData = userId ? { ...goal, user_id: userId } : goal
    const { data, error } = await supabase.from("goals").insert([goalData]).select().single()

    if (error) {
      console.error("Error adding goal:", error)
      return null
    }
    return data
  }

  static async updateGoal(id: number, goal: Partial<Goal>, userId?: string): Promise<Goal | null> {
    let query = supabase.from("goals").update(goal).eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { data, error } = await query.select().single()
    if (error) {
      console.error("Error updating goal:", error)
      return null
    }
    return data
  }

  static async deleteGoal(id: number, userId?: string): Promise<boolean> {
    let query = supabase.from("goals").delete().eq("id", id)
    if (userId) query = query.eq("user_id", userId)

    const { error } = await query
    if (error) {
      console.error("Error deleting goal:", error)
      return false
    }
    return true
  }

  // --- Categories ---
  static async getCategories(userId: string) {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("category", { ascending: true }) // Urutkan dulu berdasarkan Kategori (Pemasukan/Pengeluaran)
      .order("budget", { ascending: false }) // Lalu urutkan berdasarkan budget descending

    if (error) {
      console.error("Error fetching categories:", error.message, error.details)
      return []
    }

    // Jika user baru dan belum punya category → kembalikan default
    if (!data || data.length === 0) {
      return [
        // {
        //   id: -1, // Gunakan number (misal: -1) untuk menandakan ini item sementara
        //   user_id: userId,
        //   category: "", // Tambahkan properti 'category'
        //   sub_category: "",    // Ganti 'name' menjadi 'sub_category'
        //   budget: 0,               // Tambahkan properti 'budget'
        //   created_at: new Date().toISOString()
        // }
      ]
    }

    return data
  }

  static async addSubCategory(
    data: { sub_category: string; budget?: number; type: "income" | "expense" },
    userId: string,
  ): Promise<Category | null> {
    const category = data.type === "income" ? "Pemasukan" : "Pengeluaran"

    const payload = {
      user_id: userId,
      category,
      sub_category: data.sub_category,
      budget: data.budget ?? 0,
    }

    console.log("Mencoba memasukkan payload:", payload)

    const { data: newCategory, error } = await supabase.from("categories").insert([payload]).select().single()

    if (error) {
      console.error("Error adding sub-category (object):", error)
      console.error("Payload yang gagal:", payload)
      alert("Gagal menambahkan kategori: " + error.message)
      return null
    }

    return newCategory
  }

  static async updateSubCategory(
    id: number,
    updates: { sub_category?: string; budget?: number },
    userId: string,
  ): Promise<Category | null> {
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating sub-category:", error)
      return null
    }
    return data
  }

  static async deleteSubCategory(id: number, userId: string): Promise<boolean> {
    const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", userId)

    if (error) {
      console.error("Error deleting sub-category:", error)
      return false
    }
    return true
  }
}
