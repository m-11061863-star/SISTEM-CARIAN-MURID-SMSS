import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  UserPlus,
  RefreshCw,
  LogOut,
  Users,
  CheckCircle,
  Copy,
  Mail,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
  X,
  Sparkles,
  CalendarDays,
  FileSpreadsheet,
  Edit2,
  BookOpen
} from 'lucide-react';
import { Student, NameCaseMode } from '../types';
import {
  exportStudentsToCsv,
  getCurrentSchoolYear,
  processStudentProgression
} from '../utils/helpers';
import { BatchImportModal } from './BatchImportModal';

interface Props {
  students: Student[];
  nameFormat: NameCaseMode;
  onUpdateStudents: (students: Student[]) => void;
  onUpdateStudentClass: (studentId: string, newClass: string) => void;
  onResetToDefault: () => void;
  onExitAdmin: () => void;
  onBackToSearch: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({
  students,
  nameFormat,
  onUpdateStudents,
  onUpdateStudentClass,
  onResetToDefault,
  onExitAdmin,
  onBackToSearch,
  onShowToast,
}) => {
  const currentYear = getCurrentSchoolYear();
  const [selectedFormForEmails, setSelectedFormForEmails] = useState<string>('SEMUA');
  const [selectedClassForEmails, setSelectedClassForEmails] = useState<string>('SEMUA');
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Compute school statistics
  const stats = useMemo(() => {
    const total = students.length;
    const sudahLogin = students.filter((s) => s.status === 'Sudah Login').length;
    const belumLogin = total - sudahLogin;
    const loginRate = total > 0 ? Math.round((sudahLogin / total) * 100) : 0;

    const byTingkatan: Record<string, { total: number; login: number }> = {};
    const byClass: Record<string, number> = {};

    students.forEach((s) => {
      const t = s.tingkatan || 'Alumni';
      if (!byTingkatan[t]) byTingkatan[t] = { total: 0, login: 0 };
      byTingkatan[t].total += 1;
      if (s.status === 'Sudah Login') byTingkatan[t].login += 1;

      if (s.kelas && s.kelas.trim()) {
        const k = s.kelas.trim();
        byClass[k] = (byClass[k] || 0) + 1;
      }
    });

    return { total, sudahLogin, belumLogin, loginRate, byTingkatan, byClass };
  }, [students]);

  // Unique classes for email extractor
  const uniqueClassNames = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.kelas && s.kelas.trim()) {
        if (selectedFormForEmails === 'SEMUA' || s.tingkatan === selectedFormForEmails) {
          set.add(s.kelas.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [students, selectedFormForEmails]);

  // Target emails for bulk copier by Tingkatan & Kelas
  const filteredTargetEmails = useMemo(() => {
    return students.filter((s) => {
      if (selectedFormForEmails !== 'SEMUA' && s.tingkatan !== selectedFormForEmails) {
        return false;
      }
      if (selectedClassForEmails !== 'SEMUA' && (s.kelas || '').trim() !== selectedClassForEmails) {
        return false;
      }
      return !!s.email;
    });
  }, [students, selectedFormForEmails, selectedClassForEmails]);

  const handleCopyBatchEmails = () => {
    const emailList = filteredTargetEmails.map((s) => s.email).join(', ');
    navigator.clipboard.writeText(emailList);
    setCopiedBatch(true);
    onShowToast(`${filteredTargetEmails.length} emel berjaya disalin!`);
    setTimeout(() => setCopiedBatch(false), 2500);
  };

  const handleBatchImport = (newStudents: Student[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      onUpdateStudents(newStudents);
    } else {
      onUpdateStudents([...newStudents, ...students]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-lg">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Portal Pentadbir DELIMa Aktif</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Pusat Pengurusan Data Pelajar & Kelas
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Akses penuh mendedahkan emel DELIMa, mengedit kelas secara manual, serta mendaftar murid secara batch melalui fail Excel/Sheets atau taip manual.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowBatchModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Daftar Batch (Excel / Sheets)</span>
            </button>
            <button
              onClick={onBackToSearch}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>Jadual Carian & Edit Kelas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExitAdmin}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Kunci semula emel murid dan keluar daripada mod pentadbir"
            >
              <LogOut className="w-4 h-4" />
              <span>Kunci Semula & Keluar Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Jumlah Rekod Pelajar
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {stats.total.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Pelajar Aktif & Alumni
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Akaun DELIMa Aktif
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">
              {stats.sudahLogin.toLocaleString()}
            </div>
            <span className="text-xs text-emerald-700 font-medium mt-1 inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {stats.loginRate}% sudah log masuk
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Jumlah Nama Kelas
            </span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-1">
              {Object.keys(stats.byClass).length}
            </div>
            <span className="text-xs text-indigo-600 font-medium mt-1 block">
              Boleh diedit manual oleh admin
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tahun Kalendar Semasa
            </span>
            <div className="text-3xl font-extrabold text-purple-600 mt-1">
              {currentYear}
            </div>
            <span className="text-xs text-purple-600 font-medium mt-1 block">
              Tingkatan auto-naik setiap tahun
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Distribution by Tingkatan */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <span>Taburan Murid Mengikut Tingkatan Semasa ({currentYear})</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {['T1', 'T2', 'T3', 'T4', 'T5', 'Alumni'].map((tKey) => {
            const data = stats.byTingkatan[tKey] || { total: 0, login: 0 };
            const percent = data.total > 0 ? Math.round((data.login / data.total) * 100) : 0;
            const label = tKey === 'Alumni' ? 'Alumni / Tamat' : `Tingkatan ${tKey.replace('T', '')}`;

            return (
              <div
                key={tKey}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:border-indigo-300 transition-colors"
              >
                <div className="text-xs font-bold text-slate-700">{label}</div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {data.total} <span className="text-xs font-normal text-slate-500">murid</span>
                </div>
                <div className="mt-2.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Login: {data.login}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Email Generator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <span>Salin Emel Pukal (Google Workspace / Drive / Classroom)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tapis mengikut tingkatan atau kelas untuk menyalin semua emel DELIMa murid sekali gus bagi jemputan Google Classroom atau Drive.
            </p>
          </div>

          <button
            onClick={handleCopyBatchEmails}
            disabled={filteredTargetEmails.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
          >
            {copiedBatch ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>Salin {filteredTargetEmails.length} Emel Terpilih</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Tingkatan:</span>
            <select
              value={selectedFormForEmails}
              onChange={(e) => {
                setSelectedFormForEmails(e.target.value);
                setSelectedClassForEmails('SEMUA');
              }}
              className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="SEMUA">Semua Murid ({students.length})</option>
              <option value="T1">Tingkatan 1</option>
              <option value="T2">Tingkatan 2</option>
              <option value="T3">Tingkatan 3</option>
              <option value="T4">Tingkatan 4</option>
              <option value="T5">Tingkatan 5</option>
              <option value="Alumni">Alumni / Tamat Sekolah</option>
            </select>
          </div>

          {uniqueClassNames.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Kelas:</span>
              <select
                value={selectedClassForEmails}
                onChange={(e) => setSelectedClassForEmails(e.target.value)}
                className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="SEMUA">Semua Kelas</option>
                {uniqueClassNames.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="ml-auto text-xs text-slate-500 font-medium">
            Dijumpai: <strong className="text-slate-900">{filteredTargetEmails.length}</strong> emel
          </span>
        </div>

        {/* Preview box */}
        <div className="relative">
          <div className="w-full max-h-36 overflow-y-auto bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs leading-relaxed select-all">
            {filteredTargetEmails.length > 0 ? (
              filteredTargetEmails.map((s) => s.email).filter(Boolean).join(', ')
            ) : (
              <span className="text-slate-500 italic">Tiada emel dijumpai untuk kriteria ini.</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>Format: Comma-separated (Sedia ditampal pada Google Classroom / Gmail)</span>
            <span>Domain: @moe-dl.edu.my</span>
          </div>
        </div>
      </div>

      {/* Admin Action Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <span>Pengurusan & Pendaftaran Data Sekolah</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Batch Register Modal Button */}
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-900">Daftar Batch Murid</span>
            <span className="text-xs text-slate-500 mt-1">
              Muat naik fail Excel (.xlsx/.xls) atau tampal teks baris dari Google Sheets dengan pengekstrak pintar.
            </span>
          </button>

          {/* Download CSV Full */}
          <button
            onClick={() => exportStudentsToCsv(students, true, `DELIMa_Murid_${currentYear}_Penuh.csv`, nameFormat)}
            className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-900">Eksport CSV Lengkap</span>
            <span className="text-xs text-slate-500 mt-1">
              Muat turun senarai lengkap termasuk nama, kelas terkini & emel DELIMa rasmi.
            </span>
          </button>

          {/* Quick Manual Edit Class guide */}
          <button
            onClick={onBackToSearch}
            className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Edit2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-900">Edit Kelas Secara Manual</span>
            <span className="text-xs text-slate-500 mt-1">
              Buka jadual carian untuk mengedit nama kelas mana-mana murid secara pantas di ruangan lajur kelas.
            </span>
          </button>

          {/* Reset to Default */}
          <button
            onClick={() => {
              if (window.confirm('Adakah anda pasti mahu set semula senarai murid ke data asal sekolah?')) {
                onResetToDefault();
                onShowToast('Senarai murid telah diset semula ke rekod asal.');
              }
            }}
            className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/30 transition-all text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <RefreshCw className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-900">Set Semula ke Data Asal</span>
            <span className="text-xs text-slate-500 mt-1">
              Pulihkan kepada 701 rekod asal murid dengan tingkatan auto-naik.
            </span>
          </button>
        </div>
      </div>

      {/* Batch Import Modal */}
      <BatchImportModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onImportStudents={handleBatchImport}
        onShowToast={onShowToast}
        existingStudents={students}
      />
    </div>
  );
};
