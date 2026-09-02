import React, { useState } from 'react';
import { X, Send, Clock, Calendar, AlertCircle, Sparkles, Repeat, CheckCircle, ShieldAlert } from 'lucide-react';
import { Room, Reservation, AppConfig } from '../types';
import { formatTime, formatDate } from '../utils/time';

const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  reservations: Reservation[];
  config: AppConfig;
  defaultRoomId?: string;
  defaultDate?: Date;
  defaultStartHour?: number;
  onRequestSubmitted: () => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  isOpen,
  onClose,
  rooms,
  reservations,
  config,
  defaultRoomId,
  defaultDate,
  defaultStartHour = 10,
  onRequestSubmitted,
}) => {
  const [roomId, setRoomId] = useState(defaultRoomId || rooms[0]?.id || 'r1_study1');
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  
  // Date and Time selection
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
      setSuccess(false);
    }
  }, [isOpen, defaultRoomId, defaultDate, defaultStartHour, rooms]);

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'weekly' | 'daily'>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userSurname.trim() || !userPhone.trim() || !purpose.trim()) {
      setError('Please fill in all applicant details and purpose');
      return;
    }

    const startDate = new Date(`${dateString}T${startHour}:${startMin}:00`);
    const endDate = new Date(`${dateString}T${endHour}:${endMin}:00`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Invalid date or time selected');
      return;
    }

    if (startDate >= endDate) {
      setError('Meeting end time must be after start time');
      return;
    }

    // Client-side 1-minute buffer pre-check
    const BUFFER_MS = 60 * 1000;
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const roomRes = reservations.filter(r => r.room_id === roomId && r.status !== 'ended_early');
    for (const r of roomRes) {
      const rStart = new Date(r.start_time).getTime();
      const rEnd = new Date(r.end_time).getTime();
      if (startMs < rEnd + BUFFER_MS && endMs > rStart - BUFFER_MS) {
        setError(`Conflict with existing session (${r.user_name} ${r.user_surname} ${formatTime(r.start_time)} - ${formatTime(r.end_time)}). The 1-minute buffer rule requires at least 1 min gap between bookings.`);
        return;
      }
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
        recurrence: isRecurring
          ? {
              frequency: recurrenceFreq,
              count: Number(recurrenceCount),
            }
          : null,
      };

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        onRequestSubmitted();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(data.error || 'Failed to submit reservation request');
      }
    } catch {
      setError('Network error submitting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-800 my-8">
        <button
          id="request-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Request Room Reservation</h2>
            <p className="text-xs text-slate-500">Submitted directly to the IELTS Facility Admin Inbox</p>
          </div>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-emerald-800">Request Sent Successfully</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your reservation request has been submitted to the Admin Inbox. The facility manager will review and approve. Please check the public schedule to verify confirmation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Room Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Select Room
              </label>
              <select
                id="request-room-select"
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

            {/* Applicant Name & Surname */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  First Name
                </label>
                <input
                  id="request-user-name"
                  type="text"
                  required
                  placeholder="e.g. Sarah"
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
                  id="request-user-surname"
                  type="text"
                  required
                  placeholder="e.g. Jenkins"
                  value={userSurname}
                  onChange={(e) => setUserSurname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Contact Phone
              </label>
              <input
                id="request-user-phone"
                type="tel"
                required
                placeholder="e.g. +44 7700 900123"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Booking Purpose / Exam Module
              </label>
              <input
                id="request-purpose"
                type="text"
                required
                placeholder="e.g. IELTS Speaking Mock Test & Assessment"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Date
                </label>
                <input
                  id="request-date"
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

            {/* 1-Minute Buffer Rule Notice */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>1-Minute Buffer Rule:</strong> Every session must have at least a 1-minute gap before and after neighboring reservations.
              </span>
            </div>

            {/* Recurrence Option */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1 text-slate-800 font-semibold">
                  <Repeat className="w-3.5 h-3.5 text-blue-600" />
                  <span>Make Recurring Request (Linked Series)</span>
                </span>
              </label>

              {isRecurring && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Frequency
                    </label>
                    <select
                      value={recurrenceFreq}
                      onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs"
                    >
                      <option value="weekly">Weekly (Same day each week)</option>
                      <option value="daily">Daily (Consecutive days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Number of Sessions
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              id="submit-request-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Send Request to Facility Admin'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
