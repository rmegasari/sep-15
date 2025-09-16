"use client"

import type { Account } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, AlertTriangle, CheckCircle } from "lucide-react"
import { TransferService } from "@/lib/transfer-service"

interface TransferPreviewProps {
  fromAccount?: Account
  toAccount?: Account
  amount: number
  subcategory: string
}

export function TransferPreview({ fromAccount, toAccount, amount, subcategory }: TransferPreviewProps) {
  if (!fromAccount || !toAccount || amount <= 0) {
    return null
  }

  const transferFee = TransferService.getTransferFee(fromAccount.type, toAccount.type, amount)
  const totalDeduction = amount + transferFee
  const hasInsufficientFunds = fromAccount.balance < totalDeduction

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className="neobrutalism-card bg-muted/30">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${fromAccount.color}`} />
              <div>
                <div className="font-semibold text-sm">{fromAccount.name}</div>
                <div className="text-xs text-foreground">Saldo: {formatCurrency(fromAccount.balance)}</div>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${toAccount.color}`} />
              <div>
                <div className="font-semibold text-sm">{toAccount.name}</div>
                <div className="text-xs text-foreground">Saldo: {formatCurrency(toAccount.balance)}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Jumlah Transfer:</span>
              <span className="font-semibold">{formatCurrency(amount)}</span>
            </div>

            {transferFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Biaya Admin:</span>
                <span className="font-semibold">{formatCurrency(transferFee)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
              <span>Total Dipotong:</span>
              <span>{formatCurrency(totalDeduction)}</span>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-xs text-foreground mb-2">Saldo setelah transfer:</div>
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${fromAccount.color}`} />
                <span>{fromAccount.name}:</span>
                <span className={`font-semibold ${hasInsufficientFunds ? "text-destructive" : ""}`}>
                  {formatCurrency(fromAccount.balance - totalDeduction)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${toAccount.color}`} />
                <span>{toAccount.name}:</span>
                <span className="font-semibold">{formatCurrency(toAccount.balance + amount)}</span>
              </div>
            </div>
          </div>

          {hasInsufficientFunds && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">Saldo tidak mencukupi</span>
            </div>
          )}

          {!hasInsufficientFunds && (
            <div className="flex items-center gap-2 p-2 bg-secondary/10 border border-secondary/20 rounded">
              <CheckCircle className="h-4 w-4 text-secondary" />
              <span className="text-sm text-secondary">Transfer dapat diproses</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
