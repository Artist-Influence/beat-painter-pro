-- =============================================================================
-- Beat Painter Pro — complete schema for a FRESH, self-owned Supabase project.
--
-- Run this once in your new project's SQL Editor (Supabase dashboard → SQL Editor
-- → paste → Run). Idempotent — safe to re-run. No data, just structure.
--
-- After it runs, sign up in the app once, then make yourself admin with the
-- snippet at the very bottom.
-- =============================================================================

-- ---- Enum -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- Helper functions -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ---- Tables -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  display_name text,
  artist_name text,
  company text,
  social_link text,
  export_count integer DEFAULT 0,
  generation_count integer DEFAULT 0,
  last_active timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.custom_visualizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  prompt text,
  jsx_code text NOT NULL,
  scale_factor float NOT NULL DEFAULT 1.0,
  preview_emoji text DEFAULT '✨',
  is_public boolean DEFAULT false,
  created_today integer DEFAULT 0,
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.uploaded_visualizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  jsx_file_content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.visualizer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  visualizer_key text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.visualizer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  instagram text NOT NULL,
  bpm numeric NOT NULL,
  visualizer_type text NOT NULL,
  style_selected text,
  drop_timestamp numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.visualizer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  jsx_code text,
  visualizer_key text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- Quota functions (depend on custom_visualizers) -------------------------
CREATE OR REPLACE FUNCTION public.check_visualizer_quota(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_user_id, 'admin') THEN true
    ELSE (SELECT COUNT(*) < 5 FROM public.custom_visualizers WHERE user_id = _user_id) END;
$$;

CREATE OR REPLACE FUNCTION public.get_visualizer_count(_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM public.custom_visualizers WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_visualizer_count(_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM public.custom_visualizers
  WHERE user_id = _user_id AND created_at >= CURRENT_DATE;
$$;

-- custom_visualizers UPDATE guard (ownership immutable; only admins may publish)
CREATE OR REPLACE FUNCTION public.enforce_custom_visualizer_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change ownership of a custom visualizer';
  END IF;
  IF COALESCE(NEW.is_public, false) AND NOT COALESCE(OLD.is_public, false)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can publish a visualizer';
  END IF;
  RETURN NEW;
END; $$;

-- New-user bootstrap: create a profile + default role on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

-- ---- Row Level Security -----------------------------------------------------
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_visualizers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_visualizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizer_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizer_leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizer_templates ENABLE ROW LEVEL SECURITY;

-- profiles: owner read/write; admins read all
DROP POLICY IF EXISTS "Users view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users upsert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Users view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: owner read, admins read all (no client writes — escalation blocked)
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- custom_visualizers: owner CRUD (+ public read); admins may curate (publish)
DROP POLICY IF EXISTS "View own or public custom visualizers" ON public.custom_visualizers;
DROP POLICY IF EXISTS "Create own custom visualizers"        ON public.custom_visualizers;
DROP POLICY IF EXISTS "Update own custom visualizers"        ON public.custom_visualizers;
DROP POLICY IF EXISTS "Admins update any custom visualizer"  ON public.custom_visualizers;
DROP POLICY IF EXISTS "Delete own custom visualizers"        ON public.custom_visualizers;
CREATE POLICY "View own or public custom visualizers" ON public.custom_visualizers FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Create own custom visualizers"         ON public.custom_visualizers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own custom visualizers"         ON public.custom_visualizers FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update any custom visualizer"   ON public.custom_visualizers FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own custom visualizers"         ON public.custom_visualizers FOR DELETE USING (auth.uid() = user_id);

-- uploaded_visualizers: owner CRUD
DROP POLICY IF EXISTS "Users manage own uploads" ON public.uploaded_visualizers;
CREATE POLICY "Users manage own uploads" ON public.uploaded_visualizers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_sessions: owner insert/select; admins read all
DROP POLICY IF EXISTS "Users insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users view own sessions"   ON public.user_sessions;
DROP POLICY IF EXISTS "Admins view all sessions"  ON public.user_sessions;
CREATE POLICY "Users insert own sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own sessions"   ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions"  ON public.user_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- visualizer_events: owner insert/select; admins read all
DROP POLICY IF EXISTS "Users insert own events" ON public.visualizer_events;
DROP POLICY IF EXISTS "Users view own events"   ON public.visualizer_events;
DROP POLICY IF EXISTS "Admins view all events"  ON public.visualizer_events;
CREATE POLICY "Users insert own events" ON public.visualizer_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own events"   ON public.visualizer_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all events"  ON public.visualizer_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- visualizer_leads: public lead-capture form (anyone may submit); admins read
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.visualizer_leads;
DROP POLICY IF EXISTS "Admins view all leads"    ON public.visualizer_leads;
CREATE POLICY "Anyone can submit a lead" ON public.visualizer_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view all leads"    ON public.visualizer_leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- visualizer_templates: world-readable; admins write
DROP POLICY IF EXISTS "Anyone can read templates" ON public.visualizer_templates;
DROP POLICY IF EXISTS "Admins manage templates"   ON public.visualizer_templates;
CREATE POLICY "Anyone can read templates" ON public.visualizer_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage templates"   ON public.visualizer_templates FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---- Triggers ---------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_custom_visualizers_updated_at ON public.custom_visualizers;
CREATE TRIGGER trg_custom_visualizers_updated_at BEFORE UPDATE ON public.custom_visualizers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_enforce_custom_visualizer_update ON public.custom_visualizers;
CREATE TRIGGER trg_enforce_custom_visualizer_update BEFORE UPDATE ON public.custom_visualizers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_custom_visualizer_update();

DROP TRIGGER IF EXISTS trg_uploaded_visualizers_updated_at ON public.uploaded_visualizers;
CREATE TRIGGER trg_uploaded_visualizers_updated_at BEFORE UPDATE ON public.uploaded_visualizers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON public.user_sessions;
CREATE TRIGGER trg_user_sessions_updated_at BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_visualizer_templates_updated_at ON public.visualizer_templates;
CREATE TRIGGER trg_visualizer_templates_updated_at BEFORE UPDATE ON public.visualizer_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---- Indexes ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started   ON public.user_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visualizer_events_user_created ON public.visualizer_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_visualizers_user       ON public.custom_visualizers (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_visualizers_public     ON public.custom_visualizers (is_public) WHERE is_public = true;

-- =============================================================================
-- AFTER signing up in the app, make yourself admin (replace the email):
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE lower(email) = lower('YOUR_EMAIL_HERE')
--   ON CONFLICT (user_id, role) DO NOTHING;
-- =============================================================================
