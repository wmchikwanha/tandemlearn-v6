-- Add kamuchabeauty@gmail.com to admin whitelist
INSERT INTO public.admin_whitelist (email, notes)
VALUES ('kamuchabeauty@gmail.com', 'Education Manager - Main Teacher')
ON CONFLICT (email) DO NOTHING;

-- Add link_url column to lesson_materials for external links
ALTER TABLE public.lesson_materials
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS material_type TEXT DEFAULT 'file';