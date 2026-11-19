import React, { useState } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, CheckCircle2, X, AlertTriangle, KeyRound } from 'lucide-react';
import { ADMIN_PASSWORD } from '../data/initialStudents';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPasswordModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [rememberAdmin, setRememberAdmin] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === ADMIN_PASSWORD) {
      if (rememberAdmin) {
        localStorage.setItem('delima_admin_unlocked', 'true');
      } else {
        sessionStorage.setItem('delima_admin_unlocked', 'true');
      }
      setPassword('');
      setError(false);
      onSuccess();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Top Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold mb-1">
                <KeyRound className="w-3 h-3" />
                <span>Pengesahan Pentadbir Sahaja</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Log Masuk Portal Admin
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Akses ini membolehkan anda melihat emel DELIMa pelajar yang disembunyikan, mengeksport data penuh, dan mengurus senarai.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Kata Laluan Pentadbir (Admin)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="Masukkan kata laluan admin..."
                  className={`w-full pl-11 pr-11 py-3 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-medium ${
                    error
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/50 text-rose-900'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 text-slate-800'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 mt-2 text-rose-600 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Kata laluan pentadbir tidak sah.</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kebenaran yang bakal dibuka:</span>
              </div>
              <ul className="list-disc list-inside text-slate-500 pl-1 space-y-0.5">
                <li>Buka kunci semua alamat emel DELIMa murid</li>
                <li>Salin emel murid satu per satu atau secara pukal</li>
                <li>Muat turun arkib CSV lengkap sekolah</li>
                <li>Papan pemuka statistik login & taburan kelas</li>
              </ul>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberAdmin}
                onChange={(e) => setRememberAdmin(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Kekalkan sesi pentadbir pada pelayar ini</span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white text-sm font-medium shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                Sahkan Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
