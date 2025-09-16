-- Sync script for new Supabase instance
-- Run this script in your new Supabase SQL editor to set up the database

-- Database schema for Supabase integration
-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  "sub-category" VARCHAR(100),
  description TEXT,
  nominal DECIMAL(15,2) NOT NULL,
  account VARCHAR(100) NOT NULL,
  destination_account VARCHAR(100), -- Added destination_account for transfer transactions
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
  id SERIAL PRIMARY KEY,
  account VARCHAR(100) NOT NULL UNIQUE,
  type_account VARCHAR(50) NOT NULL,
  saldo DECIMAL(15,2) DEFAULT 0,
  color VARCHAR(7) DEFAULT '#000000',
  saving BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  remaining DECIMAL(15,2) NOT NULL,
  interest DECIMAL(5,2) DEFAULT 0,
  minimum DECIMAL(15,2) DEFAULT 0,
  "due-date" DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  goal VARCHAR(200) NOT NULL,
  target DECIMAL(15,2) NOT NULL,
  deadline DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - customize based on auth requirements)
CREATE POLICY "Enable all operations for transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Enable all operations for platforms" ON platforms FOR ALL USING (true);
CREATE POLICY "Enable all operations for debts" ON debts FOR ALL USING (true);
CREATE POLICY "Enable all operations for goals" ON goals FOR ALL USING (true);

-- Insert sample categories for transactions
INSERT INTO transactions (date, category, "sub-category", description, nominal, account) VALUES
('2024-01-01', 'Food', 'Restaurant', 'Sample transaction', 50000, 'Cash'),
('2024-01-02', 'Transport', 'Fuel', 'Sample fuel expense', 100000, 'Bank Account')
ON CONFLICT DO NOTHING;

-- Insert sample platforms
INSERT INTO platforms (account, type_account, saldo, color, saving) VALUES
('Cash', 'Cash', 500000, '#22c55e', false),
('Bank Account', 'Savings', 2000000, '#3b82f6', true),
('Credit Card', 'Credit', -150000, '#ef4444', false)
ON CONFLICT (account) DO NOTHING;
