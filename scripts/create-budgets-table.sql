-- Create budgets table for monthly budgeting feature
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  amount DECIMAL(15,2) NOT NULL,
  period VARCHAR(20) DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  spent DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create policy for budgets
CREATE POLICY "Enable all operations for budgets" ON budgets FOR ALL USING (true);
