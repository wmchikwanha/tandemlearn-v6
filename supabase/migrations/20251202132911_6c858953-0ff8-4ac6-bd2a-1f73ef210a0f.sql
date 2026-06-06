-- Create admin whitelist table for testing phase
CREATE TABLE public.admin_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage whitelist
CREATE POLICY "Admins can manage whitelist" ON public.admin_whitelist
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Allow checking during signup (anyone can read to verify)
CREATE POLICY "Anyone can check whitelist during signup" ON public.admin_whitelist
  FOR SELECT USING (true);

-- Seed initial admin emails
INSERT INTO public.admin_whitelist (email, notes) VALUES
  ('wmchikwanha@gmail.com', 'Developer - Primary Admin'),
  ('kururama.chidziva@gmail.com', 'Partner daughter - Admin');