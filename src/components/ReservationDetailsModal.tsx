import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Repeat, 
  LogOut, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  ShieldCheck,
  Eye,
  Layers,
  Save
} from 'lucide-react';
import { Reservation, Room, AppConfig } from '../types';
import { formatTime, formatDate, formatFullDateTime } from '../utils/time';

const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

interface ReservationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  rooms: Room[];
  config: AppConfig;
  isAdmin: boolean;
  onEarlyCheckout: (id: string) => void;
  onReservationUpdated: () => void;
}

export const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  isOpen,
  onClose,
  reservation,
  rooms,
  config,
  isAdmin,
  onEarlyCheckout,
  onReservationUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'single' | 'future'>('single');

  // Edit fields
  const [editRoomId, setEditRoomId] = useState('');
  const [editName, setEditName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartH, setEditStartH] = useState('09');
  const [editStartM, setEditStartM] = useState('00');
  const [editEndH, setEditEndH] = useState('10');
  const [editEndM, setEditEndM] = useState('30');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !reservation) return null;

  const room = rooms.find(r => r.id === reservation.room_id);

  const initEditState = () => {
    setEditRoomId(reservation.room_id);
    setEditName(reservation.user_name);
    setEditSurname(reservation.user_surname);
    setEditPhone(reservation.user_phone || '');
    setEditPurpose(reservation.purpose);

    const s = new Date(reservation.start_time);
    const e = new Date(reservation.end_time);
    const y = s.getFullYear();
    const m = String(s.getMonth() + 1).padStart(2, '0');
    const d = String(s.getDate()).padStart(2, '0');
    setEditDate(`${y}-${m}-${d}`);
    setEditStartH(String(s.getHours()).padStart(2, '0'));
    setEditStartM(String(s.getMinutes()).padStart(2, '0'));
    setEditEndH(String(e.getHours()).padStart(2, '0'));
    setEditEndM(String(e.getMinutes()).padStart(2, '0'));

    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const startIso = new Date(`${editDate}T${editStartH}:${editStartM}:00`).toISOString();
    const endIso = new Date(`${editDate}T${editEndH}:${editEndM}:00`).toISOString();

    if (new Date(startIso) >= new Date(endIso)) {
      setError('End time must be after start time');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = editMode === 'future'
        ? `/api/reservations/${reservation.id}/edit-future`
        : `/api/reservations/${reservation.id}/edit-single`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: editRoomId,
          user_name: editName,
          user_surname: editSurname,
          user_phone: editPhone,
          purpose: editPurpose,
          start_time: startIso,
          end_time: endIso,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onReservationUpdated();
        setIsEditing(false);
        onClose();
      } else {
        setError(data.error || 'Failed to update reservation (conflict detected)');
      }
    } catch {
      setError('Network error updating reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deleteSeries: boolean = false) => {
    if (!confirm(deleteSeries ? 'Delete ALL occurrences in this recurring series?' : 'Cancel this reservation?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}?delete_series=${deleteSeries}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onReservationUpdated();
        onClose();
      } else {
        setError('Failed to delete reservation');
      }
    } catch {
      setError('Network error deleting reservation');
    } finally {
      setLoading(false);
    }
  };

  const isOngoing = 
    new Date() >= new Date(reservation.start_time) && 
    new Date() <= new Date(reservation.end_time) && 
    reservation.status !== 'ended_early';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-800 my-8">
        <button
          id="res-details-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">Reservation Details</h2>
              {reservation.series_id && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  Linked Series
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'Gate 2 Admin Management & Quick Controls' : 'Gate 1 Public Transparency View'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-4">
            {/* Google Calendar Style: Edit this one vs Edit all future */}
            {reservation.series_id && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <label className="block text-xs font-bold text-blue-900 mb-1.5">
                  Series Update Scope:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode('single')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      editMode === 'single'
                        ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Edit This Event Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode('future')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      editMode === 'future'
                        ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Edit All Future Events
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Room</label>
              <select
                value={editRoomId}
                onChange={(e) => setEditRoomId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Floor {r.floor_number} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Surname</label>
                <input
                  type="text"
                  value={editSurname}
                  onChange={(e) => setEditSurname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose</label>
              <input
                type="text"
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Start</label>
                <div className="flex space-x-1">
                  <select
                    value={editStartH}
                    onChange={(e) => setEditStartH(e.target.value)}
                    className="w-1/2 px-1 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={editStartM}
                    onChange={(e) => setEditStartM(e.target.value)}
                    className="w-1/2 px-1 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                  >
                    {MINUTE_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">End</label>
                <div className="flex space-x-1">
                  <select
                    value={editEndH}
                    onChange={(e) => setEditEndH(e.target.value)}
                    className="w-1/2 px-1 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={editEndM}
                    onChange={(e) => setEditEndM(e.target.value)}
                    className="w-1/2 px-1 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                  >
                    {MINUTE_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Apply Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-4">
            {/* Occupant Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900">
                    {reservation.user_name} {reservation.user_surname}
                  </span>
                </div>
                {reservation.user_phone && (
                  <span className="text-xs font-mono text-slate-600 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {reservation.user_phone}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Purpose / Module
                </span>
                <p className="text-xs text-slate-800 font-medium mt-0.5">
                  {reservation.purpose}
                </p>
              </div>
            </div>

            {/* Room & Time Spec */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Room:</span>
                </span>
                <span className="font-semibold text-slate-900">
                  Floor {room?.floor_number} — {room?.name}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Time Interval:</span>
                </span>
                <span className="font-mono font-bold text-blue-700">
                  {formatTime(reservation.start_time, config.building_timezone)} – {formatTime(reservation.end_time, config.building_timezone)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-800">
                  {formatDate(reservation.start_time, config.building_timezone)}
                </span>
              </div>

              {reservation.status === 'ended_early' && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                  This session was checked out early by the Facility Manager.
                </div>
              )}
            </div>

            {/* Admin Dynamic Actions */}
            {isAdmin && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                {/* Dynamic Check-Out: "End Meeting Now" */}
                {reservation.status !== 'ended_early' && (
                  <button
                    id="res-modal-checkout-btn"
                    onClick={() => {
                      onEarlyCheckout(reservation.id);
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 stroke-[2.5]" />
                    <span>End Meeting Now (Check-Out Early)</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="res-modal-edit-btn"
                    onClick={initEditState}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit Booking</span>
                  </button>

                  <button
                    id="res-modal-delete-btn"
                    onClick={() => handleDelete(false)}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Cancel Event</span>
                  </button>
                </div>

                {reservation.series_id && (
                  <button
                    id="res-modal-delete-series-btn"
                    onClick={() => handleDelete(true)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Cancel Entire Linked Series
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
