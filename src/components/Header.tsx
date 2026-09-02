import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Clock, 
  ShieldCheck, 
  Eye, 
  Inbox, 
  Plus, 
  Settings, 
  Bell, 
  BellOff, 
  Calendar as CalendarIcon, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Radio,
  Lock
} from 'lucide-react';
import { formatTime, formatDate, getWeekRange, isSameDay } from '../utils/time';
import { AppConfig, ReservationRequest } from '../types';

interface HeaderProps {
  config: AppConfig;
  currentTime: Date;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
  onOpenViewerGate: () => void;
  onLockViewer?: () => void;
  onOpenInbox: () => void;
  onOpenNewBooking: () => void;
  onOpenRequestModal: () => void;
  onOpenConfigModal: () => void;
  pendingRequests: ReservationRequest[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  weekOffset: number;
  onSetWeekOffset: (offset: number) => void;
  isFloorFirstMobile: boolean;
  onToggleFloorFirst: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  sseConnected: boolean;
  totalReservationsCount: number;
  roomsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  currentTime,
  isAdmin,
  onOpenAdminLogin,
  onAdminLogout,
  onOpenViewerGate,
  onLockViewer,
  onOpenInbox,
  onOpenNewBooking,
  onOpenRequestModal,
  onOpenConfigModal,
  pendingRequests,
  selectedDate,
  onSelectDate,
  weekOffset,
  onSetWeekOffset,
  isFloorFirstMobile,
  onToggleFloorFirst,
  notificationsEnabled,
  onToggleNotifications,
  sseConnected,
  totalReservationsCount,
  roomsCount = 15,
}) => {
  const currentWeekInfo = getWeekRange(currentTime, weekOffset);
  const now = currentTime;

  return (
    <header className="bg-[#1E293B] text-slate-100 border-b border-slate-700 sticky top-0 z-30 shadow-lg">
      {/* Dedication Banner at the very top */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-1 text-right">
        <div className="max-w-7xl mx-auto flex items-center justify-end">
          <p className="text-[11px] sm:text-xs text-amber-200/90 font-medium tracking-wide italic flex items-center gap-1.5 drop-shadow-sm">
            <span className="text-amber-400">✨</span>
            <span>A gift from Sura khanum's beloved student, Vugar Mirzayev (2026)</span>
          </p>
        </div>
      </div>

      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Facility Info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold italic shadow-inner">
            IG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                <span>IELTS Gate</span>
                <span className="text-slate-400 font-normal text-sm">| Facility Manager</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 font-mono font-medium border border-slate-700">
                  {roomsCount} Rooms · 3 Floors
                </span>
              </h1>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio className={`w-2.5 h-2.5 ${sseConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className={sseConnected ? 'text-slate-300' : 'text-slate-500'}>
                  {sseConnected ? '24/7 Live Synced' : 'Connecting...'}
                </span>
              </span>
              <span>•</span>
              <span>14-Day Continuous Schedule</span>
            </div>
          </div>
        </div>

        {/* Real-time Clock & Building Timezone */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="hidden md:flex flex-col items-end px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <div className="flex items-center space-x-1.5 text-xs text-slate-200 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Building Local Time:</span>
              <span className="font-bold text-white">{formatTime(currentTime, config.building_timezone)}</span>
              <span className="text-slate-400 text-[10px]">({config.building_timezone.split('/')[1] || config.building_timezone})</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {formatDate(currentTime, config.building_timezone)}
            </div>
          </div>

          {/* Gate Status & Access Switcher */}
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Admin Dashboard
                </span>
                <button
                  id="header-admin-inbox-btn"
                  onClick={onOpenInbox}
                  className="relative px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                >
                  <Inbox className="w-4 h-4 text-blue-300" />
                  <span className="hidden sm:inline">Inbox</span>
                  {pendingRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
                <button
                  id="header-new-booking-btn"
                  onClick={onOpenNewBooking}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium border border-blue-500 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">New Booking</span>
                </button>
                <button
                  id="header-config-btn"
                  onClick={onOpenConfigModal}
                  title="Facility Configuration"
                  className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  id="header-admin-logout-btn"
                  onClick={onAdminLogout}
                  className="px-2.5 py-1.5 rounded bg-slate-700 hover:bg-red-900/50 text-slate-300 hover:text-red-200 border border-slate-600 text-xs transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  Viewer Access
                </span>
                <button
                  id="header-request-room-btn"
                  onClick={onOpenRequestModal}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium border border-blue-500 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Request Room</span>
                </button>
                <button
                  id="header-admin-gate-btn"
                  onClick={onOpenAdminLogin}
                  className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Admin Gate</span>
                </button>
                {onLockViewer && (
                  <button
                    id="header-viewer-lock-btn"
                    onClick={onLockViewer}
                    title="Lock screen / Exit to Access Gate"
                    className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Notification & Sound Alert Toggle - ONLY visible for Admin */}
            {isAdmin && (
              <button
                id="header-notification-toggle-btn"
                onClick={onToggleNotifications}
                title={
                  notificationsEnabled
                    ? 'Live Alerts & Sounds: Active (Click to Mute)'
                    : 'Live Alerts & Sounds: Muted (Click to Turn On)'
                }
                aria-label="Toggle Live Notifications and Sound Alerts"
                className={`relative p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  notificationsEnabled
                    ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-xs hover:bg-blue-600/40'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {notificationsEnabled ? (
                  <>
                    <Bell className="w-4 h-4 text-blue-300" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                  </>
                ) : (
                  <BellOff className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Week and 14-Day Calendar Navigation Bar */}
      <div className="bg-slate-900/95 border-t border-slate-700/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Week Selector Controls */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            <div className="flex bg-slate-800 border border-slate-700 rounded p-0.5">
              <button
                id="week-prev-btn"
                onClick={() => onSetWeekOffset(weekOffset - 1)}
                className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 whitespace-nowrap ${
                  weekOffset < 0
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/70'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous Week</span>
              </button>

              <button
                id="week-present-btn"
                onClick={() => onSetWeekOffset(0)}
                className={`px-3.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap ${
                  weekOffset === 0
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/70 font-medium'
                }`}
              >
                Present Week
              </button>

              <button
                id="week-next-btn"
                onClick={() => onSetWeekOffset(1)}
                className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 whitespace-nowrap ${
                  weekOffset === 1
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/70 font-medium'
                }`}
              >
                <span>Next Week</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {weekOffset !== 0 && (
              <button
                id="jump-today-btn"
                onClick={() => {
                  onSetWeekOffset(0);
                  onSelectDate(new Date());
                }}
                className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-blue-300 hover:text-white border border-slate-700 whitespace-nowrap font-medium transition-colors"
              >
                Today
              </button>
            )}
          </div>

          {/* View Layout Toggle (Floor-First Mobile vs 24h Timeline Grid) */}
          <div className="flex items-center justify-between md:justify-end space-x-2">
            <button
              id="view-toggle-mode-btn"
              onClick={onToggleFloorFirst}
              className="px-3 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{isFloorFirstMobile ? 'Switch to Full 15-Room Timeline' : 'Floor-First Mobile View'}</span>
            </button>
          </div>
        </div>

        {/* 7-Day Day Selector Bar for the Selected Week */}
        <div className="max-w-7xl mx-auto mt-2.5 grid grid-cols-7 gap-1 sm:gap-2">
          {currentWeekInfo.days.map((day, idx) => {
            const isToday = isSameDay(day, now);
            const isSelected = isSameDay(day, selectedDate);
            const weekdayName = day.toLocaleDateString('en-GB', { weekday: 'short' });
            const dayNumber = day.getDate();
            const monthName = day.toLocaleDateString('en-GB', { month: 'short' });

            return (
              <button
                key={idx}
                id={`day-tab-${idx}`}
                onClick={() => onSelectDate(day)}
                className={`py-1.5 px-1 sm:px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-400'
                    : isToday
                    ? 'bg-slate-800 border-blue-500/50 text-blue-300 hover:bg-slate-700'
                    : 'bg-slate-800/50 border-slate-700/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="text-[10px] sm:text-xs uppercase font-semibold tracking-wider flex items-center justify-center gap-1">
                  <span>{weekdayName}</span>
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" title="Today" />}
                </div>
                <div className={`text-xs sm:text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : isToday ? 'text-blue-300' : 'text-slate-200'}`}>
                  {monthName} {dayNumber}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
