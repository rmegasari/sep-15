export interface Account {
  id: string
  name: string
  type: "bank" | "ewallet"
  balance: number
  isSavings: boolean
  icon?: string
  color?: string
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: "income" | "expense" | "transfer" | "debt"
  category: string
  subcategory?: string
  accountId: string
  toAccountId?: string // For transfers
  debtId?: string // For debt transactions
  struck?: boolean // Added for receipt/proof tracking
}

export interface TransactionCategory {
  id: string
  name: string
  type: "income" | "expense" | "transfer" | "debt"
  subcategories: string[]
}

export interface Budget {
  id: string
  category: string
  subcategory?: string
  amount: number
  period: "monthly" | "weekly"
  startDate: string
  endDate: string
  spent: number
  isActive: boolean
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface Debt {
  id: string
  name: string
  totalAmount: number
  remainingAmount: number
  interestRate?: number
  minimumPayment?: number
  dueDate?: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface AppSettings {
  payrollDate: number // Day of month (1-31)
  customSubcategories: {
    [categoryType: string]: string[]
  }
  budgetWarningThreshold: number // Percentage (e.g., 80 for 80%)
}

export interface UserProfile {
  id: string
  name: string
  email?: string
  avatar?: string
  language: "id" | "en"
  theme: "light" | "dark" | "pink" | "blue" | "green"
  isLoggedIn: boolean
}

export type DashboardPeriod = "daily" | "weekly" | "monthly" | "yearly" | "payroll"

// TAMBAHKAN INTERFACE BARU INI DI BAGIAN BAWAH
export interface TransformedCategory {
  id: string;
  name: string;
  type: "income" | "expense" | "transfer" | "debt";
  subcategories: string[];
}
