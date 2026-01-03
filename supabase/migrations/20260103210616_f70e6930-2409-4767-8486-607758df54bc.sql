-- Add config column for storing random visualizer parameters
ALTER TABLE public.custom_visualizers 
ADD COLUMN IF NOT EXISTS config JSONB;