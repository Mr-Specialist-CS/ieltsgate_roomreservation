import React, { useState } from 'react';
import { 
  Inbox, 
  X, 
  Check, 
  Trash2, 
  Clock, 
  Building2, 
  Phone, 
  User, 
  Repeat, 
  AlertCircle, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { ReservationRequest, Room, AppConfig, ConflictReport } from '../types';
import { formatTime, formatDate } from '../utils/time';

interface AdminInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ReservationRequest[];
  rooms: Room[];
  config: AppConfig;
  onApproveSuccess: (report?: ConflictReport) => void;
}

export const AdminInboxModal: React.FC<AdminInboxModalProps> = ({
  isOpen,
  onClose,
  requests,
  rooms,
  config,
  onApproveSuccess,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApprove = async (req: ReservationRequest) => {
    setProcessingId(req.id);
    setActionError(null);

    try {
      const res = await fetch(`/api/requests/${req.id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onApproveSuccess(data.report);
      } else {
        setActionError(data.error || 'Failed to approve request');
      }
    } catch {
      setActionError('Network error approving request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSilentReject = async (req: ReservationRequest) => {
    setProcessingId(req.id);
    setActionError(null);

    try {
      const res = await fetch(`/api/requests/${req.id}/reject`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onApproveSuccess();
      } else {
        setActionError(data.error || 'Failed to reject request');
      }
    } catch {
      setActionError('Network error rejecting request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative text-slate-800 my-8">
        <button
          id="inbox-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">Admin Request Inbox</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                {requests.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Approve to add to official schedule, or silent reject (deletes without alert)
            </p>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-800">Inbox is Clear</p>
            <p className="text-xs text-slate-500 mt-1">All reservation requests have been processed.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {requests.map((req) => {
              const room = rooms.find(r => r.id === req.room_id);
              const isProcessing = processingId === req.id;

              return (
                <div
                  key={req.id}
                  id={`inbox-req-card-${req.id}`}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        {req.user_name} {req.user_surname}
                      </span>
                      <span className="text-xs font-mono text-slate-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {req.user_phone}
                      </span>
                      {req.recurrence && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Repeat className="w-3 h-3" />
                          {req.recurrence.count}x {req.recurrence.frequency}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-blue-700">
                        {room ? room.name : req.room_id}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500 font-mono">
                        {formatDate(req.start_time, config.building_timezone)}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500 font-mono">
                        {formatTime(req.start_time, config.building_timezone)} – {formatTime(req.end_time, config.building_timezone)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 italic">
                      "{req.purpose}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      id={`inbox-reject-btn-${req.id}`}
                      disabled={isProcessing}
                      onClick={() => handleSilentReject(req)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Silently delete request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Silent Reject</span>
                    </button>

                    <button
                      id={`inbox-approve-btn-${req.id}`}
                      disabled={isProcessing}
                      onClick={() => handleApprove(req)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
