-- Create categories table for Supabase integration
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'income', 'expense', 'transfer', 'debt'
  parent_id INTEGER REFERENCES categories(id), -- For subcategories
  is_default BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, type, is_default) VALUES
('Pengeluaran', 'expense', true),
('Pemasukan', 'income', true),
('Mutasi', 'transfer', true),
('Hutang', 'debt', true);

-- Insert default subcategories for Pengeluaran
INSERT INTO categories (name, type, parent_id, is_default) VALUES
('Belanja Bulanan', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true),
('Internet', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true),
('Bensin', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true),
('Hiburan', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true),
('Makan & Minum', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true),
('Transport', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true),
('Kesehatan', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true),
('Pendidikan', 'expense', (SELECT id FROM categories WHERE name = 'Pengeluaran'), true);

-- Insert default subcategories for Pemasukan
INSERT INTO categories (name, type, parent_id, is_default) VALUES
('Gaji', 'income', (SELECT id FROM categories WHERE name = 'Pemasukan'), true),
('Freelance', 'income', (SELECT id FROM categories WHERE name = 'Pemasukan'), true),
('Bonus', 'income', (SELECT id FROM categories WHERE name = 'Pemasukan'), true),
('Investasi', 'income', (SELECT id FROM categories WHERE name = 'Pemasukan'), true),
('Hadiah', 'income', (SELECT id FROM categories WHERE name = 'Pemasukan'), true),
('Lainnya', 'income', (SELECT id FROM categories WHERE name = 'Pemasukan'), true);

-- Insert default subcategories for Mutasi
INSERT INTO categories (name, type, parent_id, is_default) VALUES
('Transfer Antar Akun', 'transfer', (SELECT id FROM categories WHERE name = 'Mutasi'), true),
('Tarik Tunai', 'transfer', (SELECT id FROM categories WHERE name = 'Mutasi'), true),
('Top Up', 'transfer', (SELECT id FROM categories WHERE name = 'Mutasi'), true),
('Setor Tunai', 'transfer', (SELECT id FROM categories WHERE name = 'Mutasi'), true);

-- Insert default subcategories for Hutang
INSERT INTO categories (name, type, parent_id, is_default) VALUES
('Kartu Kredit', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true),
('Pinjaman Bank', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true),
('Pinjaman Online', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true),
('Hutang Pribadi', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true),
('Cicilan Barang', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true),
('KTA (Kredit Tanpa Agunan)', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true),
('Mortgage', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true),
('Lainnya', 'debt', (SELECT id FROM categories WHERE name = 'Hutang'), true);

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy for categories
CREATE POLICY "Enable all operations for categories" ON categories FOR ALL USING (true);
