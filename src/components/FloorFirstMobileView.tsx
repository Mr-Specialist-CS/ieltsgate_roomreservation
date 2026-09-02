import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Square, 
  Plus, 
  Repeat, 
  ChevronRight,
  LogOut,
  Calendar,
  Sparkles,
  Search
} from 'lucide-react';
import { Room, Reservation, AppConfig } from '../types';
import { formatTime, formatDate, calculateRoomStatus, isSameDay } from '../utils/time';

interface FloorFirstMobileViewProps {
  rooms: Room[];
  reservations: Reservation[];
  selectedDate: Date;
  currentTime: Date;
  config: AppConfig;
  isAdmin: boolean;
  onSelectReservation: (res: Reservation) => void;
  onQuickBookRoom: (roomId: string, startHour?: number) => void;
  onEarlyCheckout: (reservationId: string) => void;
}

export const FloorFirstMobileView: React.FC<FloorFirstMobileViewProps> = ({
  rooms,
  reservations,
  selectedDate,
  currentTime,
  config,
  isAdmin,
  onSelectReservation,
  onQuickBookRoom,
  onEarlyCheckout,
}) => {
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  const floorRooms = rooms
    .filter(r => r.floor_number === activeFloor)
    .filter(r => 
      !searchQuery || 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const isToday = isSameDay(selectedDate, currentTime);

  return (
    <div className="space-y-4">
      {/* 3 Large Floor Navigation Buttons */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[1, 2, 3].map((floorNum) => {
          const count = rooms.filter(r => r.floor_number === floorNum).length;
          const isActive = activeFloor === floorNum;
          
          return (
            <button
              key={floorNum}
              id={`floor-button-${floorNum}`}
              onClick={() => setActiveFloor(floorNum)}
              className={`p-4 rounded-xl border text-center transition-all cursor-pointer shadow-sm ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-700 font-bold ring-2 ring-blue-400/40 shadow-md'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <div className="text-xl sm:text-2xl font-bold tracking-tight">Floor {floorNum}</div>
              <div className={`text-xs mt-1 font-medium ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                {count} Rooms
              </div>
            </button>
          );
        })}
      </div>

      {/* Floor Header & Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-900">
            Floor {activeFloor} Directory
          </span>
          <span className="text-xs text-slate-500">
            ({formatDate(selectedDate, config.building_timezone)})
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="mobile-room-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Floor rooms..."
            className="w-full sm:w-48 pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Room Cards List */}
      <div className="space-y-3">
        {floorRooms.map((room) => {
          const roomStatus = calculateRoomStatus(room, reservations, currentTime);
          const roomDayRes = reservations
            .filter(r => r.room_id === room.id && isSameDay(new Date(r.start_time), selectedDate))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          const isExpanded = expandedRoomId === room.id;

          return (
            <div
              key={room.id}
              id={`mobile-room-card-${room.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all hover:border-slate-300"
            >
              {/* Top Row: Room title & Status Badges */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-slate-900 tracking-tight">
                      {room.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200">
                      Cap: {room.capacity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{room.description}</p>
                </div>

                {/* Real-time Status Badge (Green / Red / Amber) */}
                <div className="flex items-center space-x-2">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                      roomStatus.badgeColor === 'red'
                        ? 'bg-rose-50 border border-rose-200 text-rose-700'
                        : roomStatus.badgeColor === 'amber'
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        roomStatus.badgeColor === 'red'
                          ? 'bg-rose-500 animate-ping'
                          : roomStatus.badgeColor === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span>{roomStatus.statusText}</span>
                  </div>

                  {/* Admin "End Meeting Now" Instant Action on Mobile */}
                  {isAdmin && roomStatus.isOccupied && roomStatus.currentReservation && (
                    <button
                      id={`mobile-checkout-btn-${room.id}`}
                      onClick={() => onEarlyCheckout(roomStatus.currentReservation!.id)}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                      title="Instantly check out and free room"
                    >
                      <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>End Now</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Occupant Details if Occupied */}
              {roomStatus.isOccupied && roomStatus.currentReservation && (
                <div 
                  onClick={() => onSelectReservation(roomStatus.currentReservation!)}
                  className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 cursor-pointer hover:bg-rose-100/70 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-rose-900">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-rose-600" />
                      {roomStatus.currentReservation.user_name} {roomStatus.currentReservation.user_surname}
                    </span>
                    <span className="font-mono text-[11px] text-rose-700 font-semibold">
                      {formatTime(roomStatus.currentReservation.start_time, config.building_timezone)} – {formatTime(roomStatus.currentReservation.end_time, config.building_timezone)}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-1 font-medium truncate">
                    {roomStatus.currentReservation.purpose}
                  </p>
                </div>
              )}

              {/* Day Schedule Expandable Preview */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  id={`expand-room-schedule-${room.id}`}
                  onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>{isExpanded ? 'Hide Day Schedule' : `View Today's Schedule (${roomDayRes.length} Sessions)`}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                <button
                  id={`mobile-quick-book-${room.id}`}
                  onClick={() => onQuickBookRoom(room.id)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2]" />
                  <span>{isAdmin ? 'Book Room' : 'Request'}</span>
                </button>
              </div>

              {/* Expanded Day Schedule */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  {roomDayRes.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                      No reservations scheduled for this room on {formatDate(selectedDate, config.building_timezone)}.
                    </div>
                  ) : (
                    roomDayRes.map(res => (
                      <div
                        key={res.id}
                        onClick={() => onSelectReservation(res)}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                            <span>{res.user_name} {res.user_surname}</span>
                            {res.series_id && (
                              <Repeat className="w-3 h-3 text-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{res.purpose}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-semibold text-blue-700">
                            {formatTime(res.start_time, config.building_timezone)} – {formatTime(res.end_time, config.building_timezone)}
                          </div>
                          {res.status === 'ended_early' && (
                            <span className="text-[10px] text-rose-600 font-semibold">(Ended early)</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
