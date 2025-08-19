-- Ensure jsx_code column exists and migrate any legacy code column
DO $$
BEGIN
  -- Add jsx_code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_visualizers' AND column_name = 'jsx_code') THEN
    ALTER TABLE public.custom_visualizers ADD COLUMN jsx_code TEXT;
  END IF;
  
  -- If legacy code column exists, backfill jsx_code and drop code
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_visualizers' AND column_name = 'code') THEN
    UPDATE public.custom_visualizers SET jsx_code = code WHERE jsx_code IS NULL;
    ALTER TABLE public.custom_visualizers DROP COLUMN code;
  END IF;
  
  -- Ensure jsx_code is NOT NULL
  ALTER TABLE public.custom_visualizers ALTER COLUMN jsx_code SET NOT NULL;
END
$$;

-- Ensure admin role exists for jared@artistinfluence.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'jared@artistinfluence.com'
ON CONFLICT (user_id, role) DO NOTHING;