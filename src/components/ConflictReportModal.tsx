import React from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, Calendar, Repeat, ArrowRight } from 'lucide-react';
import { ConflictReport, AppConfig } from '../types';
import { formatDate, formatTime } from '../utils/time';

interface ConflictReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ConflictReport | null;
  config: AppConfig;
}

export const ConflictReportModal: React.FC<ConflictReportModalProps> = ({
  isOpen,
  onClose,
  report,
  config,
}) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative text-slate-800 my-8">
        <button
          id="conflict-report-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            report.total_conflicts > 0
              ? 'bg-amber-50 border border-amber-200 text-amber-600'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
          }`}>
            {report.total_conflicts > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recurring Series Conflict Report</h2>
            <p className="text-xs text-slate-500">
              Linked series booking result across requested dates
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-xl font-bold text-slate-900 font-mono">{report.total_requested}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Requested</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-xl font-bold text-emerald-700 font-mono">{report.total_booked}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Booked</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <div className="text-xl font-bold text-rose-700 font-mono">{report.total_conflicts}</div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">Conflicts</div>
          </div>
        </div>

        {/* Date Items List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {report.items.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                item.success
                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                  : 'bg-rose-50/50 border-rose-200 text-slate-800'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                {item.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-900">
                    {formatDate(item.date, config.building_timezone)}
                  </div>
                  {item.success ? (
                    <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                      Successfully scheduled and confirmed
                    </div>
                  ) : (
                    <div className="text-[11px] text-rose-700 mt-0.5 space-y-0.5">
                      <p className="font-medium">{item.reason}</p>
                      {item.conflict_with && (
                        <p className="text-slate-500 italic">
                          Existing: {item.conflict_with.user_name} ({formatTime(item.conflict_with.start_time, config.building_timezone)} - {formatTime(item.conflict_with.end_time, config.building_timezone)})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  item.success
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {item.success ? 'CONFIRMED' : 'SKIPPED'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            id="conflict-report-done-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Acknowledge Report
          </button>
        </div>
      </div>
    </div>
  );
};
