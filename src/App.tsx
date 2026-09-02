import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TimelineView } from './components/TimelineView';
import { FloorFirstMobileView } from './components/FloorFirstMobileView';
import { ViewerGateModal } from './components/ViewerGateModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { RequestModal } from './components/RequestModal';
import { AdminInboxModal } from './components/AdminInboxModal';
import { NewBookingModal } from './components/NewBookingModal';
import { ConflictReportModal } from './components/ConflictReportModal';
import { ReservationDetailsModal } from './components/ReservationDetailsModal';
import { ConfigModal } from './components/ConfigModal';
import { Room, Reservation, ReservationRequest, AppConfig, ConflictReport } from './types';
import { playNotificationSound } from './utils/audio';
import { formatDate, formatTime } from './utils/time';
import { Bell, CheckCircle, ShieldAlert, Sparkles, Building2 } from 'lucide-react';

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [requests, setRequests] = useState<ReservationRequest[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    viewer_access_code: 'IELTS2026',
    building_timezone: 'Europe/London',
    building_name: 'IELTS Gate International Test Facility',
    require_viewer_code: true,
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = Present Week, 1 = Next Week, -1 = Previous Week

  // Access Gates
  const [isViewerAuthenticated, setIsViewerAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Layout View Mode
  const [isFloorFirstMobile, setIsFloorFirstMobile] = useState<boolean>(() => {
    return window.innerWidth < 768;
  });

  // Native Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);

  // SSE State
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  // Modals
  const [viewerGateOpen, setViewerGateOpen] = useState<boolean>(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState<boolean>(false);
  const [inboxOpen, setInboxOpen] = useState<boolean>(false);
  const [newBookingOpen, setNewBookingOpen] = useState<boolean>(false);
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [conflictReportOpen, setConflictReportOpen] = useState<boolean>(false);
  const [conflictReport, setConflictReport] = useState<ConflictReport | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Quick book targeting
  const [quickBookRoomId, setQuickBookRoomId] = useState<string | undefined>(undefined);
  const [quickBookHour, setQuickBookHour] = useState<number | undefined>(undefined);

  // Real-time clock update (every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check authentication on mount - ALWAYS require code on load/refresh
  useEffect(() => {
    try {
      localStorage.removeItem('ielts_viewer_authenticated');
      sessionStorage.removeItem('ielts_viewer_authenticated');
    } catch (_) {}

    setIsViewerAuthenticated(false);
    setViewerGateOpen(true);

    const savedAdmin = localStorage.getItem('ielts_admin_authenticated');
    if (savedAdmin === 'true') {
      setIsAdmin(true);
    }

    // Notification setting initialization
    const savedNotifs = localStorage.getItem('ielts_notifications_enabled');
    if (savedNotifs !== null) {
      setNotificationsEnabled(savedNotifs === 'true');
    } else {
      // Default to enabled for live alerts
      setNotificationsEnabled(true);
    }
  }, []);

  // Fetch initial state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
        setReservations(data.reservations || []);
        setRequests(data.requests || []);
        if (data.config) setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load facility state:', err);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Server-Sent Events (SSE) Real-Time Synchronization
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.addEventListener('sync', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.rooms) setRooms(data.rooms);
          if (data.reservations) setReservations(data.reservations);
          if (data.requests) setRequests(data.requests);
          if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
          setSseConnected(true);
        } catch (err) {
          console.error('Error parsing sync event:', err);
        }
      });

      eventSource.addEventListener('new_request', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.request) {
            setRequests(prev => [data.request, ...prev.filter(r => r.id !== data.request.id)]);
            
            // Audio alert & Native Notification if enabled
            if (notificationsEnabled) {
              playNotificationSound();
            }

            const title = 'New Room Reservation Request';
            const body = `${data.request.user_name} ${data.request.user_surname} requested a booking for ${data.request.purpose}`;
            
            setToastMessage({ title, body });
            setTimeout(() => setToastMessage(null), 5000);

            if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(title, {
                  body,
                  icon: '/favicon.ico',
                });
              } catch (_) {}
            }
          }
        } catch (err) {
          console.error('Error handling new_request event:', err);
        }
      });

      eventSource.addEventListener('state_change', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.reservations) setReservations(data.reservations);
          if (data.requests) setRequests(data.requests);
        } catch (err) {
          console.error('Error handling state_change event:', err);
        }
      });

      eventSource.addEventListener('config_change', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
        } catch (err) {
          console.error('Error handling config_change event:', err);
        }
      });

      eventSource.addEventListener('rooms_change', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.rooms) setRooms(data.rooms);
        } catch (err) {
          console.error('Error handling rooms_change event:', err);
        }
      });

      eventSource.onerror = () => {
        setSseConnected(false);
        eventSource?.close();
        setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

  // Notification & Audio Alert Toggle
  const handleToggleNotifications = async () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    localStorage.setItem('ielts_notifications_enabled', String(nextState));

    if (nextState) {
      // Play a confirmation chime
      playNotificationSound();

      // Check browser desktop permission if supported
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            try {
              new Notification('IELTS Gate Live Alerts Active', {
                body: 'Real-time booking alerts and sound chimes are now enabled.',
                icon: '/favicon.ico',
              });
            } catch (_) {}
          }
        } catch (_) {
          // Handled silently for sandboxed iframes
        }
      }

      setToastMessage({
        title: 'Live Alerts & Sounds Enabled',
        body: 'You will hear chime alerts and see notifications for new booking requests.',
      });
      setTimeout(() => setToastMessage(null), 3500);
    } else {
      setToastMessage({
        title: 'Alerts Muted',
        body: 'Audio chimes and live pop-up notifications are now turned off.',
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Quick book / request trigger from timeline or floor card
  const handleQuickBookRoom = (roomId: string, startHour?: number) => {
    setQuickBookRoomId(roomId);
    setQuickBookHour(startHour || 9);
    if (isAdmin) {
      setNewBookingOpen(true);
    } else {
      setRequestModalOpen(true);
    }
  };

  // Admin Early Checkout
  const handleEarlyCheckout = async (reservationId: string) => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}/checkout`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchState();
      }
    } catch (err) {
      console.error('Early checkout failed:', err);
    }
  };

  if (!isViewerAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between">
        <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-2 text-right">
          <p className="text-[11px] sm:text-xs text-amber-200/90 font-medium tracking-wide italic">
            <span className="text-amber-400">✨</span> A gift from Sura khanum's beloved student, Vugar Mirzayev (2026)
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <ViewerGateModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {
              setIsViewerAuthenticated(true);
              setViewerGateOpen(false);
            }}
          />
        </div>

        <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800">
          <p>{config.building_name} · Protected Facility Portal</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header with 14-Day Calendar Navigator, Real-time Clock, & Gates */}
      <Header
        config={config}
        currentTime={currentTime}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setAdminLoginOpen(true)}
        onAdminLogout={() => {
          setIsAdmin(false);
          localStorage.removeItem('ielts_admin_authenticated');
        }}
        onOpenViewerGate={() => setViewerGateOpen(true)}
        onLockViewer={() => {
          setIsViewerAuthenticated(false);
          setViewerGateOpen(true);
        }}
        onOpenInbox={() => setInboxOpen(true)}
        onOpenNewBooking={() => {
          setQuickBookRoomId(undefined);
          setQuickBookHour(undefined);
          setNewBookingOpen(true);
        }}
        onOpenRequestModal={() => {
          setQuickBookRoomId(undefined);
          setQuickBookHour(undefined);
          setRequestModalOpen(true);
        }}
        onOpenConfigModal={() => setConfigModalOpen(true)}
        pendingRequests={requests}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weekOffset={weekOffset}
        onSetWeekOffset={setWeekOffset}
        isFloorFirstMobile={isFloorFirstMobile}
        onToggleFloorFirst={() => setIsFloorFirstMobile(!isFloorFirstMobile)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        sseConnected={sseConnected}
        totalReservationsCount={reservations.length}
        roomsCount={rooms.length}
      />

      {/* Floating System Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-xl bg-white border border-slate-200 shadow-xl text-slate-800 max-w-sm animate-bounce">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{toastMessage.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5">{toastMessage.body}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {isFloorFirstMobile ? (
          <FloorFirstMobileView
            rooms={rooms}
            reservations={reservations}
            selectedDate={selectedDate}
            currentTime={currentTime}
            config={config}
            isAdmin={isAdmin}
            onSelectReservation={(res) => setSelectedReservation(res)}
            onQuickBookRoom={handleQuickBookRoom}
            onEarlyCheckout={handleEarlyCheckout}
          />
        ) : (
          <TimelineView
            rooms={rooms}
            reservations={reservations}
            selectedDate={selectedDate}
            currentTime={currentTime}
            config={config}
            isAdmin={isAdmin}
            onSelectReservation={(res) => setSelectedReservation(res)}
            onQuickBookRoom={handleQuickBookRoom}
          />
        )}
      </main>

      {/* Footer Info & Facility Status */}
      <footer className="bg-slate-100 border-t border-slate-200 py-3.5 px-4 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              <strong className="text-slate-700">{config.building_name}</strong> · Enforced Local Timezone: <span className="font-mono text-slate-800 font-medium">{config.building_timezone}</span>
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <span>24/7 Timeline</span>
            <span>•</span>
            <span>1-Minute Buffer Enforced</span>
            <span>•</span>
            <span>14-Day Rolling Window</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ViewerGateModal
        isOpen={viewerGateOpen && !isViewerAuthenticated}
        onClose={() => setViewerGateOpen(false)}
        onSuccess={() => {
          setIsViewerAuthenticated(true);
          setViewerGateOpen(false);
        }}
      />

      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onSuccess={() => setIsAdmin(true)}
      />

      <RequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        rooms={rooms}
        reservations={reservations}
        config={config}
        defaultRoomId={quickBookRoomId}
        defaultDate={selectedDate}
        defaultStartHour={quickBookHour}
        onRequestSubmitted={fetchState}
      />

      <AdminInboxModal
        isOpen={inboxOpen}
        onClose={() => setInboxOpen(false)}
        requests={requests}
        rooms={rooms}
        config={config}
        onApproveSuccess={(report) => {
          fetchState();
          if (report && report.total_conflicts > 0) {
            setConflictReport(report);
            setConflictReportOpen(true);
          }
        }}
      />

      <NewBookingModal
        isOpen={newBookingOpen}
        onClose={() => setNewBookingOpen(false)}
        rooms={rooms}
        reservations={reservations}
        config={config}
        defaultRoomId={quickBookRoomId}
        defaultDate={selectedDate}
        defaultStartHour={quickBookHour}
        onBookingSuccess={(report) => {
          fetchState();
          if (report && report.total_conflicts > 0) {
            setConflictReport(report);
            setConflictReportOpen(true);
          }
        }}
      />

      <ConflictReportModal
        isOpen={conflictReportOpen}
        onClose={() => setConflictReportOpen(false)}
        report={conflictReport}
        config={config}
      />

      <ReservationDetailsModal
        isOpen={!!selectedReservation}
        onClose={() => setSelectedReservation(null)}
        reservation={selectedReservation}
        rooms={rooms}
        config={config}
        isAdmin={isAdmin}
        onEarlyCheckout={handleEarlyCheckout}
        onReservationUpdated={fetchState}
      />

      <ConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        config={config}
        rooms={rooms}
        onConfigUpdated={fetchState}
        onRoomsUpdated={fetchState}
      />
    </div>
  );
}
