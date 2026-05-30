/*
  # Create establishments table for admin-managed file collection

  1. New Table
    - establishments: manually managed by admins, publicly readable
    - submitters select establishment from dropdown before uploading
    - no auth required for reading establishments
  
  2. Changes
    - Create establishments table (similar to organizations but no user_id)
    - Add RLS: public read, organizer-only write
    - Update submissions and notifications to reference establishments
*/

-- Create establishments table
CREATE TABLE IF NOT EXISTS public.establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  contact_email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for establishments
-- Public can read (for dropdown on submission form)
CREATE POLICY "Establishments are publicly readable"
  ON public.establishments FOR SELECT
  USING (true);

-- Only organizers can insert/update/delete
CREATE POLICY "Organizers can manage establishments"
  ON public.establishments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM organizers WHERE organizers.id = auth.uid()));

CREATE POLICY "Organizers can update establishments"
  ON public.establishments FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM organizers WHERE organizers.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM organizers WHERE organizers.id = auth.uid()));

CREATE POLICY "Organizers can delete establishments"
  ON public.establishments FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM organizers WHERE organizers.id = auth.uid()));

-- Update submissions to include establishment reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'establishment_id'
  ) THEN
    ALTER TABLE public.submissions ADD COLUMN establishment_id uuid REFERENCES public.establishments(id);
  END IF;
END $$;

-- Update notifications to include establishment reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'establishment_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN establishment_id uuid REFERENCES public.establishments(id);
  END IF;
END $$;
