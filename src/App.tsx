import React, { useState, useEffect } from 'react';
import {
  School,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Search,
  KeyRound,
  CheckCircle2,
  Sparkles,
  CaseSensitive
} from 'lucide-react';
import { Student, NameCaseMode } from './types';
import {
  initialStudents,
  STORAGE_KEY_STUDENTS,
  STORAGE_KEY_USER_AUTH,
  STORAGE_KEY_ADMIN_AUTH,
  STORAGE_KEY_LAST_CHECK_DATE,
} from './data/initialStudents';
import {
  getCurrentSchoolYear,
  processStudentProgression
} from './utils/helpers';
import { StudentPasswordModal } from './components/StudentPasswordModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { StudentList } from './components/StudentList';
import { AdminDashboard } from './components/AdminDashboard';
import { BatchImportModal } from './components/BatchImportModal';
import { NameConverterTab } from './components/NameConverterTab';

export default function App() {
  const currentYear = getCurrentSchoolYear();

  // Authentication states
  const [isUserUnlocked, setIsUserUnlocked] = useState<boolean>(() => {
    return (
      localStorage.getItem(STORAGE_KEY_USER_AUTH) === 'true' ||
      sessionStorage.getItem(STORAGE_KEY_USER_AUTH) === 'true'
    );
  });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return (
      localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true' ||
      sessionStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true'
    );
  });

  // Students data state with automatic daily & year check
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Re-calculate tingkatan based on current year to ensure auto-progression
          return parsed.map((s) => processStudentProgression(s, currentYear));
        }
      }
    } catch {
      // fallback to initial
    }
    return initialStudents.map((s) => processStudentProgression(s, currentYear));
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'search' | 'converter' | 'admin'>('search');
  const [nameFormat, setNameFormat] = useState<NameCaseMode>(() => {
    const saved = localStorage.getItem('delima_name_format_v1');
    return saved === 'titlecase' ? 'titlecase' : 'uppercase';
  });
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleChangeNameFormat = (mode: NameCaseMode) => {
    setNameFormat(mode);
    localStorage.setItem('delima_name_format_v1', mode);
  };

  // Daily Check: Verify current date and update student progression automatically
  useEffect(() => {
    const checkDailyProgression = () => {
      const today = new Date().toISOString().slice(0, 10);
      const lastCheck = localStorage.getItem(STORAGE_KEY_LAST_CHECK_DATE);

      if (lastCheck !== today) {
        // Daily rollover check
        const activeYear = getCurrentSchoolYear();
        setStudents((prev) =>
          prev.map((s) => processStudentProgression(s, activeYear))
        );
        localStorage.setItem(STORAGE_KEY_LAST_CHECK_DATE, today);
      }
    };

    checkDailyProgression();

    // Set recurring timer to check every 15 minutes for midnight/year rollover
    const timer = setInterval(checkDailyProgression, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync students to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    } catch (e) {
      console.warn('Could not save students to localStorage', e);
    }
  }, [students]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleUserLoginSuccess = () => {
    setIsUserUnlocked(true);
    showToast('Akses sistem carian berjaya dibuka');
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminUnlocked(true);
    showToast('Akses Pentadbir Berjaya Disahkan!');
  };

  const handleLogoutAdmin = () => {
    setIsAdminUnlocked(false);
    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    setActiveTab('search');
    showToast('Akses pentadbir ditutup. Emel murid kini disembunyikan semula.');
  };

  const handleFullLogout = () => {
    setIsUserUnlocked(false);
    setIsAdminUnlocked(false);
    localStorage.removeItem(STORAGE_KEY_USER_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_USER_AUTH);
    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    setActiveTab('search');
    showToast('Anda telah log keluar sepenuhnya daripada sistem.');
  };

  const handleUpdateStudentClass = (studentId: string, newClass: string) => {
    const trimmedClass = newClass.trim();
    const digitMatch = trimmedClass.match(/^([1-5])/);

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            baseKelas: trimmedClass,
            kelas: trimmedClass,
            baseYear: currentYear,
            ...(digitMatch
              ? {
                  baseTingkatan: `T${digitMatch[1]}`,
                  tingkatan: `T${digitMatch[1]}`,
                  tingkatanLabel: `Tingkatan ${digitMatch[1]}`,
                }
              : {}),
          };
        }
        return s;
      })
    );
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent((prev) =>
        prev
          ? {
              ...prev,
              baseKelas: trimmedClass,
              kelas: trimmedClass,
              baseYear: currentYear,
              ...(digitMatch
                ? {
                    baseTingkatan: `T${digitMatch[1]}`,
                    tingkatan: `T${digitMatch[1]}`,
                    tingkatanLabel: `Tingkatan ${digitMatch[1]}`,
                  }
                : {}),
            }
          : null
      );
    }
  };

  const handleResetToDefault = () => {
    const fresh = initialStudents.map((s) => processStudentProgression(s, currentYear));
    setStudents(fresh);
    localStorage.removeItem(STORAGE_KEY_STUDENTS);
  };

  const handleBatchImport = (newStudents: Student[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setStudents(newStudents);
    } else {
      setStudents((prev) => [...newStudents, ...prev]);
    }
  };

  // If user hasn't unlocked the general search portal
  if (!isUserUnlocked) {
    return (
      <>
        <StudentPasswordModal
          onSuccess={handleUserLoginSuccess}
          onOpenAdmin={() => setShowAdminModal(true)}
        />
        <AdminPasswordModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          onSuccess={() => {
            handleAdminLoginSuccess();
            setIsUserUnlocked(true);
            setActiveTab('admin');
          }}
        />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* School / DELIMa Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-blue-950 text-white flex items-center justify-center shadow-md shadow-blue-600/20 ring-2 ring-blue-100 shrink-0">
                <School className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                    DELIMa Sekolah
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Tahun {currentYear}</span>
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight mt-0.5">
                  Sistem Direktori & Carian Umum Murid (Auto-Naik Tingkatan)
                </p>
              </div>
            </div>

            {/* Navigation Tabs & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Tab Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'search'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Carian Umum</span>
                  <span className="sm:hidden">Carian</span>
                </button>

                <button
                  onClick={() => setActiveTab('converter')}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'converter'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CaseSensitive className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tukar AA → Aa</span>
                  <span className="sm:hidden">AA→Aa</span>
                </button>

                {isAdminUnlocked && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Pusat Admin</span>
                  </button>
                )}
              </div>

              {/* Special Admin Button (Butang Khas ke Page Admin) */}
              {!isAdminUnlocked ? (
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Akses Pentadbir Sekolah"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Akses Admin (Buka Emel)</span>
                  <span className="md:hidden">Admin</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Admin Aktif</span>
                  </span>
                  <button
                    onClick={handleLogoutAdmin}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Kunci semula emel murid & keluar daripada mod admin"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Kunci Emel</span>
                  </button>
                </div>
              )}

              {/* System Lock / Logout */}
              <button
                onClick={handleFullLogout}
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Kunci semula sistem & log keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'search' ? (
          <StudentList
            students={students}
            isAdmin={isAdminUnlocked}
            nameFormat={nameFormat}
            onChangeNameFormat={handleChangeNameFormat}
            onRequestAdmin={() => setShowAdminModal(true)}
            onSelectStudent={(student) => setSelectedStudent(student)}
            onUpdateStudentClass={handleUpdateStudentClass}
            onOpenBatchImport={() => setShowBatchModal(true)}
            onShowToast={showToast}
          />
        ) : activeTab === 'converter' ? (
          <NameConverterTab
            students={students}
            onShowToast={showToast}
          />
        ) : (
          <AdminDashboard
            students={students}
            nameFormat={nameFormat}
            onUpdateStudents={(newStudents) => setStudents(newStudents)}
            onUpdateStudentClass={handleUpdateStudentClass}
            onResetToDefault={handleResetToDefault}
            onExitAdmin={handleLogoutAdmin}
            onBackToSearch={() => setActiveTab('search')}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600" />
            <span>Sistem Direktori DELIMa Sekolah • Tahun Kalendar {currentYear}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>
              Akses Carian: <strong>Dilindungi</strong>
            </span>
            <span>•</span>
            <span>
              Akses Admin: <strong>{isAdminUnlocked ? 'Dibuka' : 'Terkunci'}</strong>
            </span>
            <span>•</span>
            <span className="text-slate-400">Total: {students.length} Murid</span>
          </div>
        </div>
      </footer>

      {/* Admin Password Modal */}
      <AdminPasswordModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          handleAdminLoginSuccess();
          setActiveTab('admin');
        }}
      />

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isAdmin={isAdminUnlocked}
        nameFormat={nameFormat}
        onChangeNameFormat={handleChangeNameFormat}
        onClose={() => setSelectedStudent(null)}
        onRequestAdmin={() => {
          setSelectedStudent(null);
          setShowAdminModal(true);
        }}
        onUpdateStudentClass={handleUpdateStudentClass}
        onShowToast={showToast}
      />

      {/* Batch Import Modal (Offline Deterministic Engine) */}
      <BatchImportModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onImportStudents={handleBatchImport}
        onShowToast={showToast}
        existingStudents={students}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
