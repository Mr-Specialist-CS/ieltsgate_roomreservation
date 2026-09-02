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

-- Enable RLS & add policies for application access
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to rooms" ON rooms;
CREATE POLICY "Allow all access to rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to reservations" ON reservations;
CREATE POLICY "Allow all access to reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to requests" ON requests;
CREATE POLICY "Allow all access to requests" ON requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to config" ON config;
CREATE POLICY "Allow all access to config" ON config FOR ALL USING (true) WITH CHECK (true);
