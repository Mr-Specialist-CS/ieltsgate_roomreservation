-- Supabase SQL Schema for IELTS Gate Room Reservation System
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    floor_number INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT DEFAULT ''
);

-- 2. Create Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_surname TEXT NOT NULL,
    user_phone TEXT DEFAULT '',
    purpose TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    series_id TEXT,
    series_index INTEGER,
    series_total INTEGER,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
);

-- 3. Create Reservation Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_surname TEXT NOT NULL,
    user_phone TEXT DEFAULT '',
    purpose TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    series_id TEXT,
    recurrence JSONB,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
);

-- 4. Create Configuration Table
CREATE TABLE IF NOT EXISTS config (
    id TEXT PRIMARY KEY DEFAULT 'main',
    viewer_access_code TEXT,
    admin_password TEXT,
    building_timezone TEXT DEFAULT 'Asia/Baku',
    building_name TEXT DEFAULT 'IELTS Gate',
    require_viewer_code BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) or grant public access for backend API integration
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;
