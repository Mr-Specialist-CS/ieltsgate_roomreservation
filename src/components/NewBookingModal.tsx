import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Calendar, 
  Clock, 
  Repeat, 
  AlertCircle, 
  CheckCircle, 
  ShieldCheck, 
  FileSpreadsheet,
  ShieldAlert
} from 'lucide-react';
import { Room, Reservation, AppConfig, ConflictReport } from '../types';
import { formatTime } from '../utils/time';

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  reservations: Reservation[];
  config: AppConfig;
  defaultRoomId?: string;
  defaultDate?: Date;
  defaultStartHour?: number;
  onBookingSuccess: (report?: ConflictReport) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  rooms,
  reservations,
  config,
  defaultRoomId,
  defaultDate,
  defaultStartHour = 9,
  onBookingSuccess,
}) => {
  const [roomId, setRoomId] = useState(defaultRoomId || rooms[0]?.id || 'r1_study1');
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [purpose, setPurpose] = useState('');

  const initDate = defaultDate ? new Date(defaultDate) : new Date();
  const yearStr = initDate.getFullYear();
  const monthStr = String(initDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(initDate.getDate()).padStart(2, '0');
  const [dateString, setDateString] = useState(`${yearStr}-${monthStr}-${dayStr}`);

  const [startHour, setStartHour] = useState(String(defaultStartHour).padStart(2, '0'));
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState(String(defaultStartHour + 1).padStart(2, '0'));
  const [endMin, setEndMin] = useState('30');

  // Sync state whenever modal opens or props change
  React.useEffect(() => {
    if (isOpen) {
      if (defaultRoomId) {
        setRoomId(defaultRoomId);
      } else if (rooms.length > 0) {
        setRoomId(rooms[0].id);
      }
      if (defaultDate) {
        const d = new Date(defaultDate);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDateString(`${y}-${m}-${day}`);
      }
      if (defaultStartHour !== undefined) {
        setStartHour(String(defaultStartHour).padStart(2, '0'));
        setEndHour(String(Math.min(defaultStartHour + 1, 23)).padStart(2, '0'));
      }
      setError('');
    }
  }, [isOpen, defaultRoomId, defaultDate, defaultStartHour, rooms]);

  // Recurring Linked Series
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'weekly' | 'daily'>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userSurname.trim() || !purpose.trim()) {
      setError('Please provide Name, Surname, and Purpose');
      return;
    }

    const startDate = new Date(`${dateString}T${startHour}:${startMin}:00`);
    const endDate = new Date(`${dateString}T${endHour}:${endMin}:00`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Invalid date or time');
      return;
    }

    if (startDate >= endDate) {
      setError('End time must be after start time');
      return;
    }

    if (startDate.getTime() < Date.now() - 60 * 1000) {
      setError('Cannot create a reservation for a time in the past.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = {
        room_id: roomId,
        user_name: userName.trim(),
        user_surname: userSurname.trim(),
        user_phone: userPhone.trim(),
        purpose: purpose.trim(),
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        is_recurring: isRecurring,
        recurrence_frequency: recurrenceFreq,
        recurrence_count: Number(recurrenceCount),
      };

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onBookingSuccess(data.report);
        onClose();
      } else {
        setError(data.error || 'Conflict or error creating reservation');
      }
    } catch {
      setError('Network error saving reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-800 my-8">
        <button
          id="new-booking-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Official Reservation</h2>
            <p className="text-xs text-slate-500">Direct Admin Booking & Recurring Linked Series</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Select Room
            </label>
            <select
              id="booking-room-select"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Floor {r.floor_number} — {r.name} (Cap: {r.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                First Name
              </label>
              <input
                id="booking-user-name"
                type="text"
                required
                placeholder="e.g. Dr. Robert"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Surname
              </label>
              <input
                id="booking-user-surname"
                type="text"
                required
                placeholder="e.g. Vance"
                value={userSurname}
                onChange={(e) => setUserSurname(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Phone & Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                id="booking-user-phone"
                type="tel"
                placeholder="+44 7700 900333"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Purpose / Module
              </label>
              <input
                id="booking-purpose"
                type="text"
                required
                placeholder="e.g. Examiner Training Level 2"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Date
              </label>
              <input
                id="booking-date"
                type="date"
                required
                value={dateString}
                onChange={(e) => setDateString(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Start (24h)
              </label>
              <div className="flex space-x-1">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-1/2 px-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={String(h).padStart(2, '0')}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  value={startMin}
                  onChange={(e) => setStartMin(e.target.value)}
                  className="w-1/2 px-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                >
                  {MINUTE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                End (24h)
              </label>
              <div className="flex space-x-1">
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-1/2 px-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={String(h).padStart(2, '0')}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  value={endMin}
                  onChange={(e) => setEndMin(e.target.value)}
                  className="w-1/2 px-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                >
                  {MINUTE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 1-Minute Buffer Notice */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>1-Minute Buffer Enforced:</strong> Overlaps and back-to-back zero-gap bookings are strictly rejected.
            </span>
          </div>

          {/* Linked Recurring Series Section */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-1 font-semibold text-blue-700">
                <Repeat className="w-3.5 h-3.5" />
                <span>Create Linked Series (e.g. Every Tuesday for 5 weeks)</span>
              </span>
            </label>

            {isRecurring && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Pattern
                    </label>
                    <select
                      value={recurrenceFreq}
                      onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs"
                    >
                      <option value="weekly">Weekly (Same weekday)</option>
                      <option value="daily">Daily (Consecutive)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Occurrences Count
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={24}
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Math.max(2, Math.min(24, parseInt(e.target.value) || 2)))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  *Conflict Logic: Books all available dates. Generates a Conflict Report for any specific dates with overlaps.
                </p>
              </div>
            )}
          </div>

          <button
            id="create-booking-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{loading ? 'Validating & Booking...' : isRecurring ? `Book Linked Series (${recurrenceCount} dates)` : 'Confirm Reservation'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
