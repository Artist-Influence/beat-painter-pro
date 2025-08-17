-- Add missing columns to existing custom_visualizers table
ALTER TABLE public.custom_visualizers 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS scale_factor FLOAT NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS preview_emoji TEXT DEFAULT '✨',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Update the prompt column to be nullable since it might be empty for some visualizers
ALTER TABLE public.custom_visualizers 
ALTER COLUMN prompt DROP NOT NULL;