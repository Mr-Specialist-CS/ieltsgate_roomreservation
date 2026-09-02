import { Reservation, Room } from '../types';

export function getWeekRange(date: Date, offsetWeeks: number = 0): { start: Date; end: Date; days: Date[] } {
  const d = new Date(date);
  // Calculate Monday of the target week
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday, days };
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatTime(isoString: string | Date, timezone: string = 'Europe/London'): string {
  const d = typeof isoString === 'string' ? new Date(isoString) : isoString;
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
}

export function formatDate(isoString: string | Date, timezone: string = 'Europe/London'): string {
  const d = typeof isoString === 'string' ? new Date(isoString) : isoString;
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
}

export function formatFullDateTime(isoString: string | Date, timezone: string = 'Europe/London'): string {
  const d = typeof isoString === 'string' ? new Date(isoString) : isoString;
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
}

export function getMinutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export interface RoomCurrentStatus {
  isOccupied: boolean;
  currentReservation: Reservation | null;
  nextReservation: Reservation | null;
  statusText: string;
  badgeColor: 'green' | 'red' | 'amber';
  freeForMinutes: number | null;
  occupiedUntil: string | null;
}

export function calculateRoomStatus(
  room: Room,
  reservations: Reservation[],
  currentTime: Date,
  timezone: string = 'Europe/London'
): RoomCurrentStatus {
  const currentMs = currentTime.getTime();
  
  // Find reservations for today
  const roomRes = reservations
    .filter(r => r.room_id === room.id && r.status !== 'ended_early')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  let activeRes: Reservation | null = null;
  let nextRes: Reservation | null = null;

  for (const res of roomRes) {
    const s = new Date(res.start_time).getTime();
    const e = new Date(res.end_time).getTime();

    if (currentMs >= s && currentMs < e) {
      activeRes = res;
      break;
    } else if (s > currentMs) {
      if (!nextRes || s < new Date(nextRes.start_time).getTime()) {
        nextRes = res;
      }
    }
  }

  if (activeRes) {
    const endStr = formatTime(activeRes.end_time, timezone);
    return {
      isOccupied: true,
      currentReservation: activeRes,
      nextReservation: nextRes,
      statusText: `Occupied until ${endStr}`,
      badgeColor: 'red',
      freeForMinutes: null,
      occupiedUntil: endStr,
    };
  }

  if (nextRes) {
    const startMs = new Date(nextRes.start_time).getTime();
    const diffMinutes = Math.max(0, Math.floor((startMs - currentMs) / 60000));
    
    if (diffMinutes < 60) {
      return {
        isOccupied: false,
        currentReservation: null,
        nextReservation: nextRes,
        statusText: `Free for next ${diffMinutes}m`,
        badgeColor: 'amber',
        freeForMinutes: diffMinutes,
        occupiedUntil: null,
      };
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return {
        isOccupied: false,
        currentReservation: null,
        nextReservation: nextRes,
        statusText: `Free for ${hours}h ${mins > 0 ? mins + 'm' : ''}`,
        badgeColor: 'green',
        freeForMinutes: diffMinutes,
        occupiedUntil: null,
      };
    }
  }

  return {
    isOccupied: false,
    currentReservation: null,
    nextReservation: null,
    statusText: 'Free all day',
    badgeColor: 'green',
    freeForMinutes: 1440,
    occupiedUntil: null,
  };
}
