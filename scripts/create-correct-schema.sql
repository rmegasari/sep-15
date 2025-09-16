-- Create the correct database schema according to user specifications

-- Create categories table with exact columns specified
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category VARCHAR(100) NOT NULL,
  "sub-category" VARCHAR(100),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create profiles table with exact columns specified  
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  "phone-number" TEXT,
  birth_date DATE,
  location TEXT
);

-- Add user_id columns to existing tables if they don't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user-specific data
CREATE POLICY "Users can manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Update existing table policies to be user-specific
DROP POLICY IF EXISTS "Enable all operations for transactions" ON transactions;
DROP POLICY IF EXISTS "Enable all operations for platforms" ON platforms;
DROP POLICY IF EXISTS "Enable all operations for debts" ON debts;
DROP POLICY IF EXISTS "Enable all operations for goals" ON goals;
DROP POLICY IF EXISTS "Enable all operations for budgets" ON budgets;

CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own platforms" ON platforms FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own debts" ON debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Create storage policy for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert some default categories
INSERT INTO categories (category, "sub-category", user_id) VALUES
('Pengeluaran', 'Belanja Bulanan', NULL),
('Pengeluaran', 'Internet', NULL),
('Pengeluaran', 'Bensin', NULL),
('Pengeluaran', 'Hiburan', NULL),
('Pengeluaran', 'Makan & Minum', NULL),
('Pengeluaran', 'Transport', NULL),
('Pengeluaran', 'Kesehatan', NULL),
('Pengeluaran', 'Pendidikan', NULL),
('Pemasukan', 'Gaji', NULL),
('Pemasukan', 'Freelance', NULL),
('Pemasukan', 'Bonus', NULL),
('Pemasukan', 'Investasi', NULL),
('Pemasukan', 'Hadiah', NULL),
('Mutasi', 'Transfer Antar Akun', NULL),
('Mutasi', 'Tarik Tunai', NULL),
('Mutasi', 'Top Up', NULL),
('Hutang', 'Kartu Kredit', NULL),
('Hutang', 'Pinjaman Bank', NULL),
('Hutang', 'Pinjaman Online', NULL),
('Hutang', 'Hutang Pribadi', NULL);
