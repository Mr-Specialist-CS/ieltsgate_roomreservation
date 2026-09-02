import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { supabase, isSupabaseConfigured } from './supabaseClient';

dotenv.config();

interface Room {
  id: string;
  name: string;
  floor_number: number;
  capacity: number;
  type: 'speaking_studio' | 'test_hall' | 'audio_booth' | 'lab' | 'briefing' | 'faculty';
  description: string;
}

interface Reservation {
  id: string;
  room_id: string;
  user_name: string;
  user_surname: string;
  user_phone: string;
  purpose: string;
  start_time: string;
  end_time: string;
  series_id: string | null;
  series_index?: number;
  series_total?: number;
  created_at: string;
  status: 'active' | 'ended_early' | 'completed';
}

interface ReservationRequest {
  id: string;
  room_id: string;
  user_name: string;
  user_surname: string;
  user_phone: string;
  purpose: string;
  start_time: string;
  end_time: string;
  series_id?: string | null;
  recurrence?: {
    frequency: 'daily' | 'weekly';
    count: number;
    day_of_week?: number;
  } | null;
  created_at: string;
  status: 'pending';
}

interface AppConfig {
  viewer_access_code: string;
  admin_password: string;
  building_timezone: string;
  building_name: string;
  require_viewer_code: boolean;
}

const DATA_FILE = path.join(process.cwd(), 'facility_data.json');

const INITIAL_ROOMS: Room[] = [
  // 1-ci mərtəbə (Floor 1 - 4 rooms)
  { id: 'r1_study1', name: 'Study Room 1', floor_number: 1, capacity: 6, type: 'lab', description: 'Quiet individual and small group study room' },
  { id: 'r1_study2', name: 'Study Room 2', floor_number: 1, capacity: 6, type: 'lab', description: 'Quiet individual and small group study room' },
  { id: 'r1_glass', name: 'Glass Room', floor_number: 1, capacity: 8, type: 'speaking_studio', description: 'Glass-enclosed mock interview and speaking studio' },
  { id: 'r1_movie', name: 'Movie Room', floor_number: 1, capacity: 16, type: 'audio_booth', description: 'Audiovisual media screening and presentation room' },

  // 2-ci mərtəbə (Floor 2 - 5 rooms)
  { id: 'r2_robotics', name: 'Robotics Room', floor_number: 2, capacity: 14, type: 'lab', description: 'Robotics, STEM and technology workshop lab' },
  { id: 'r2_room6', name: 'Room 6', floor_number: 2, capacity: 18, type: 'test_hall', description: 'General academic training and test classroom' },
  { id: 'r2_room7', name: 'Room 7', floor_number: 2, capacity: 18, type: 'test_hall', description: 'General academic training and test classroom' },
  { id: 'r2_room8', name: 'Room 8', floor_number: 2, capacity: 18, type: 'test_hall', description: 'General academic training and test classroom' },
  { id: 'r2_room_behind_6', name: 'Room behind 6', floor_number: 2, capacity: 8, type: 'faculty', description: 'Small examination and meeting room behind Room 6' },

  // 3-cü mərtəbə (Floor 3 - 6 rooms)
  { id: 'r3_room0', name: 'Room 0', floor_number: 3, capacity: 10, type: 'faculty', description: 'Executive study and invigilator consultation room' },
  { id: 'r3_room1', name: 'Room 1', floor_number: 3, capacity: 20, type: 'test_hall', description: 'Main testing and examination hall' },
  { id: 'r3_room2', name: 'Room 2', floor_number: 3, capacity: 20, type: 'test_hall', description: 'Main testing and examination hall' },
  { id: 'r3_room3', name: 'Room 3', floor_number: 3, capacity: 20, type: 'test_hall', description: 'Main testing and examination hall' },
  { id: 'r3_room4', name: 'Room 4', floor_number: 3, capacity: 20, type: 'test_hall', description: 'Main testing and examination hall' },
  { id: 'r3_room5', name: 'Room 5', floor_number: 3, capacity: 20, type: 'test_hall', description: 'Main testing and examination hall' },
];

function generateSeedReservations(): Reservation[] {
  const now = new Date();
  const reservations: Reservation[] = [];

  // Helper to create date relative to today
  const createDate = (dayOffset: number, hours: number, minutes: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const sampleData = [
    // Today
    {
      roomId: 'r1_study1',
      name: 'Elena',
      surname: 'Rostova',
      phone: '+44 7700 900123',
      purpose: 'IELTS Speaking Diagnostic Batch 1',
      dayOffset: 0,
      startH: 9, startM: 0, endH: 11, endM: 30,
      seriesId: 'series_ielts_prep_1'
    },
    {
      roomId: 'r1_glass',
      name: 'Dr. Arthur',
      surname: 'Pendleton',
      phone: '+44 7700 900456',
      purpose: 'Senior Examiner Video Evaluation',
      dayOffset: 0,
      startH: 12, startM: 0, endH: 14, endM: 0,
      seriesId: null
    },
    {
      roomId: 'r1_study2',
      name: 'Marcus',
      surname: 'Vance',
      phone: '+44 7700 900789',
      purpose: 'Speaking Interview Recording (Band 8+ Prep)',
      dayOffset: 0,
      startH: 10, startM: 0, endH: 12, endM: 0,
      seriesId: null
    },
    {
      roomId: 'r2_robotics',
      name: 'Prof. Gillian',
      surname: 'Hayes',
      phone: '+44 7700 900321',
      purpose: 'Academic Writing Task 2 Masterclass',
      dayOffset: 0,
      startH: 13, startM: 0, endH: 16, endM: 0,
      seriesId: 'series_writing_thu'
    },
    {
      roomId: 'r2_room6',
      name: 'Cambridge Board',
      surname: 'Invigilator Team',
      phone: '+44 7700 900888',
      purpose: 'Official Saturday Academic IELTS Test',
      dayOffset: 0,
      startH: 8, startM: 30, endH: 12, endM: 45,
      seriesId: null
    },
    {
      roomId: 'r2_room_behind_6',
      name: 'Tariq',
      surname: 'Al-Mansoor',
      phone: '+44 7700 900999',
      purpose: 'Listening Section 4 Acoustic Simulation',
      dayOffset: 0,
      startH: 14, startM: 30, endH: 16, endM: 30,
      seriesId: null
    },
    {
      roomId: 'r3_room0',
      name: 'Chief Moderator',
      surname: 'Zhang',
      phone: '+44 7700 900555',
      purpose: 'Examiner Calibration & Sample Auditing',
      dayOffset: 0,
      startH: 11, startM: 0, endH: 13, endM: 30,
      seriesId: null
    },
    {
      roomId: 'r3_room1',
      name: 'Sophie',
      surname: 'Laurent',
      phone: '+44 7700 900222',
      purpose: 'Accent Modulation & Fluency Drill',
      dayOffset: 0,
      startH: 15, startM: 0, endH: 17, endM: 15,
      seriesId: null
    },

    // Tomorrow (Day 1)
    {
      roomId: 'r1_study1',
      name: 'Elena',
      surname: 'Rostova',
      phone: '+44 7700 900123',
      purpose: 'IELTS Speaking Diagnostic Batch 2',
      dayOffset: 1,
      startH: 9, startM: 0, endH: 11, endM: 30,
      seriesId: 'series_ielts_prep_1'
    },
    {
      roomId: 'r1_movie',
      name: 'Vikram',
      surname: 'Patel',
      phone: '+44 7700 900654',
      purpose: 'Audio Frequency Test & Speech Analysis',
      dayOffset: 1,
      startH: 10, startM: 0, endH: 12, endM: 0,
      seriesId: null
    },
    {
      roomId: 'r2_room7',
      name: 'Hannah',
      surname: 'Lindqvist',
      phone: '+44 7700 900111',
      purpose: 'General Training Reading Speed Sprint',
      dayOffset: 1,
      startH: 13, startM: 30, endH: 15, endM: 30,
      seriesId: null
    },
    {
      roomId: 'r3_room2',
      name: 'Mock Exam Dept',
      surname: 'Admissions',
      phone: '+44 7700 900444',
      purpose: 'Complete 3-Hour Timed Mock Test',
      dayOffset: 1,
      startH: 9, startM: 0, endH: 12, endM: 30,
      seriesId: 'series_mock_wed'
    },

    // Day 2
    {
      roomId: 'r1_glass',
      name: 'Julian',
      surname: 'Cole',
      phone: '+44 7700 900777',
      purpose: 'Cue Card Speaking Strategy Workshop',
      dayOffset: 2,
      startH: 14, startM: 0, endH: 16, endM: 30,
      seriesId: null
    },
    {
      roomId: 'r2_room8',
      name: 'Dr. Robert',
      surname: 'Vance',
      phone: '+44 7700 900333',
      purpose: 'Examiner Training Level 2',
      dayOffset: 2,
      startH: 9, startM: 30, endH: 12, endM: 0,
      seriesId: 'series_examiner_weekly'
    },

    // Day 3 to 7
    {
      roomId: 'r2_robotics',
      name: 'Prof. Gillian',
      surname: 'Hayes',
      phone: '+44 7700 900321',
      purpose: 'Academic Writing Task 1 Data Analytics',
      dayOffset: 4,
      startH: 13, startM: 0, endH: 16, endM: 0,
      seriesId: 'series_writing_thu'
    },
    {
      roomId: 'r3_room3',
      name: 'Mock Exam Dept',
      surname: 'Admissions',
      phone: '+44 7700 900444',
      purpose: 'Complete 3-Hour Timed Mock Test',
      dayOffset: 5,
      startH: 9, startM: 0, endH: 12, endM: 30,
      seriesId: 'series_mock_wed'
    },
    {
      roomId: 'r2_room8',
      name: 'Dr. Robert',
      surname: 'Vance',
      phone: '+44 7700 900333',
      purpose: 'Examiner Training Level 2',
      dayOffset: 7,
      startH: 9, startM: 30, endH: 12, endM: 0,
      seriesId: 'series_examiner_weekly'
    },
  ];

  let idCounter = 1;
  for (const s of sampleData) {
    reservations.push({
      id: `res_${idCounter++}`,
      room_id: s.roomId,
      user_name: s.name,
      user_surname: s.surname,
      user_phone: s.phone,
      purpose: s.purpose,
      start_time: createDate(s.dayOffset, s.startH, s.startM),
      end_time: createDate(s.dayOffset, s.endH, s.endM),
      series_id: s.seriesId,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      status: 'active',
    });
  }

  return reservations;
}

function generateSeedRequests(): ReservationRequest[] {
  const now = new Date();
  const createDate = (dayOffset: number, hours: number, minutes: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'req_101',
      room_id: 'r1_study1',
      user_name: 'David',
      user_surname: 'O\'Connor',
      user_phone: '+44 7890 112233',
      purpose: 'One-on-one Academic Mock Speaking Test',
      start_time: createDate(0, 16, 0),
      end_time: createDate(0, 17, 30),
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'pending',
      recurrence: null
    },
    {
      id: 'req_102',
      room_id: 'r2_room_behind_6',
      user_name: 'Amina',
      user_surname: 'Kassim',
      user_phone: '+44 7890 445566',
      purpose: 'Listening Section 2 Distractor Analysis Session',
      start_time: createDate(1, 14, 0),
      end_time: createDate(1, 15, 45),
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      status: 'pending',
      recurrence: {
        frequency: 'weekly',
        count: 4,
      }
    },
    {
      id: 'req_103',
      room_id: 'r3_room0',
      user_name: 'Oliver',
      user_surname: 'Sterling',
      user_phone: '+44 7890 778899',
      purpose: 'Video Distance Speaking Session with Cambridge Assessor',
      start_time: createDate(2, 11, 0),
      end_time: createDate(2, 12, 30),
      created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      status: 'pending',
      recurrence: null
    }
  ];
}

class FacilityStore {
  rooms: Room[] = INITIAL_ROOMS;
  reservations: Reservation[] = [];
  requests: ReservationRequest[] = [];
  config: AppConfig = {
    viewer_access_code: process.env.VIEWER_ACCESS_CODE || '',
    admin_password: process.env.ADMIN_PASSWORD || '',
    building_timezone: process.env.BUILDING_TIMEZONE || 'Asia/Baku',
    building_name: process.env.BUILDING_NAME || 'IELTS Gate',
    require_viewer_code: process.env.REQUIRE_VIEWER_CODE !== 'false',
  };
  sseClients: Set<express.Response> = new Set();

  constructor() {
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.rooms?.length) this.rooms = parsed.rooms;
        if (Array.isArray(parsed.reservations)) this.reservations = parsed.reservations;
        else this.reservations = [];
        if (Array.isArray(parsed.requests)) this.requests = parsed.requests;
        else this.requests = [];
        if (parsed.config) {
          this.config = {
            ...this.config,
            building_timezone: parsed.config.building_timezone || this.config.building_timezone,
            building_name: parsed.config.building_name || this.config.building_name,
            require_viewer_code: parsed.config.require_viewer_code ?? this.config.require_viewer_code,
            viewer_access_code: process.env.VIEWER_ACCESS_CODE || parsed.config.viewer_access_code || '',
            admin_password: process.env.ADMIN_PASSWORD || parsed.config.admin_password || '',
          };
        }
      } else {
        this.reservations = [];
        this.requests = [];
        this.save();
      }
    } catch (err) {
      console.error('Error loading local data file:', err);
      this.reservations = [];
      this.requests = [];
    }
  }

  async loadFromSupabase() {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('ℹ️ Supabase environment variables not configured. Running with local storage.');
      return;
    }

    try {
      console.log('🔄 Syncing state with Supabase PostgreSQL database...');

      // 1. Fetch Rooms
      const { data: dbRooms, error: roomsErr } = await supabase.from('rooms').select('*');
      if (roomsErr) {
        console.error('Error fetching rooms from Supabase:', roomsErr.message);
      } else if (!dbRooms || dbRooms.length === 0) {
        console.log('🌱 Rooms table is empty in Supabase. Seeding initial facility rooms...');
        const { error: seedErr } = await supabase.from('rooms').insert(INITIAL_ROOMS);
        if (seedErr) {
          console.error('Error seeding rooms to Supabase:', seedErr.message);
        } else {
          this.rooms = INITIAL_ROOMS;
        }
      } else {
        this.rooms = dbRooms as Room[];
      }

      // 2. Fetch Reservations
      const { data: dbRes, error: resErr } = await supabase.from('reservations').select('*');
      if (resErr) {
        console.error('Error fetching reservations from Supabase:', resErr.message);
      } else if (dbRes) {
        this.reservations = dbRes as Reservation[];
      }

      // 3. Fetch Requests
      const { data: dbReq, error: reqErr } = await supabase.from('requests').select('*');
      if (reqErr) {
        console.error('Error fetching requests from Supabase:', reqErr.message);
      } else if (dbReq) {
        this.requests = dbReq as ReservationRequest[];
      }

      // 4. Fetch Config
      const { data: dbConfig, error: cfgErr } = await supabase.from('config').select('*').eq('id', 'main').maybeSingle();
      if (cfgErr) {
        console.error('Error fetching config from Supabase:', cfgErr.message);
      } else if (dbConfig) {
        this.config = {
          ...this.config,
          building_timezone: dbConfig.building_timezone || this.config.building_timezone,
          building_name: dbConfig.building_name || this.config.building_name,
          require_viewer_code: dbConfig.require_viewer_code ?? this.config.require_viewer_code,
          viewer_access_code: dbConfig.viewer_access_code || process.env.VIEWER_ACCESS_CODE || this.config.viewer_access_code || '',
          admin_password: dbConfig.admin_password || process.env.ADMIN_PASSWORD || this.config.admin_password || '',
        };
      }

      console.log(`✅ State synced with Supabase successfully (${this.rooms.length} rooms, ${this.reservations.length} reservations, ${this.requests.length} requests).`);
      await this.cleanupOldData();
      this.save();
    } catch (err: any) {
      console.error('Failed to sync state with Supabase:', err?.message || err);
    }
  }

  async cleanupOldData() {
    const twoWeeksAgoMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const cutoffIso = new Date(twoWeeksAgoMs).toISOString();

    const prevResCount = this.reservations.length;
    const prevReqCount = this.requests.length;

    this.reservations = this.reservations.filter(r => new Date(r.end_time).getTime() >= twoWeeksAgoMs);
    this.requests = this.requests.filter(r => new Date(r.end_time).getTime() >= twoWeeksAgoMs);

    const purgedRes = prevResCount - this.reservations.length;
    const purgedReq = prevReqCount - this.requests.length;

    if (purgedRes > 0 || purgedReq > 0) {
      console.log(`🧹 Auto-cleaned ${purgedRes} old reservations and ${purgedReq} old requests older than 14 days.`);
      this.save();
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: resErr } = await supabase.from('reservations').delete().lt('end_time', cutoffIso);
        if (resErr) console.error('Error auto-cleaning old reservations from Supabase:', resErr.message);

        const { error: reqErr } = await supabase.from('requests').delete().lt('end_time', cutoffIso);
        if (reqErr) console.error('Error auto-cleaning old requests from Supabase:', reqErr.message);
      } catch (e: any) {
        console.error('Supabase auto-cleanup error:', e?.message || e);
      }
    }
  }

  save() {
    try {
      const data = {
        rooms: this.rooms,
        reservations: this.reservations,
        requests: this.requests,
        config: {
          building_timezone: this.config.building_timezone,
          building_name: this.config.building_name,
          require_viewer_code: this.config.require_viewer_code,
        },
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving local data file:', err);
    }
  }

  async saveReservationToSupabase(resItem: Reservation) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from('reservations').upsert(resItem);
      if (error) console.error('Supabase reservation upsert error:', error.message);
    } catch (e: any) {
      console.error('Supabase error saving reservation:', e?.message || e);
    }
  }

  async saveReservationsToSupabase(resItems: Reservation[]) {
    if (!isSupabaseConfigured() || !supabase || !resItems.length) return;
    try {
      const { error } = await supabase.from('reservations').upsert(resItems);
      if (error) console.error('Supabase batch reservations upsert error:', error.message);
    } catch (e: any) {
      console.error('Supabase error saving reservations:', e?.message || e);
    }
  }

  async deleteReservationFromSupabase(id: string, isSeries = false, seriesId?: string | null) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      if (isSeries && seriesId) {
        const { error } = await supabase.from('reservations').delete().eq('series_id', seriesId);
        if (error) console.error('Supabase series delete error:', error.message);
      } else {
        const { error } = await supabase.from('reservations').delete().eq('id', id);
        if (error) console.error('Supabase reservation delete error:', error.message);
      }
    } catch (e: any) {
      console.error('Supabase error deleting reservation:', e?.message || e);
    }
  }

  async saveRequestToSupabase(reqItem: ReservationRequest) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from('requests').upsert(reqItem);
      if (error) console.error('Supabase request upsert error:', error.message);
    } catch (e: any) {
      console.error('Supabase error saving request:', e?.message || e);
    }
  }

  async deleteRequestFromSupabase(id: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) console.error('Supabase request delete error:', error.message);
    } catch (e: any) {
      console.error('Supabase error deleting request:', e?.message || e);
    }
  }

  async saveRoomsToSupabase() {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from('rooms').upsert(this.rooms);
      if (error) console.error('Supabase rooms upsert error:', error.message);
    } catch (e: any) {
      console.error('Supabase error saving rooms:', e?.message || e);
    }
  }

  async saveConfigToSupabase() {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const payload = {
        id: 'main',
        viewer_access_code: this.config.viewer_access_code || '',
        admin_password: this.config.admin_password || '',
        building_timezone: this.config.building_timezone,
        building_name: this.config.building_name,
        require_viewer_code: this.config.require_viewer_code,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('config').upsert(payload);
      if (error) console.error('Supabase config upsert error:', error.message);
    } catch (e: any) {
      console.error('Supabase error saving config:', e?.message || e);
    }
  }

  broadcast(eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  /**
   * Enforce the 1-Minute Buffer Constraint:
   * Two reservations in the same room cannot overlap and must have at least 1 minute (60,000 ms) gap.
   * i.e., if res1 ends at 11:00, res2 cannot start before 11:01.
   * Overlap or conflict exists if: (candStart < resEnd + 60,000) AND (candEnd > resStart - 60,000).
   */
  checkConflict(
    roomId: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ): Reservation | null {
    const candStart = new Date(startTime).getTime();
    const candEnd = new Date(endTime).getTime();

    if (isNaN(candStart) || isNaN(candEnd) || candStart >= candEnd) {
      throw new Error('Invalid start or end time');
    }

    const BUFFER_MS = 60 * 1000; // 1 minute buffer

    for (const res of this.reservations) {
      if (res.room_id !== roomId) continue;
      if (excludeReservationId && res.id === excludeReservationId) continue;
      if (res.status === 'ended_early') {
        // If ended early, consider the actual end_time
      }

      const resStart = new Date(res.start_time).getTime();
      const resEnd = new Date(res.end_time).getTime();

      // Conflict logic with 1-minute buffer requirement
      const hasConflict =
        candStart < resEnd + BUFFER_MS && candEnd > resStart - BUFFER_MS;

      if (hasConflict) {
        return res;
      }
    }
    return null;
  }
}

const store = new FacilityStore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load latest state from Supabase database
  await store.loadFromSupabase();

  // Background 1-hour interval auto-cleanup job (Purges data older than 14 days)
  setInterval(() => {
    store.cleanupOldData();
  }, 60 * 60 * 1000);

  // SSE Stream for Real-time Updates
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.flushHeaders?.();
    store.sseClients.add(res);

    // Send initial snapshot
    const initialData = {
      type: 'INIT_SYNC',
      rooms: store.rooms,
      reservations: store.reservations,
      requests: store.requests,
      config: {
        viewer_access_code: store.config.viewer_access_code,
        admin_password: store.config.admin_password,
        building_timezone: store.config.building_timezone,
        building_name: store.config.building_name,
        require_viewer_code: store.config.require_viewer_code,
      },
      server_time: new Date().toISOString(),
    };
    res.write(`event: sync\ndata: ${JSON.stringify(initialData)}\n\n`);

    const keepAliveTimer = setInterval(() => {
      res.write(': ping\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      store.sseClients.delete(res);
    });
  });

  // State snapshot endpoint
  app.get('/api/state', (req, res) => {
    res.json({
      rooms: store.rooms,
      reservations: store.reservations,
      requests: store.requests,
      config: {
        viewer_access_code: store.config.viewer_access_code,
        admin_password: store.config.admin_password,
        building_timezone: store.config.building_timezone,
        building_name: store.config.building_name,
        require_viewer_code: store.config.require_viewer_code,
      },
      server_time: new Date().toISOString(),
    });
  });

  // Auth: Viewer Access Code Validation (Gate 1)
  app.post('/api/auth/viewer', (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Access code required' });
    }

    const assignedCode = (store.config.viewer_access_code || process.env.VIEWER_ACCESS_CODE || '').trim();
    if (assignedCode && code.trim() === assignedCode) {
      return res.json({ success: true, message: 'Viewer gate unlocked' });
    }
    return res.status(401).json({ success: false, error: 'Invalid Viewer Access Code' });
  });

  // Auth: Admin Password Validation (Gate 2)
  app.post('/api/auth/admin', (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password required' });
    }

    const assignedPassword = (store.config.admin_password || process.env.ADMIN_PASSWORD || '').trim();
    if (assignedPassword && password.trim() === assignedPassword) {
      return res.json({ success: true, message: 'Admin gate authenticated' });
    }
    return res.status(401).json({ success: false, error: 'Invalid Admin Credentials' });
  });

  // Public: Submit Reservation Request
  app.post('/api/requests', (req, res) => {
    const { room_id, user_name, user_surname, user_phone, purpose, start_time, end_time, recurrence } = req.body;

    if (!room_id || !user_name || !user_surname || !user_phone || !purpose || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required reservation fields' });
    }

    const newReq: ReservationRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      room_id,
      user_name: user_name.trim(),
      user_surname: user_surname.trim(),
      user_phone: user_phone.trim(),
      purpose: purpose.trim(),
      start_time,
      end_time,
      recurrence: recurrence || null,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    store.requests.unshift(newReq);
    store.save();
    store.saveRequestToSupabase(newReq);

    // Broadcast new request to Admin listeners
    store.broadcast('new_request', {
      request: newReq,
      pendingCount: store.requests.length,
      server_time: new Date().toISOString(),
    });

    res.status(201).json({ success: true, request: newReq });
  });

  // Admin: Approve Request (handles 1-minute buffer and optional series creation)
  app.post('/api/requests/:id/approve', (req, res) => {
    const reqId = req.params.id;
    const requestIndex = store.requests.findIndex(r => r.id === reqId);

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const targetReq = store.requests[requestIndex];
    const BUFFER_MS = 60 * 1000;

    // Check if it's a recurring request or single
    if (targetReq.recurrence && targetReq.recurrence.count > 1) {
      const count = targetReq.recurrence.count;
      const freq = targetReq.recurrence.frequency;
      const seriesId = `series_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const booked: Reservation[] = [];
      const conflicts: any[] = [];

      const startBase = new Date(targetReq.start_time);
      const endBase = new Date(targetReq.end_time);
      const durationMs = endBase.getTime() - startBase.getTime();

      for (let i = 0; i < count; i++) {
        const curStart = new Date(startBase);
        if (freq === 'weekly') {
          curStart.setDate(curStart.getDate() + i * 7);
        } else {
          curStart.setDate(curStart.getDate() + i);
        }
        const curEnd = new Date(curStart.getTime() + durationMs);

        const curStartIso = curStart.toISOString();
        const curEndIso = curEnd.toISOString();

        const conflict = store.checkConflict(targetReq.room_id, curStartIso, curEndIso);
        if (conflict) {
          conflicts.push({
            date: curStartIso,
            reason: `Overlaps with existing booking (1-min buffer enforced)`,
            conflict_with: {
              user_name: `${conflict.user_name} ${conflict.user_surname}`,
              purpose: conflict.purpose,
              start_time: conflict.start_time,
              end_time: conflict.end_time,
            }
          });
        } else {
          const newRes: Reservation = {
            id: `res_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            room_id: targetReq.room_id,
            user_name: targetReq.user_name,
            user_surname: targetReq.user_surname,
            user_phone: targetReq.user_phone,
            purpose: targetReq.purpose,
            start_time: curStartIso,
            end_time: curEndIso,
            series_id: seriesId,
            series_index: i + 1,
            series_total: count,
            created_at: new Date().toISOString(),
            status: 'active',
          };
          booked.push(newRes);
          store.reservations.push(newRes);
        }
      }

      // Remove request from inbox
      store.requests.splice(requestIndex, 1);
      store.save();
      store.deleteRequestFromSupabase(reqId);
      store.saveReservationsToSupabase(booked);

      store.broadcast('state_change', {
        action: 'APPROVE_RECURRING',
        reservations: store.reservations,
        requests: store.requests,
        bookedCount: booked.length,
        conflictsCount: conflicts.length,
      });

      return res.json({
        success: true,
        report: {
          total_requested: count,
          total_booked: booked.length,
          total_conflicts: conflicts.length,
          series_id: seriesId,
          items: [
            ...booked.map(b => ({ date: b.start_time, success: true, reservation_id: b.id })),
            ...conflicts.map(c => ({ date: c.date, success: false, reason: c.reason, conflict_with: c.conflict_with }))
          ]
        }
      });
    }

    // Single request approval
    const conflict = store.checkConflict(targetReq.room_id, targetReq.start_time, targetReq.end_time);
    if (conflict) {
      return res.status(409).json({
        error: 'Conflict detected: Room is already occupied during this time or within 1-minute buffer',
        conflict_with: {
          user_name: `${conflict.user_name} ${conflict.user_surname}`,
          purpose: conflict.purpose,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
        }
      });
    }

    const newRes: Reservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      room_id: targetReq.room_id,
      user_name: targetReq.user_name,
      user_surname: targetReq.user_surname,
      user_phone: targetReq.user_phone,
      purpose: targetReq.purpose,
      start_time: targetReq.start_time,
      end_time: targetReq.end_time,
      series_id: null,
      created_at: new Date().toISOString(),
      status: 'active',
    };

    store.reservations.push(newRes);
    store.requests.splice(requestIndex, 1);
    store.save();
    store.deleteRequestFromSupabase(reqId);
    store.saveReservationToSupabase(newRes);

    store.broadcast('state_change', {
      action: 'APPROVE_SINGLE',
      reservations: store.reservations,
      requests: store.requests,
      newReservation: newRes,
    });

    res.json({ success: true, reservation: newRes });
  });

  // Admin: Silent Reject Request (Deletes request without noise)
  app.post('/api/requests/:id/reject', (req, res) => {
    const reqId = req.params.id;
    const requestIndex = store.requests.findIndex(r => r.id === reqId);

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    store.requests.splice(requestIndex, 1);
    store.save();
    store.deleteRequestFromSupabase(reqId);

    store.broadcast('state_change', {
      action: 'REJECT_REQUEST',
      requests: store.requests,
    });

    res.json({ success: true, message: 'Request silently deleted' });
  });

  // Admin: Direct Booking & Linked Series Creation
  app.post('/api/reservations', (req, res) => {
    const {
      room_id,
      user_name,
      user_surname,
      user_phone,
      purpose,
      start_time,
      end_time,
      is_recurring,
      recurrence_frequency, // 'daily' | 'weekly'
      recurrence_count,
    } = req.body;

    if (!room_id || !user_name || !user_surname || !purpose || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required reservation fields' });
    }

    if (is_recurring && recurrence_count > 1) {
      const count = Math.min(recurrence_count, 52);
      const freq = recurrence_frequency || 'weekly';
      const seriesId = `series_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const booked: Reservation[] = [];
      const conflicts: any[] = [];

      const startBase = new Date(start_time);
      const endBase = new Date(end_time);
      const durationMs = endBase.getTime() - startBase.getTime();

      for (let i = 0; i < count; i++) {
        const curStart = new Date(startBase);
        if (freq === 'weekly') {
          curStart.setDate(curStart.getDate() + i * 7);
        } else {
          curStart.setDate(curStart.getDate() + i);
        }
        const curEnd = new Date(curStart.getTime() + durationMs);
        const curStartIso = curStart.toISOString();
        const curEndIso = curEnd.toISOString();

        const conflict = store.checkConflict(room_id, curStartIso, curEndIso);
        if (conflict) {
          conflicts.push({
            date: curStartIso,
            reason: `Overlap detected with 1-min buffer`,
            conflict_with: {
              user_name: `${conflict.user_name} ${conflict.user_surname}`,
              purpose: conflict.purpose,
              start_time: conflict.start_time,
              end_time: conflict.end_time,
            }
          });
        } else {
          const newRes: Reservation = {
            id: `res_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            room_id,
            user_name: user_name.trim(),
            user_surname: user_surname.trim(),
            user_phone: (user_phone || '').trim(),
            purpose: purpose.trim(),
            start_time: curStartIso,
            end_time: curEndIso,
            series_id: seriesId,
            series_index: i + 1,
            series_total: count,
            created_at: new Date().toISOString(),
            status: 'active',
          };
          booked.push(newRes);
          store.reservations.push(newRes);
        }
      }

      store.save();
      store.saveReservationsToSupabase(booked);
      store.broadcast('state_change', {
        action: 'CREATE_RECURRING',
        reservations: store.reservations,
      });

      return res.status(201).json({
        success: true,
        report: {
          total_requested: count,
          total_booked: booked.length,
          total_conflicts: conflicts.length,
          series_id: seriesId,
          items: [
            ...booked.map(b => ({ date: b.start_time, success: true, reservation_id: b.id })),
            ...conflicts.map(c => ({ date: c.date, success: false, reason: c.reason, conflict_with: c.conflict_with }))
          ]
        }
      });
    }

    // Single direct booking
    const conflict = store.checkConflict(room_id, start_time, end_time);
    if (conflict) {
      return res.status(409).json({
        error: 'Conflict detected: Room is booked or within 1-minute buffer of another meeting',
        conflict_with: {
          user_name: `${conflict.user_name} ${conflict.user_surname}`,
          purpose: conflict.purpose,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
        }
      });
    }

    const newRes: Reservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      room_id,
      user_name: user_name.trim(),
      user_surname: user_surname.trim(),
      user_phone: (user_phone || '').trim(),
      purpose: purpose.trim(),
      start_time,
      end_time,
      series_id: null,
      created_at: new Date().toISOString(),
      status: 'active',
    };

    store.reservations.push(newRes);
    store.save();
    store.saveReservationToSupabase(newRes);

    store.broadcast('state_change', {
      action: 'CREATE_SINGLE',
      reservations: store.reservations,
      newReservation: newRes,
    });

    res.status(201).json({ success: true, reservation: newRes });
  });

  // Admin: Dynamic Check-Out ("End Meeting Now")
  app.post('/api/reservations/:id/checkout', (req, res) => {
    const resId = req.params.id;
    const reservation = store.reservations.find(r => r.id === resId);

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const now = new Date();
    const startTime = new Date(reservation.start_time);

    // If meeting hasn't started yet, set end_time = start_time (or remove)
    if (now < startTime) {
      reservation.end_time = reservation.start_time;
      reservation.status = 'ended_early';
    } else {
      reservation.end_time = now.toISOString();
      reservation.status = 'ended_early';
    }

    store.save();
    store.saveReservationToSupabase(reservation);
    store.broadcast('state_change', {
      action: 'CHECKOUT_EARLY',
      reservation,
      reservations: store.reservations,
    });

    res.json({ success: true, reservation, message: 'Room checked out early and cleared' });
  });

  // Admin: Edit Single Event
  app.put('/api/reservations/:id/edit-single', (req, res) => {
    const resId = req.params.id;
    const reservation = store.reservations.find(r => r.id === resId);

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const { room_id, user_name, user_surname, user_phone, purpose, start_time, end_time } = req.body;
    const targetRoom = room_id || reservation.room_id;
    const targetStart = start_time || reservation.start_time;
    const targetEnd = end_time || reservation.end_time;

    const conflict = store.checkConflict(targetRoom, targetStart, targetEnd, resId);
    if (conflict) {
      return res.status(409).json({
        error: 'Conflict detected with 1-minute buffer',
        conflict_with: {
          user_name: `${conflict.user_name} ${conflict.user_surname}`,
          purpose: conflict.purpose,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
        }
      });
    }

    if (room_id) reservation.room_id = room_id;
    if (user_name) reservation.user_name = user_name.trim();
    if (user_surname) reservation.user_surname = user_surname.trim();
    if (user_phone !== undefined) reservation.user_phone = user_phone.trim();
    if (purpose) reservation.purpose = purpose.trim();
    if (start_time) reservation.start_time = start_time;
    if (end_time) reservation.end_time = end_time;

    // Detach from series for single modification
    reservation.series_id = null;

    store.save();
    store.saveReservationToSupabase(reservation);
    store.broadcast('state_change', {
      action: 'EDIT_SINGLE',
      reservation,
      reservations: store.reservations,
    });

    res.json({ success: true, reservation });
  });

  // Admin: Edit All Future Events in Series
  app.put('/api/reservations/:id/edit-future', (req, res) => {
    const resId = req.params.id;
    const currentRes = store.reservations.find(r => r.id === resId);

    if (!currentRes) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (!currentRes.series_id) {
      return res.status(400).json({ error: 'Reservation is not part of a recurring series' });
    }

    const { room_id, user_name, user_surname, user_phone, purpose, start_time, end_time } = req.body;

    const currentStartTime = new Date(currentRes.start_time).getTime();
    const newTargetStart = new Date(start_time || currentRes.start_time).getTime();
    const newTargetEnd = new Date(end_time || currentRes.end_time).getTime();
    const durationMs = newTargetEnd - newTargetStart;

    // Time shift calculation for future events
    const timeShiftMs = newTargetStart - currentStartTime;

    // Find all events in the same series from this start time onwards
    const futureEvents = store.reservations.filter(
      r => r.series_id === currentRes.series_id && new Date(r.start_time).getTime() >= currentStartTime
    );

    const updatedEvents: Reservation[] = [];
    const conflicts: any[] = [];

    for (const ev of futureEvents) {
      const origStart = new Date(ev.start_time).getTime();
      const nextStart = new Date(origStart + timeShiftMs).toISOString();
      const nextEnd = new Date(origStart + timeShiftMs + durationMs).toISOString();
      const targetRoomId = room_id || ev.room_id;

      const conflict = store.checkConflict(targetRoomId, nextStart, nextEnd, ev.id);
      if (conflict) {
        conflicts.push({
          event_id: ev.id,
          date: nextStart,
          reason: 'Overlap with existing booking with 1-min buffer',
        });
      } else {
        ev.room_id = targetRoomId;
        if (user_name) ev.user_name = user_name.trim();
        if (user_surname) ev.user_surname = user_surname.trim();
        if (user_phone !== undefined) ev.user_phone = user_phone.trim();
        if (purpose) ev.purpose = purpose.trim();
        ev.start_time = nextStart;
        ev.end_time = nextEnd;
        updatedEvents.push(ev);
      }
    }

    store.save();
    store.saveReservationsToSupabase(updatedEvents);
    store.broadcast('state_change', {
      action: 'EDIT_FUTURE',
      reservations: store.reservations,
    });

    res.json({
      success: true,
      updated_count: updatedEvents.length,
      conflicts_count: conflicts.length,
      conflicts,
    });
  });

  // Admin: Delete/Cancel Reservation
  app.delete('/api/reservations/:id', (req, res) => {
    const resId = req.params.id;
    const { delete_series } = req.query;
    const target = store.reservations.find(r => r.id === resId);

    if (!target) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const targetSeriesId = target.series_id;
    const isSeries = delete_series === 'true' && Boolean(targetSeriesId);

    if (isSeries) {
      store.reservations = store.reservations.filter(r => r.series_id !== targetSeriesId);
    } else {
      store.reservations = store.reservations.filter(r => r.id !== resId);
    }

    store.save();
    store.deleteReservationFromSupabase(resId, isSeries, targetSeriesId);
    store.broadcast('state_change', {
      action: 'DELETE_RESERVATION',
      reservations: store.reservations,
    });

    res.json({ success: true, message: 'Reservation removed' });
  });

  // Admin: Update Config
  app.post('/api/config', (req, res) => {
    const { viewer_access_code, admin_password, building_timezone, building_name, require_viewer_code } = req.body;

    if (viewer_access_code) store.config.viewer_access_code = viewer_access_code.trim();
    if (admin_password) store.config.admin_password = admin_password.trim();
    if (building_timezone) store.config.building_timezone = building_timezone.trim();
    if (building_name) store.config.building_name = building_name.trim();
    if (typeof require_viewer_code === 'boolean') store.config.require_viewer_code = require_viewer_code;

    store.save();
    store.saveConfigToSupabase();
    store.broadcast('config_change', {
      config: {
        viewer_access_code: store.config.viewer_access_code,
        admin_password: store.config.admin_password,
        building_timezone: store.config.building_timezone,
        building_name: store.config.building_name,
        require_viewer_code: store.config.require_viewer_code,
      }
    });

    res.json({ success: true, message: 'Facility configuration updated' });
  });

  // Admin: Update Room Capacities and Information
  app.put('/api/rooms', (req, res) => {
    const { rooms } = req.body;
    if (!Array.isArray(rooms)) {
      return res.status(400).json({ error: 'Expected an array of rooms' });
    }

    for (const item of rooms) {
      const room = store.rooms.find(r => r.id === item.id);
      if (room) {
        if (typeof item.capacity === 'number' && item.capacity > 0) {
          room.capacity = Math.round(item.capacity);
        }
        if (typeof item.name === 'string' && item.name.trim()) {
          room.name = item.name.trim();
        }
        if (typeof item.description === 'string') {
          room.description = item.description.trim();
        }
      }
    }

    store.save();
    store.saveRoomsToSupabase();
    store.broadcast('rooms_change', {
      rooms: store.rooms,
    });

    res.json({ success: true, rooms: store.rooms, message: 'Room capacities updated successfully' });
  });

  // Admin: Update Single Room Capacity
  app.put('/api/rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const room = store.rooms.find(r => r.id === roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const { capacity, name, description } = req.body;
    if (typeof capacity === 'number' && capacity > 0) {
      room.capacity = Math.round(capacity);
    }
    if (typeof name === 'string' && name.trim()) {
      room.name = name.trim();
    }
    if (typeof description === 'string') {
      room.description = description.trim();
    }

    store.save();
    store.saveRoomsToSupabase();
    store.broadcast('rooms_change', {
      rooms: store.rooms,
    });

    res.json({ success: true, room, message: 'Room updated successfully' });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IELTS Gate Reservation Facility Manager running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
