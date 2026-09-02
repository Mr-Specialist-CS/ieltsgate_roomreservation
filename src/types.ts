export interface Room {
  id: string;
  name: string;
  floor_number: number;
  capacity: number;
  type: 'speaking_studio' | 'test_hall' | 'audio_booth' | 'lab' | 'briefing' | 'faculty';
  description: string;
}

export interface Reservation {
  id: string;
  room_id: string;
  user_name: string;
  user_surname: string;
  user_phone: string;
  purpose: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  series_id: string | null;
  series_index?: number;
  series_total?: number;
  created_at: string;
  status: 'active' | 'ended_early' | 'completed';
}

export interface ReservationRequest {
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

export interface AppConfig {
  viewer_access_code: string;
  admin_password_hash?: string;
  building_timezone: string;
  building_name: string;
  require_viewer_code: boolean;
}

export interface ConflictReportItem {
  date: string;
  success: boolean;
  reservation_id?: string;
  reason?: string;
  conflict_with?: {
    user_name: string;
    purpose: string;
    start_time: string;
    end_time: string;
  };
}

export interface ConflictReport {
  total_requested: number;
  total_booked: number;
  total_conflicts: number;
  series_id: string;
  items: ConflictReportItem[];
}

export interface ServerSyncState {
  rooms: Room[];
  reservations: Reservation[];
  requests: ReservationRequest[];
  config: AppConfig;
  server_time: string;
}
