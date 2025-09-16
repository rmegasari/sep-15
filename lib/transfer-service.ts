import type { Account, Transaction } from "@/types"

export interface TransferRequest {
  fromAccountId: string
  toAccountId: string
  amount: number
  description: string
  subcategory: string
}

export interface TransferResult {
  success: boolean
  message: string
  transactions?: Transaction[]
  updatedAccounts?: Account[]
}

export class TransferService {
  static validateTransfer(request: TransferRequest, accounts: Account[]): { isValid: boolean; error?: string } {
    const fromAccount = accounts.find((acc) => acc.id === request.fromAccountId)
    const toAccount = accounts.find((acc) => acc.id === request.toAccountId)

    if (!fromAccount) {
      return { isValid: false, error: "Akun asal tidak ditemukan" }
    }

    if (!toAccount) {
      return { isValid: false, error: "Akun tujuan tidak ditemukan" }
    }

    if (fromAccount.id === toAccount.id) {
      return { isValid: false, error: "Akun asal dan tujuan tidak boleh sama" }
    }

    if (request.amount <= 0) {
      return { isValid: false, error: "Jumlah transfer harus lebih dari 0" }
    }

    if (fromAccount.balance < request.amount) {
      return { isValid: false, error: "Saldo tidak mencukupi" }
    }

    return { isValid: true }
  }

  static processTransfer(
    request: TransferRequest,
    accounts: Account[],
    existingTransactions: Transaction[],
  ): TransferResult {
    const validation = this.validateTransfer(request, accounts)

    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || "Transfer tidak valid",
      }
    }

    const fromAccount = accounts.find((acc) => acc.id === request.fromAccountId)!
    const toAccount = accounts.find((acc) => acc.id === request.toAccountId)!

    // Create transaction ID
    const transactionId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const currentDate = new Date().toISOString().split("T")[0]

    // Create transfer transaction record
    const transferTransaction: Transaction = {
      id: transactionId,
      date: currentDate,
      description: request.description,
      amount: request.amount,
      type: "transfer",
      category: "Mutasi",
      subcategory: request.subcategory,
      accountId: request.fromAccountId,
      toAccountId: request.toAccountId,
    }

    // Update account balances
    const updatedAccounts = accounts.map((account) => {
      if (account.id === request.fromAccountId) {
        return { ...account, balance: account.balance - request.amount }
      }
      if (account.id === request.toAccountId) {
        return { ...account, balance: account.balance + request.amount }
      }
      return account
    })

    return {
      success: true,
      message: `Transfer berhasil dari ${fromAccount.name} ke ${toAccount.name}`,
      transactions: [transferTransaction],
      updatedAccounts,
    }
  }

  static getTransferFee(fromAccountType: string, toAccountType: string, amount: number): number {
    // Simple fee calculation logic
    if (fromAccountType === "bank" && toAccountType === "bank") {
      return amount > 1000000 ? 6500 : 2500 // Inter-bank transfer fee
    }
    if (fromAccountType === "ewallet" && toAccountType === "bank") {
      return 2500 // E-wallet to bank fee
    }
    if (fromAccountType === "bank" && toAccountType === "ewallet") {
      return 0 // Bank to e-wallet usually free
    }
    return 0 // E-wallet to e-wallet usually free
  }

  static formatTransferDescription(fromAccount: Account, toAccount: Account, subcategory: string): string {
    const subcategoryMap: Record<string, string> = {
      "Transfer Antar Akun": `Transfer dari ${fromAccount.name} ke ${toAccount.name}`,
      "Tarik Tunai": `Tarik tunai dari ${fromAccount.name}`,
      "Top Up": `Top up ${toAccount.name} dari ${fromAccount.name}`,
      "Setor Tunai": `Setor tunai ke ${toAccount.name}`,
    }

    return subcategoryMap[subcategory] || `Transfer dari ${fromAccount.name} ke ${toAccount.name}`
  }
}
