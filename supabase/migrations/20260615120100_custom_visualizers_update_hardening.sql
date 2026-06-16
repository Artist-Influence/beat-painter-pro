-- =============================================================================
-- Harden custom_visualizers UPDATE.
--
-- Problems being fixed:
--   1. The owner UPDATE policy had USING but NO WITH CHECK, so a user could rewrite
--      their own row to set user_id = someone else (ownership reassignment).
--   2. is_public was freely settable by the owner via a direct REST call, bypassing
--      the admin-only "Promote to Standard" UI gate (a user could self-publish).
--   3. Promote-to-Standard couldn't actually work on other users' rows: there was no
--      admin UPDATE policy, so RLS blocked an admin from publishing anyone else's row.
--
-- Note: this is defense-in-depth. The arbitrary-code-execution risk that made public
-- rows dangerous has already been removed in the client (raw jsx_code is no longer
-- executed); public rows now only carry data-only render config.
-- =============================================================================

-- 1) Owner UPDATE: add WITH CHECK so the post-update row must still belong to them.
DROP POLICY IF EXISTS "Users can update their own custom visualizers" ON public.custom_visualizers;
CREATE POLICY "Users can update their own custom visualizers"
  ON public.custom_visualizers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Admin UPDATE: lets an admin curate (promote/unpublish) ANY user's visualizer,
--    which the "Promote to Standard" flow needs.
DROP POLICY IF EXISTS "Admins can update any custom visualizer" ON public.custom_visualizers;
CREATE POLICY "Admins can update any custom visualizer"
  ON public.custom_visualizers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Trigger enforcement that RLS WITH CHECK can't express (needs OLD vs NEW):
--    - ownership can never change on update;
--    - only admins may flip is_public from false -> true (publishing). Owners can
--      still freely edit every other field, and can edit an already-public row.
CREATE OR REPLACE FUNCTION public.enforce_custom_visualizer_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change ownership of a custom visualizer';
  END IF;

  IF COALESCE(NEW.is_public, false) AND NOT COALESCE(OLD.is_public, false)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can publish a visualizer';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_custom_visualizer_update ON public.custom_visualizers;
CREATE TRIGGER trg_enforce_custom_visualizer_update
  BEFORE UPDATE ON public.custom_visualizers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_custom_visualizer_update();
