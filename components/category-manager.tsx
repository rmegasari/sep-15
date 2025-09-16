"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Settings, Trash2, Edit } from "lucide-react";
import { DatabaseService } from "@/lib/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Category {
  id: number;
  sub_category: string;
  category: string;
  budget?: number | null;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense",
    budget: "",
  });
  const [loading, setLoading] = useState(true);
  
  // 2. Hapus userId statis dan ganti dengan state
  const [userId, setUserId] = useState<string | null>(null);

  const categoryTypes = [
    { value: "expense", label: "Pengeluaran" },
    { value: "income", label: "Pemasukan" },
  ];

  // 3. useEffect pertama: untuk mengambil sesi pengguna saat komponen dimuat
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        console.error("User tidak login.");
        setLoading(false); // Berhenti loading jika tidak ada user
      }
    };
    getUser();
  }, []);

  // 4. useEffect kedua: untuk mengambil kategori SETELAH userId didapatkan
  useEffect(() => {
    // Pastikan untuk hanya menjalankan fetchCategories jika userId sudah ada
    if (userId) {
      fetchCategories(userId);
    }
  }, [userId]); // Dependensi array diisi [userId]

  // 5. Modifikasi fetchCategories untuk menerima userId sebagai parameter
  const fetchCategories = async (currentUserId: string) => {
    setLoading(true);
    const data = await DatabaseService.getCategories(currentUserId);
    if (data) {
        setCategories(data);
    }
    setLoading(false);
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // --- VALIDASI 1: Pastikan user ID ada ---
  if (!userId) {
    alert("Error: User ID tidak ditemukan. Silakan coba login ulang.");
    console.error("handleSubmit dihentikan karena userId kosong atau null.");
    return; // Hentikan eksekusi fungsi
  }

  const trimmedName = formData.name.trim();

  // --- VALIDASI 2: Pastikan nama sub-kategori tidak kosong ---
  if (!trimmedName) {
    alert("Nama sub-kategori tidak boleh kosong.");
    return; // Hentikan eksekusi fungsi
  }

  try {
    const budgetValue =
      formData.type === "income"
        ? 0
        : formData.budget
        ? parseFloat(formData.budget)
        : 0;

    if (editingCategory) {
      // Update sub-category
      await DatabaseService.updateSubCategory(
        editingCategory.id,
        {
          sub_category: trimmedName,
          budget: budgetValue,
        },
        userId
      );
    } else {
      // Add sub-category baru
      // ✅ Menggunakan data yang sudah divalidasi
      await DatabaseService.addSubCategory(
        {
          sub_category: trimmedName,
          budget: budgetValue,
          type: formData.type as "income" | "expense",
        },
        userId
      );
    }

    if (userId) {
      await fetchCategories(userId);
    }
    resetFormAndClose();
  } catch (error) {
    // Catch ini akan menangkap error dari update/fetch/reset, karena addSubCategory sudah punya penanganan sendiri
    console.error("Gagal menyimpan kategori:", (error as Error).message, error);
    alert("Gagal menyimpan data. Periksa console untuk detail.");
  }
};


  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.sub_category,
      type: category.category === "Pemasukan" ? "income" : "expense",
      budget: category.budget?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus kategori ini? Tindakan ini tidak dapat dibatalkan.")) {
      await DatabaseService.deleteSubCategory(id, userId);
      await fetchCategories(userId);
    }
  };

  const resetFormAndClose = () => {
    setEditingCategory(null);
    setFormData({ name: "", type: "expense", budget: "" });
    setIsDialogOpen(false);
  };

  if (loading) {
    return (
      <Card className="neobrutalism-card">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Memuat kategori...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="neobrutalism-card">
      <CardHeader className="border-b-2 border-black bg-accent text-accent-foreground">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Kelola Kategori & Sub-Kategori
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="neobrutalism-button bg-background text-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kategori
              </Button>
            </DialogTrigger>
            <DialogContent className="neobrutalism-card">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="type">Tipe</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="neobrutalism-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">Nama Sub-Kategori</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="neobrutalism-input"
                    placeholder="Masukkan nama sub-kategori"
                    required
                  />
                </div>

                {formData.type === "expense" && (
                  <div>
                    <Label htmlFor="budget">Budget Bulanan</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                      className="neobrutalism-input"
                      placeholder="Tentukan Budget Bulanan"
                      required
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="neobrutalism-button flex-1">
                    {editingCategory ? "Update" : "Tambah"} Kategori
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Sub-Kategori</TableHead>
              <TableHead>Kategori</TableHead>
              {/* 1. Tambah header kolom untuk Budget */}
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                {/* 2. Sesuaikan colSpan menjadi 4 */}
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Belum ada kategori. Klik "Tambah Kategori" untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.sub_category}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.category}</Badge>
                  </TableCell>
                  {/* 3. Tambah sel data untuk Budget */}
                  <TableCell className="text-right">
                    {/* Format angka agar mudah dibaca, tampilkan '-' jika budget tidak ada/nol */}
                    {category.budget ? new Intl.NumberFormat('id-ID').format(category.budget) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                        className="neobrutalism-button"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(category.id)}
                        className="neobrutalism-button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
