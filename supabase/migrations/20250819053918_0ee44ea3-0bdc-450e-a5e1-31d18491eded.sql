-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add quota tracking to custom_visualizers table
ALTER TABLE public.custom_visualizers 
ADD COLUMN IF NOT EXISTS created_today INTEGER DEFAULT 0;

-- Create function to check daily quota
CREATE OR REPLACE FUNCTION public.check_visualizer_quota(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN public.has_role(_user_id, 'admin') THEN true
      ELSE (
        SELECT COUNT(*) < 5
        FROM public.custom_visualizers
        WHERE user_id = _user_id
        AND created_at >= CURRENT_DATE
      )
    END
$$;

-- Add function to get user's daily visualizer count
CREATE OR REPLACE FUNCTION public.get_daily_visualizer_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.custom_visualizers
  WHERE user_id = _user_id
  AND created_at >= CURRENT_DATE
$$;