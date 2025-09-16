import { supabase } from "@/lib/supabase"

export type UserProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  uploaded_avatars: string[] | null // BARU: Menambahkan kolom untuk riwayat avatar
  phone_number: string | null
  birth_date: string | null
  location: string | null
}

export type UserSettings = {
  user_id: string
  language: string
  theme: string
  payroll_date: number
  budget_warning_threshold: number
}

export class ProfileService {
  // --- Profile ---
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error) {
      console.error("Error fetching profile:", error)
      return null
    }

    return data
  }

  static async getOrCreateProfile(userId: string, email?: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching profile:", error)
      return null
    }

    if (data) return data

    // default profile
    const defaultProfile = {
      id: userId,
      full_name: email || "Pengguna Baru",
      phone_number: null,
      location: "Unknown",
      birth_date: null,
      avatar_url: ProfileService.getDefaultAvatars()[0],
      uploaded_avatars: [], // Inisialisasi dengan array kosong
    }

    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert(defaultProfile)
      .select()
      .single()

    if (insertError) {
      console.error("Error creating default settings:", insertError);
      return null;
    }

    return inserted
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating profile:", error)
      return null
    }

    return data
  }

  // --- Settings ---
  static async getSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching settings:", error)
      return null
    }

    if (data) return data

    const defaultSettings: UserSettings = {
      user_id: userId,
      language: "id",
      theme: "light",
      payroll_date: 25,
      budget_warning_threshold: 80,
    }

    const { data: inserted, error: insertError } = await supabase
      .from("user_settings")
      .insert(defaultSettings)
      .select()
      .single()

    if (insertError) {
      console.error("Error creating default settings:", insertError)
      return null
    }

    return inserted
  }

  static async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating settings:", error)
      return null
    }

    return data
  }

  // --- Avatar ---
  static async uploadAvatar(userId: string, file: File): Promise<string | null> {
    const fileExt = file.name.split(".").pop()
    
    // Menggunakan nama file yang konsisten 'avatar' agar file lama otomatis ditimpa.
    const filePath = `${userId}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError)
      return null
    }
    
    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath)
    
    // Mengembalikan URL yang bersih tanpa timestamp untuk disimpan di DB
    return publicUrlData.publicUrl
  }

  static getDefaultAvatars(): string[] {
    return [
      "/boy.png",
      "/profile.png",
      "/cat.png",
      "/hacker.png",
      "/man.png",
      "/panda.png",
      "/rabbit.png",
      "/woman.png",
      
    ]
  }
}
