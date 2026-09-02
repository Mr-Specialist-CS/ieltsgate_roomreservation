-- IELTS Gate Reservation System - Supabase PostgreSQL Database Schema

-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  floor_number INT NOT NULL,
  capacity INT NOT NULL,
  type TEXT NOT NULL,
  description TEXT DEFAULT ''
);

-- 2. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_surname TEXT NOT NULL,
  user_phone TEXT DEFAULT '',
  purpose TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  series_id TEXT,
  series_index INT,
  series_total INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active'
);

-- 3. Reservation Requests Table
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_surname TEXT NOT NULL,
  user_phone TEXT DEFAULT '',
  purpose TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  recurrence JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending'
);

-- 4. Facility Config Table
CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  viewer_access_code TEXT DEFAULT '',
  admin_password TEXT DEFAULT '',
  building_timezone TEXT DEFAULT 'Asia/Baku',
  building_name TEXT DEFAULT 'IELTS Gate',
  require_viewer_code BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) so API queries can run directly
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;

-- GRANT full table permissions to API roles (anon, authenticated, service_role)
GRANT ALL ON TABLE rooms TO anon, authenticated, service_role;
GRANT ALL ON TABLE reservations TO anon, authenticated, service_role;
GRANT ALL ON TABLE requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE config TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
