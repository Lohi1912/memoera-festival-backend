-- ============================================================
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Active users table (stores every app user who registers)
CREATE TABLE IF NOT EXISTS app_users (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT    UNIQUE NOT NULL,
  user_name    TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Festival notifications table (one row per user per blast)
CREATE TABLE IF NOT EXISTS festival_notifications (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        TEXT    NOT NULL,
  festival_name  TEXT    NOT NULL,
  image_url      TEXT    NOT NULL,
  is_read        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup: all notifications for a user, newest first
CREATE INDEX IF NOT EXISTS idx_festival_notif_user
  ON festival_notifications(user_id, created_at DESC);

-- 3. Supabase Storage bucket for greeting images
-- Run this separately in Supabase → Storage → New Bucket:
--   Name: festival-greetings
--   Public: true
