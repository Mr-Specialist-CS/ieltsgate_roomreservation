import React, { useState, useRef, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Users, 
  Repeat, 
  Search, 
  Filter, 
  Info, 
  CheckCircle2, 
  Flame, 
  Sparkles,
  Sun,
  Moon,
  Volume2,
  Mic,
  FileSpreadsheet,
  GraduationCap,
  Maximize2,
  Plus
} from 'lucide-react';
import { Room, Reservation, AppConfig } from '../types';
import { formatTime, formatDate, isSameDay, getMinutesFromMidnight, calculateRoomStatus } from '../utils/time';

interface TimelineViewProps {
  rooms: Room[];
  reservations: Reservation[];
  selectedDate: Date;
  currentTime: Date;
  config: AppConfig;
  isAdmin: boolean;
  onSelectReservation: (res: Reservation) => void;
  onQuickBookRoom: (roomId: string, startHour: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  rooms,
  reservations,
  selectedDate,
  currentTime,
  config,
  isAdmin,
  onSelectReservation,
  onQuickBookRoom,
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const isToday = isSameDay(selectedDate, currentTime);
  const currentMinutes = getMinutesFromMidnight(currentTime);
  const currentPercent = (currentMinutes / 1440) * 100;

  // Filter reservations for the selected date
  const dayReservations = reservations.filter(r => {
    const rDate = new Date(r.start_time);
    return isSameDay(rDate, selectedDate);
  });

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    const matchesFloor = selectedFloor === 'all' || room.floor_number === selectedFloor;
    const matchesSearch = 
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFloor && matchesSearch;
  });

  // Group rooms by floor
  const floors = [1, 2, 3];

  // Auto-scroll near current time on today
  useEffect(() => {
    if (isToday && timelineScrollRef.current) {
      const containerWidth = timelineScrollRef.current.scrollWidth;
      const scrollPos = (currentPercent / 100) * containerWidth - 300;
      timelineScrollRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [isToday, selectedDate]);

  const getRoomTypeIcon = (type: Room['type']) => {
    switch (type) {
      case 'speaking_studio':
        return <Mic className="w-3.5 h-3.5 text-rose-400" />;
      case 'audio_booth':
        return <Volume2 className="w-3.5 h-3.5 text-sky-400" />;
      case 'test_hall':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />;
      case 'faculty':
        return <GraduationCap className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Users className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-slate-800">
      {/* Controls Bar: Search, Floor Filter, Daylight Indicator */}
      <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Floor Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
            Floors:
          </span>
          <button
            id="filter-floor-all"
            onClick={() => setSelectedFloor('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedFloor === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
            }`}
          >
            All {rooms.length} Rooms
          </button>
          {floors.map(f => (
            <button
              key={f}
              id={`filter-floor-${f}`}
              onClick={() => setSelectedFloor(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFloor === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              Floor {f} ({rooms.filter(r => r.floor_number === f).length} Rooms)
            </button>
          ))}
        </div>

        {/* Search & Legend */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="timeline-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room name or specs..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="hidden lg:flex items-center space-x-3 text-xs text-slate-500 pl-2 border-l border-slate-200">
            <div className="flex items-center space-x-1.5">
              <Sun className="w-3.5 h-3.5 text-blue-600" />
              <span>Daylight (08:00 - 20:00)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Moon className="w-3.5 h-3.5 text-slate-400" />
              <span>Night (00-08 / 20-24)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 24-Hour Timeline Grid with Fixed Left Column */}
      <div className="relative overflow-x-auto" ref={timelineScrollRef}>
        <div className="min-w-[1280px]">
          {/* Timeline Header Row (Hours 00:00 to 24:00) */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
            {/* Left Header Corner */}
            <div className="w-64 shrink-0 px-4 py-3 bg-slate-50 border-r border-slate-200 flex items-center justify-between font-semibold text-xs text-slate-700">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Room & Floor Info</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {formatDate(selectedDate, config.building_timezone)}
              </span>
            </div>

            {/* 24-Hour Column Headers */}
            <div className="flex-1 relative flex h-10">
              {Array.from({ length: 24 }).map((_, hour) => {
                const isDaylight = hour >= 8 && hour < 20;
                return (
                  <div
                    key={hour}
                    className={`flex-1 border-r border-slate-200/80 px-1 py-2 text-[11px] font-mono text-center relative ${
                      isDaylight ? 'bg-white text-blue-600 font-bold' : 'bg-slate-100/70 text-slate-400'
                    }`}
                  >
                    <span>{String(hour).padStart(2, '0')}:00</span>
                    {hour === 8 && (
                      <span className="absolute left-1 top-0.5 text-[9px] text-blue-600 flex items-center gap-0.5 font-sans font-semibold">
                        <Sun className="w-2.5 h-2.5" /> 8AM
                      </span>
                    )}
                    {hour === 20 && (
                      <span className="absolute left-1 top-0.5 text-[9px] text-slate-500 flex items-center gap-0.5 font-sans font-semibold">
                        <Moon className="w-2.5 h-2.5" /> 8PM
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Real-time Vertical Red Line on Header */}
              {isToday && (
                <div
                  className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
                  style={{ left: `${currentPercent}%` }}
                >
                  <div className="bg-rose-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md -translate-x-1/2 -mt-0.5 whitespace-nowrap flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>{formatTime(currentTime, config.building_timezone)}</span>
                  </div>
                  <div className="w-0.5 bg-rose-500 flex-1 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                </div>
              )}
            </div>
          </div>

          {/* Room Rows */}
          <div className="divide-y divide-slate-200/80 relative">
            {/* Global Real-time Vertical Red Line across all room lanes */}
            {isToday && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none w-0.5 bg-rose-500/90 shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                style={{ left: `calc(16rem + (100% - 16rem) * ${currentPercent / 100})` }}
              />
            )}

            {filteredRooms.map((room) => {
              const roomReservations = dayReservations.filter(r => r.room_id === room.id);
              const roomStatus = calculateRoomStatus(room, reservations, currentTime);

              return (
                <div
                  key={room.id}
                  id={`timeline-room-row-${room.id}`}
                  className="flex group hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left Column: Room Metadata & Status */}
                  <div className="w-64 shrink-0 p-3 bg-slate-50/90 border-r border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          {getRoomTypeIcon(room.type)}
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                            {room.name.split(':')[0]}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 font-mono font-medium">
                          F{room.floor_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5" title={room.description}>
                        {room.name.split(':')[1] || room.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{room.capacity}</span>
                        </span>
                        <button
                          id={`timeline-book-btn-${room.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickBookRoom(room.id, 9);
                          }}
                          className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
                          title={`Click to book or request ${room.name}`}
                        >
                          <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>{isAdmin ? 'Book' : 'Request'}</span>
                        </button>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          roomStatus.badgeColor === 'red'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : roomStatus.badgeColor === 'amber'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {roomStatus.statusText}
                      </span>
                    </div>
                  </div>

                  {/* 24-Hour Lane Canvas */}
                  <div className="flex-1 relative h-20 bg-white flex">
                    {/* Background hour grid bands with Daylight highlight */}
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const isDaylight = hour >= 8 && hour < 20;
                      return (
                        <div
                          key={hour}
                          onClick={() => onQuickBookRoom(room.id, hour)}
                          title={`Click to book ${room.name} at ${hour}:00`}
                          className={`flex-1 border-r border-slate-100 relative cursor-pointer hover:bg-blue-50/50 transition-colors ${
                            isDaylight ? 'bg-white' : 'bg-slate-50/60'
                          }`}
                        >
                          {/* 30-min dashed sub-marker */}
                          <div className="absolute top-0 bottom-0 left-1/2 border-l border-slate-200/50 border-dashed" />
                        </div>
                      );
                    })}

                    {/* Placed Reservations on Timeline */}
                    {roomReservations.map((res) => {
                      const start = new Date(res.start_time);
                      const end = new Date(res.end_time);

                      const startMins = start.getHours() * 60 + start.getMinutes();
                      const endMins = end.getHours() * 60 + end.getMinutes();
                      const durationMins = Math.max(endMins - startMins, 15);

                      const leftPercent = (startMins / 1440) * 100;
                      const widthPercent = (durationMins / 1440) * 100;

                      const isEndedEarly = res.status === 'ended_early';

                      return (
                        <div
                          key={res.id}
                          id={`res-card-${res.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectReservation(res);
                          }}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 1.8)}%`,
                          }}
                          className={`absolute top-2 bottom-2 rounded-lg p-2 z-10 cursor-pointer shadow-sm transition-all hover:scale-[1.01] hover:z-30 overflow-hidden flex flex-col justify-between border ${
                            isEndedEarly
                              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-70'
                              : res.series_id
                              ? 'bg-blue-600 border-blue-700 text-white shadow-blue-900/20'
                              : 'bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-400 shadow-slate-200/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-[11px] truncate tracking-tight">
                              {res.user_name} {res.user_surname}
                            </span>
                            {res.series_id && (
                              <span className="shrink-0 p-0.5 rounded bg-blue-700 text-blue-100" title="Recurring Linked Series">
                                <Repeat className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>

                          <div className={`text-[10px] truncate font-medium ${res.series_id ? 'text-blue-100' : 'text-blue-800'}`}>
                            {res.purpose}
                          </div>

                          <div className={`flex items-center justify-between text-[9px] font-mono ${res.series_id ? 'text-blue-200' : 'text-blue-600'}`}>
                            <span>
                              {formatTime(res.start_time, config.building_timezone)} - {formatTime(res.end_time, config.building_timezone)}
                            </span>
                            {isEndedEarly && (
                              <span className="text-amber-600 font-semibold">(Ended early)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredRooms.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <p className="text-sm font-medium">No rooms match your filter criteria.</p>
                <button
                  onClick={() => {
                    setSelectedFloor('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
