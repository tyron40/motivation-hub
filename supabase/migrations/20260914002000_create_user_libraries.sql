-- Durable, account-scoped favorites and playlists.
-- AsyncStorage remains available to the app as its offline cache.

CREATE TABLE IF NOT EXISTS public.user_libraries (
  user_id UUID PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  favorite_speeches JSONB NOT NULL
    DEFAULT '[]'::JSONB,

  playlists JSONB NOT NULL
    DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW(),

  CONSTRAINT user_libraries_favorites_array
    CHECK (jsonb_typeof(favorite_speeches) = 'array'),

  CONSTRAINT user_libraries_playlists_array
    CHECK (jsonb_typeof(playlists) = 'array')
);

ALTER TABLE public.user_libraries
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_libraries
  FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_libraries_select_own
  ON public.user_libraries;

CREATE POLICY user_libraries_select_own
  ON public.user_libraries
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_libraries_insert_own
  ON public.user_libraries;

CREATE POLICY user_libraries_insert_own
  ON public.user_libraries
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_libraries_update_own
  ON public.user_libraries;

CREATE POLICY user_libraries_update_own
  ON public.user_libraries
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_libraries_delete_own
  ON public.user_libraries;

CREATE POLICY user_libraries_delete_own
  ON public.user_libraries
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.user_libraries
  TO authenticated;

REVOKE ALL
  ON public.user_libraries
  FROM anon;

CREATE OR REPLACE FUNCTION public.set_user_library_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_library_updated_at
  ON public.user_libraries;

CREATE TRIGGER set_user_library_updated_at
BEFORE UPDATE
  ON public.user_libraries
FOR EACH ROW
EXECUTE FUNCTION public.set_user_library_updated_at();

COMMENT ON TABLE public.user_libraries IS
  'Account-scoped favorite speech snapshots and playlists';

COMMENT ON COLUMN public.user_libraries.favorite_speeches IS
  'Full speech snapshots so favorites survive feed rotation';

COMMENT ON COLUMN public.user_libraries.playlists IS
  'User-created playlist records and their speech IDs';
