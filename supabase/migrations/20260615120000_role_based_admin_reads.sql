-- =============================================================================
-- Role-based admin read access (replaces the email-hardcoded admin policies).
--
-- Context: admin visibility into the analytics tables was previously granted by a
-- policy hardcoded to a single email (jared@artistinfluence.com). This switches to
-- the existing role system (public.user_roles + public.has_role), so admin access
-- is data-driven and consistent with the app's client-side RequireAdmin gate.
--
-- Regular users are UNAFFECTED: their existing "view their own rows" SELECT policies
-- remain, so non-admins still only ever read their own data. There is no data leak
-- being closed here — this is a consistency/maintainability hardening.
-- =============================================================================

-- Safety: make sure the founding admin still has the role before we depend on it,
-- so swapping the email policy for a role policy can't lock anyone out.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = lower('jared@artistinfluence.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'admin'::app_role
  );

-- profiles -----------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- user_sessions ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view all user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all user sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all user sessions"
  ON public.user_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- visualizer_events --------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view all visualizer events" ON public.visualizer_events;
DROP POLICY IF EXISTS "Admins can view all visualizer events" ON public.visualizer_events;
CREATE POLICY "Admins can view all visualizer events"
  ON public.visualizer_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
