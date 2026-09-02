import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  KeyRound, 
  Globe, 
  Building2, 
  Save, 
  CheckCircle, 
  ShieldCheck, 
  Users, 
  Plus, 
  Minus, 
  Layers,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { AppConfig, Room } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  rooms: Room[];
  onConfigUpdated: () => void;
  onRoomsUpdated: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  rooms,
  onConfigUpdated,
  onRoomsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'facility'>('rooms');

  // Facility Config State
  const [viewerCode, setViewerCode] = useState(config.viewer_access_code || 'IELTS2026');
  const [adminPassword, setAdminPassword] = useState('');
  const [timezone, setTimezone] = useState(config.building_timezone || 'Asia/Baku');
  const [buildingName, setBuildingName] = useState(config.building_name || 'IELTS Gate International Test Facility');
  
  // Room Capacities State (editable local copy)
  const [editableRooms, setEditableRooms] = useState<Room[]>([]);
  const [selectedFloorTab, setSelectedFloorTab] = useState<number | 'all'>('all');

  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Sync rooms when modal opens or rooms prop updates
  useEffect(() => {
    if (isOpen) {
      setEditableRooms(rooms.map(r => ({ ...r })));
      setViewerCode(config.viewer_access_code || 'IELTS2026');
      setTimezone(config.building_timezone || 'Asia/Baku');
      setBuildingName(config.building_name || 'IELTS Gate International Test Facility');
      setAdminPassword('');
      setError('');
      setSavedSuccess(false);
    }
  }, [isOpen, rooms, config]);

  if (!isOpen) return null;

  const handleCapacityChange = (roomId: string, newCapacity: number) => {
    if (newCapacity < 1) return;
    setEditableRooms(prev =>
      prev.map(r => (r.id === roomId ? { ...r, capacity: Math.min(500, Math.max(1, newCapacity)) } : r))
    );
  };

  const handleRoomNameChange = (roomId: string, newName: string) => {
    setEditableRooms(prev =>
      prev.map(r => (r.id === roomId ? { ...r, name: newName } : r))
    );
  };

  const handleSaveRooms = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: editableRooms.map(r => ({
            id: r.id,
            capacity: Number(r.capacity) || 1,
            name: r.name,
            description: r.description,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSuccess(true);
        setSuccessMessage('Room capacities successfully updated and synchronized across all screens.');
        onRoomsUpdated();
        setTimeout(() => {
          setSavedSuccess(false);
        }, 2000);
      } else {
        setError(data.error || 'Failed to update room capacities');
      }
    } catch {
      setError('Network error updating room capacities');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFacilityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        viewer_access_code: viewerCode.trim().toUpperCase(),
        building_timezone: timezone.trim(),
        building_name: buildingName.trim(),
      };
      if (adminPassword.trim()) {
        payload.admin_password = adminPassword.trim();
      }

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSuccess(true);
        setSuccessMessage('Facility security and building settings updated.');
        onConfigUpdated();
        setTimeout(() => {
          setSavedSuccess(false);
        }, 2000);
      } else {
        setError(data.error || 'Failed to update facility configuration');
      }
    } catch {
      setError('Network error saving configuration');
    } finally {
      setLoading(false);
    }
  };

  // Group rooms by floor
  const floors = [1, 2, 3];
  const totalCapacity = editableRooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

  const filteredRooms = selectedFloorTab === 'all'
    ? editableRooms
    : editableRooms.filter(r => r.floor_number === selectedFloorTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative text-slate-800 my-8">
        <button
          id="config-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Admin Facility Controls</h2>
            <p className="text-xs text-slate-500">Edit room seating capacities, room details, and system configuration</p>
          </div>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Room Capacities ({editableRooms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('facility')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'facility'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Facility & Security</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: ROOM CAPACITIES */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            {/* Top overview stats & Floor filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{editableRooms.length} Total Rooms</span>
                <span className="mx-2">•</span>
                <span>Combined Facility Capacity: <strong className="text-blue-700 font-mono">{totalCapacity} seats</strong></span>
              </div>

              {/* Floor filter buttons */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setSelectedFloorTab('all')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    selectedFloorTab === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                  }`}
                >
                  All Floors
                </button>
                {floors.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFloorTab(f)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                      selectedFloorTab === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                    }`}
                  >
                    Floor {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Room List Container */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs hover:border-blue-300 transition-colors"
                >
                  {/* Left: Room details */}
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                        Floor {room.floor_number}
                      </span>
                      <span className="font-semibold text-xs text-slate-800">{room.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-sm">
                      {room.description || 'Facility room for classes and mock evaluations'}
                    </p>
                  </div>

                  {/* Right: Capacity Stepper */}
                  <div className="flex items-center space-x-2 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Capacity:
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCapacityChange(room.id, (Number(room.capacity) || 1) - 1)}
                      disabled={room.capacity <= 1}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center text-xs font-bold disabled:opacity-30 cursor-pointer shadow-2xs"
                      title="Decrease capacity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={room.capacity}
                      onChange={(e) => handleCapacityChange(room.id, parseInt(e.target.value) || 1)}
                      className="w-12 text-center py-0.5 px-1 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleCapacityChange(room.id, (Number(room.capacity) || 1) + 1)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer shadow-2xs"
                      title="Increase capacity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <span className="text-[11px] text-slate-500 font-medium">seats</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Save All Room Capacities Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditableRooms(rooms.map(r => ({ ...r })))}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Saved</span>
              </button>

              <button
                id="save-room-capacities-btn"
                type="button"
                onClick={handleSaveRooms}
                disabled={loading}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving Changes...' : 'Save All Room Capacities'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FACILITY & SECURITY CONFIGURATION */}
        {activeTab === 'facility' && (
          <form onSubmit={handleSaveFacilityConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Facility Name
              </label>
              <input
                type="text"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Gate 1 Viewer Access Code (Shared for Viewers)
              </label>
              <input
                type="text"
                value={viewerCode}
                onChange={(e) => setViewerCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-blue-700 font-mono text-xs uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Gate 2 Admin Password
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep unchanged"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Building Local Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="Europe/London">Europe/London (GMT/BST - IELTS Standard)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Asia/Baku">Asia/Baku (AZT UTC+4)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST UTC+4)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT UTC+8)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST UTC+10)</option>
              </select>
            </div>

            <button
              id="config-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Facility Configuration'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
