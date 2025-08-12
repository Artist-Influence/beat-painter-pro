-- Admin RLS policies, indexes, and housekeeping triggers
-- 1) Allow admin (by email) to SELECT all rows in key tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admin can view all profiles'
  ) THEN
    CREATE POLICY "Admin can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (lower((auth.jwt() ->> 'email')) = 'jared@artistinfluence.com');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'Admin can view all user sessions'
  ) THEN
    CREATE POLICY "Admin can view all user sessions"
    ON public.user_sessions
    FOR SELECT
    USING (lower((auth.jwt() ->> 'email')) = 'jared@artistinfluence.com');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'visualizer_events' AND policyname = 'Admin can view all visualizer events'
  ) THEN
    CREATE POLICY "Admin can view all visualizer events"
    ON public.visualizer_events
    FOR SELECT
    USING (lower((auth.jwt() ->> 'email')) = 'jared@artistinfluence.com');
  END IF;
END $$;

-- 2) Ensure profiles.user_id is unique for upserts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 3) Add updated_at triggers where missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_uploaded_visualizers_updated_at') THEN
    CREATE TRIGGER trg_uploaded_visualizers_updated_at
    BEFORE UPDATE ON public.uploaded_visualizers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_custom_visualizers_updated_at') THEN
    CREATE TRIGGER trg_custom_visualizers_updated_at
    BEFORE UPDATE ON public.custom_visualizers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_sessions_updated_at') THEN
    CREATE TRIGGER trg_user_sessions_updated_at
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_visualizer_events_updated_at') THEN
    CREATE TRIGGER trg_visualizer_events_updated_at
    BEFORE UPDATE ON public.visualizer_events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_visualizer_templates_updated_at') THEN
    CREATE TRIGGER trg_visualizer_templates_updated_at
    BEFORE UPDATE ON public.visualizer_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) Performance indexes for analytics
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started
  ON public.user_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_visualizer_events_user_created
  ON public.visualizer_events (user_id, created_at DESC);
