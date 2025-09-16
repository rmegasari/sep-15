"use client"

import type { Account } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AccountSelectorProps {
  accounts: Account[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  excludeAccountId?: string
}

export function AccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Pilih akun",
  excludeAccountId,
}: AccountSelectorProps) {
  const filteredAccounts = excludeAccountId ? accounts.filter((account) => account.id !== excludeAccountId) : accounts

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="neobrutalism-input">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredAccounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${account.color}`} />
              <span>{account.name}</span>
              <span className="text-xs text-muted-foreground">({account.type === "bank" ? "Bank" : "E-Wallet"})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
