-- Extend account-scoped storage for all durable user data.

ALTER TABLE public.user_libraries
  ADD COLUMN IF NOT EXISTS user_profile JSONB
    NOT NULL DEFAULT '{}'::JSONB,

  ADD COLUMN IF NOT EXISTS speech_profile JSONB
    NOT NULL DEFAULT '{}'::JSONB,

  ADD COLUMN IF NOT EXISTS listening_history JSONB
    NOT NULL DEFAULT '[]'::JSONB,

  ADD COLUMN IF NOT EXISTS favorite_scriptures JSONB
    NOT NULL DEFAULT '[]'::JSONB,

  ADD COLUMN IF NOT EXISTS chat_sessions JSONB
    NOT NULL DEFAULT '[]'::JSONB,

  ADD COLUMN IF NOT EXISTS liked_flyer_ids JSONB
    NOT NULL DEFAULT '[]'::JSONB,

  ADD COLUMN IF NOT EXISTS liked_clip_ids JSONB
    NOT NULL DEFAULT '[]'::JSONB,

  ADD COLUMN IF NOT EXISTS saved_clip_ids JSONB
    NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE public.user_libraries
  DROP CONSTRAINT IF EXISTS user_libraries_user_profile_object,
  DROP CONSTRAINT IF EXISTS user_libraries_speech_profile_object,
  DROP CONSTRAINT IF EXISTS user_libraries_history_array,
  DROP CONSTRAINT IF EXISTS user_libraries_scriptures_array,
  DROP CONSTRAINT IF EXISTS user_libraries_chats_array,
  DROP CONSTRAINT IF EXISTS user_libraries_flyers_array,
  DROP CONSTRAINT IF EXISTS user_libraries_liked_clips_array,
  DROP CONSTRAINT IF EXISTS user_libraries_saved_clips_array;

ALTER TABLE public.user_libraries
  ADD CONSTRAINT user_libraries_user_profile_object
    CHECK (jsonb_typeof(user_profile) = 'object'),

  ADD CONSTRAINT user_libraries_speech_profile_object
    CHECK (jsonb_typeof(speech_profile) = 'object'),

  ADD CONSTRAINT user_libraries_history_array
    CHECK (jsonb_typeof(listening_history) = 'array'),

  ADD CONSTRAINT user_libraries_scriptures_array
    CHECK (jsonb_typeof(favorite_scriptures) = 'array'),

  ADD CONSTRAINT user_libraries_chats_array
    CHECK (jsonb_typeof(chat_sessions) = 'array'),

  ADD CONSTRAINT user_libraries_flyers_array
    CHECK (jsonb_typeof(liked_flyer_ids) = 'array'),

  ADD CONSTRAINT user_libraries_liked_clips_array
    CHECK (jsonb_typeof(liked_clip_ids) = 'array'),

  ADD CONSTRAINT user_libraries_saved_clips_array
    CHECK (jsonb_typeof(saved_clip_ids) = 'array');

COMMENT ON COLUMN public.user_libraries.user_profile IS
  'Name, voice, chatbot name, Church preference, and coach configuration';

COMMENT ON COLUMN public.user_libraries.speech_profile IS
  'Listening totals, favorite count, streak, and speech profile';

COMMENT ON COLUMN public.user_libraries.listening_history IS
  'Account listening history and playback progress';

COMMENT ON COLUMN public.user_libraries.favorite_scriptures IS
  'Saved scriptures and private user notes';

COMMENT ON COLUMN public.user_libraries.chat_sessions IS
  'AI chat sessions and messages owned by the user';

COMMENT ON COLUMN public.user_libraries.liked_flyer_ids IS
  'Motivational flyer IDs liked by the user';

COMMENT ON COLUMN public.user_libraries.liked_clip_ids IS
  'Short clip IDs liked by the user';

COMMENT ON COLUMN public.user_libraries.saved_clip_ids IS
  'Short clip IDs saved by the user';
