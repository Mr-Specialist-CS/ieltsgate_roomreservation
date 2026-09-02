import React, { useState } from 'react';
import { Eye, KeyRound, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface ViewerGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ViewerGateModal: React.FC<ViewerGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the shared Access Code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/viewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Invalid Access Code. Please try again.');
      }
    } catch {
      setError('Network error verifying code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-5 mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Gate 1: Viewer Access</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Enter the shared IELTS Facility Access Code to unlock the 14-day schedule and room availability.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Access Code
            </label>
            <div className="relative">
              <input
                id="viewer-access-code-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter facility access code"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-blue-700 placeholder-slate-400 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                autoFocus
              />
            </div>
          </div>

          <button
            id="viewer-gate-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Verifying...' : 'Unlock Schedule View'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-1.5 text-slate-600">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Full schedule transparency: Names & purposes are visible to all users.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
