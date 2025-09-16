"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTransactionForm } from "@/hooks/use-transaction-form";
import { TransactionForm } from "@/components/transaction-form";
import { Loader2 } from "lucide-react"; // Impor Loader2

export function TransactionAddDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useTransactionForm(() => setIsOpen(false));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="neobrutalism-card max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-manrope">
            Tambah Transaksi Baru
          </DialogTitle>
        </DialogHeader>
        
        {/* TAMBAHKAN LOGIKA KONDISIONAL DI SINI */}
        {form.loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <TransactionForm {...form} />
        )}
        
      </DialogContent>
    </Dialog>
  );
}
