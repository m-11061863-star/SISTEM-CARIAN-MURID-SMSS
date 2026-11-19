import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, Check, Copy, Shield, ShieldAlert, ExternalLink, School, Sparkles, Edit3, BookOpen } from 'lucide-react';
import { Student, APPROVED_CLASS_NAMES, NameCaseMode } from '../types';
import { maskEmail, getTingkatanBadgeColor, getCurrentSchoolYear, formatStudentName } from '../utils/helpers';

interface Props {
  student: Student | null;
  isAdmin: boolean;
  nameFormat: NameCaseMode;
  onChangeNameFormat: (mode: NameCaseMode) => void;
  onClose: () => void;
  onRequestAdmin: () => void;
  onUpdateStudentClass?: (studentId: string, newClass: string) => void;
  onShowToast: (msg: string) => void;
}

export const StudentDetailModal: React.FC<Props> = ({
  student,
  isAdmin,
  nameFormat,
  onChangeNameFormat,
  onClose,
  onRequestAdmin,
  onUpdateStudentClass,
  onShowToast,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editClassVal, setEditClassVal] = useState('');

  useEffect(() => {
    if (!student) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [student, onClose]);

  if (!student) return null;

  const currentYear = getCurrentSchoolYear();
  const badgeColor = getTingkatanBadgeColor(student.tingkatan);
  const formattedName = formatStudentName(student.nama, nameFormat);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    onShowToast(`${label} disalin ke papan keratan!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveClass = () => {
    if (onUpdateStudentClass) {
      onUpdateStudentClass(student.id, editClassVal.trim());
      onShowToast(`Kelas murid berjaya dikemas kini kepada "${editClassVal.trim() || 'Kosong'}"`);
      setIsEditingClass(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative">
        {/* Compact Sticky Header with Prominent Close Button */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-medium">
            <School className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Profil Murid DELIMa</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup profil"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-4 py-4 sm:px-5 sm:py-5 overflow-y-auto flex-1 space-y-4">
          {/* Avatar, Badges & Name */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {student.nama.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                  {formattedName}
                </h3>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => onChangeNameFormat('titlecase')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                      nameFormat === 'titlecase'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Huruf Besar Awal Perkataan"
                  >
                    Aa
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeNameFormat('uppercase')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                      nameFormat === 'uppercase'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Huruf Besar Semua"
                  >
                    AA
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                ID Pelajar: {student.id}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor.bg} ${badgeColor.border}`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{student.tingkatanLabel}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <BookOpen className="w-3 h-3" />
                  <span>{student.kelas || 'Tiada Kelas'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Email Field with Admin Protection Logic */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Emel DELIMa</span>
              </span>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Shield className="w-3 h-3" />
                  <span>Akses Admin</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full">
                  <ShieldAlert className="w-3 h-3 text-slate-500" />
                  <span>Dilindungi</span>
                </span>
              )}
            </div>

            {isAdmin ? (
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 select-all break-all">
                  {student.email || 'Tiada Emel Didaftarkan'}
                </span>
                {student.email && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(student.email, 'Emel')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                      title="Salin Emel"
                    >
                      {copiedField === 'Emel' ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`mailto:${student.email}`}
                      className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition-colors"
                      title="Hantar Emel"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1.5">
                <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <span className="font-mono text-xs text-slate-400 select-none tracking-wider truncate">
                    {student.email ? maskEmail(student.email) : 'Tiada Emel'}
                  </span>
                  <button
                    onClick={onRequestAdmin}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Buka Kunci</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Emel disembunyikan untuk privasi. Log masuk pentadbir untuk melihat emel penuh.
                </p>
              </div>
            )}
          </div>

          {/* Editable Class & Other Metadata */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Kelas Murid
                </span>
                {isAdmin && !isEditingClass && (
                  <button
                    onClick={() => {
                      setEditClassVal(student.kelas || '');
                      setIsEditingClass(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingClass ? (
                <div className="space-y-1.5 mt-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editClassVal}
                      onChange={(e) => setEditClassVal(e.target.value)}
                      placeholder="Taip kelas"
                      className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveClass}
                      className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
                      title="Simpan"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingClass(false)}
                      className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {APPROVED_CLASS_NAMES.map((cls) => {
                      const formDigit = student.tingkatan.replace('T', '') || '1';
                      const candidate = `${formDigit} ${cls} ${currentYear}`;
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setEditClassVal(candidate)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium border border-indigo-200 cursor-pointer"
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <span className="font-semibold text-xs sm:text-sm text-slate-800 block truncate">
                  {student.kelas || <span className="text-slate-400 italic">Tiada Kelas</span>}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Status Akaun
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-slate-800">
                <span
                  className={`w-2 h-2 rounded-full ${
                    student.status === 'Sudah Login' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>{student.status}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Tarikh Jana</span>
              </span>
              <span className="font-mono text-[11px] text-slate-700">
                {student.tarikhJana || '-'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Tarikh Login Terkini</span>
              </span>
              <span className="font-mono text-[11px] text-slate-700">
                {student.tarikhLogin || 'Belum Pernah Login'}
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Footer Action Buttons (Always Reachable) */}
        <div className="px-4 py-3 sm:px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => copyToClipboard(formattedName, 'Nama Murid')}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            {copiedField === 'Nama Murid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Salin Nama</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
