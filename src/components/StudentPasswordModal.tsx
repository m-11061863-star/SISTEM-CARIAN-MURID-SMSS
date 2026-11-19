import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, School, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { USER_PASSWORD } from '../data/initialStudents';

interface Props {
  onSuccess: () => void;
  onOpenAdmin: () => void;
}

export const StudentPasswordModal: React.FC<Props> = ({ onSuccess, onOpenAdmin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === USER_PASSWORD) {
      if (rememberMe) {
        localStorage.setItem('delima_user_unlocked', 'true');
      } else {
        sessionStorage.setItem('delima_user_unlocked', 'true');
      }
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-4 ring-4 ring-blue-50">
            <School className="w-8 h-8" />
          </div>
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-2 tracking-wide uppercase">
            Portal DELIMa Sekolah
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Direktori Carian Murid
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sila masukkan kata laluan carian untuk mengakses direktori umum murid sekolah.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Kata Laluan Akses
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
                placeholder="Masukkan kata laluan..."
                className={`w-full pl-11 pr-11 py-3 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-medium ${
                  error
                    ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/50 text-rose-900'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-slate-800'
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Sembunyikan' : 'Tunjukkan'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-2 text-rose-600 text-xs font-medium animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Kata laluan salah. Sila cuba lagi.</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Ingat sesi ini di pelayar</span>
            </label>
            <span className="text-slate-400 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
              Akses Awam
            </span>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>Buka Sistem Carian</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Admin Access Divider */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-3">
            Guru atau Pentadbir Sekolah (DELIMa Admin)?
          </p>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Portal Akses Pentadbir (Admin)</span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Direka mengikut Polisi Keselamatan & Privasi Murid KPM</span>
        </div>
      </div>
    </div>
  );
};
