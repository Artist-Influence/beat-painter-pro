-- Create table for custom visualizers
CREATE TABLE public.custom_visualizers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT,
  code TEXT NOT NULL,
  scale_factor FLOAT NOT NULL DEFAULT 1.0,
  preview_emoji TEXT DEFAULT '✨',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_visualizers ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own custom visualizers" 
ON public.custom_visualizers 
FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own custom visualizers" 
ON public.custom_visualizers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom visualizers" 
ON public.custom_visualizers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom visualizers" 
ON public.custom_visualizers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_visualizers_updated_at
BEFORE UPDATE ON public.custom_visualizers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();