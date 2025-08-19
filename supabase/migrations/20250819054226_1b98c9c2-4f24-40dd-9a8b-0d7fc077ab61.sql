-- Fix linter warnings: set search_path and adjust quota to TOTAL (not daily)

-- Replace has_role with explicit search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Replace check_visualizer_quota: total cap 5 for non-admins
CREATE OR REPLACE FUNCTION public.check_visualizer_quota(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN public.has_role(_user_id, 'admin') THEN true
      ELSE (
        SELECT COUNT(*) < 5
        FROM public.custom_visualizers
        WHERE user_id = _user_id
      )
    END;
$$;

-- Replace get_visualizer_count: total count
CREATE OR REPLACE FUNCTION public.get_visualizer_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.custom_visualizers
  WHERE user_id = _user_id;
$$;