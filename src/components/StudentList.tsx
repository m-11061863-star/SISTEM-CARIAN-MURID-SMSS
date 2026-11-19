import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  Mail,
  ShieldAlert,
  Check,
  Copy,
  LayoutList,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Sparkles,
  Download,
  AlertCircle,
  Clock,
  Edit2,
  BookOpen,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import { Student, SortField, SortOrder, APPROVED_CLASS_NAMES, NameCaseMode } from '../types';
import {
  maskEmail,
  getTingkatanBadgeColor,
  exportStudentsToCsv,
  getCurrentSchoolYear,
  formatStudentName
} from '../utils/helpers';

interface Props {
  students: Student[];
  isAdmin: boolean;
  nameFormat: NameCaseMode;
  onChangeNameFormat: (mode: NameCaseMode) => void;
  onRequestAdmin: () => void;
  onSelectStudent: (student: Student) => void;
  onUpdateStudentClass?: (studentId: string, newClass: string) => void;
  onOpenBatchImport?: () => void;
  onShowToast: (msg: string) => void;
}

export const StudentList: React.FC<Props> = ({
  students,
  isAdmin,
  nameFormat,
  onChangeNameFormat,
  onRequestAdmin,
  onSelectStudent,
  onUpdateStudentClass,
  onOpenBatchImport,
  onShowToast,
}) => {
  const currentYear = getCurrentSchoolYear();
  const [search, setSearch] = useState('');
  const [selectedTingkatan, setSelectedTingkatan] = useState('SEMUA');
  const [selectedKelas, setSelectedKelas] = useState('SEMUA');
  const [selectedStatus, setSelectedStatus] = useState('SEMUA');
  const [selectedLetter, setSelectedLetter] = useState('SEMUA');
  const [sortBy, setSortBy] = useState<SortField>('nama');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [copiedNameId, setCopiedNameId] = useState<string | null>(null);

  // Inline Class Editing state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [inlineClassValue, setInlineClassValue] = useState<string>('');

  // Alphabet list for quick letter filtering
  const alphabets = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), []);

  // Form counts
  const formCounts = useMemo(() => {
    const counts: Record<string, number> = {
      SEMUA: students.length,
      T1: 0,
      T2: 0,
      T3: 0,
      T4: 0,
      T5: 0,
      Alumni: 0,
    };
    students.forEach((s) => {
      const t = s.tingkatan || 'Alumni';
      if (counts[t] !== undefined) counts[t] += 1;
      else counts.Alumni += 1;
    });
    return counts;
  }, [students]);

  // Unique classes for filter
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.kelas && s.kelas.trim()) {
        if (selectedTingkatan === 'SEMUA' || s.tingkatan === selectedTingkatan) {
          set.add(s.kelas.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [students, selectedTingkatan]);

  // Reset page when form tab changes
  const handleTingkatanChange = (t: string) => {
    setSelectedTingkatan(t);
    setSelectedKelas('SEMUA');
    setCurrentPage(1);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((s) => {
      // Search term matches Name or Email or ID or Kelas
      if (query) {
        const matchName = s.nama.toLowerCase().includes(query);
        const matchId = s.id.toLowerCase().includes(query);
        const matchKelas = (s.kelas || '').toLowerCase().includes(query);
        const matchEmail = isAdmin && s.email.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchEmail && !matchKelas) {
          return false;
        }
      }

      // Tingkatan filter
      if (selectedTingkatan !== 'SEMUA') {
        if (s.tingkatan !== selectedTingkatan) {
          return false;
        }
      }

      // Kelas filter
      if (selectedKelas !== 'SEMUA') {
        if ((s.kelas || '').trim() !== selectedKelas) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'SEMUA' && s.status !== selectedStatus) {
        return false;
      }

      // Alphabet filter
      if (selectedLetter !== 'SEMUA') {
        if (!s.nama.toUpperCase().startsWith(selectedLetter)) {
          return false;
        }
      }

      return true;
    });
  }, [students, search, selectedTingkatan, selectedKelas, selectedStatus, selectedLetter, isAdmin]);

  // Sort students
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'nama') {
        comparison = a.nama.localeCompare(b.nama);
      } else if (sortBy === 'tingkatan') {
        comparison = (a.tingkatan || '').localeCompare(b.tingkatan || '');
      } else if (sortBy === 'kelas') {
        comparison = (a.kelas || '').localeCompare(b.kelas || '');
      } else if (sortBy === 'tarikhLogin') {
        comparison = (a.tarikhLogin || '').localeCompare(b.tarikhLogin || '');
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudents, sortBy, sortOrder]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return sortedStudents;
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedStudents.length / pageSize);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const copyEmail = (email: string, id: string) => {
    if (!isAdmin) {
      onRequestAdmin();
      return;
    }
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    onShowToast(`Emel ${email} disalin!`);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const startEditingClass = (student: Student) => {
    if (!isAdmin) {
      onRequestAdmin();
      return;
    }
    setEditingStudentId(student.id);
    setInlineClassValue(student.kelas || '');
  };

  const saveInlineClass = (studentId: string) => {
    if (onUpdateStudentClass) {
      onUpdateStudentClass(studentId, inlineClassValue.trim());
      onShowToast(`Kelas murid dikemaskini kepada: "${inlineClassValue.trim() || 'Kosong'}"`);
    }
    setEditingStudentId(null);
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedTingkatan('SEMUA');
    setSelectedKelas('SEMUA');
    setSelectedStatus('SEMUA');
    setSelectedLetter('SEMUA');
    setCurrentPage(1);
  };

  const copyName = (rawName: string, id: string) => {
    const formatted = formatStudentName(rawName, nameFormat);
    navigator.clipboard.writeText(formatted);
    setCopiedNameId(id);
    onShowToast(`Nama "${formatted}" disalin!`);
    setTimeout(() => setCopiedNameId(null), 2000);
  };

  // Helper to highlight search matches
  const highlightMatch = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return text;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-slate-950 px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Year & Progression Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">
                Direktori Murid & Semakan Harian Tingkatan
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Tahun Semasa: {currentYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tingkatan dikira secara automatik mengikut tahun semasa. Pentadbir boleh mengedit nama kelas secara manual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Semakan Automatik Harian: Aktif</span>
        </div>
      </div>

      {/* Search & Main Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
        {/* Search Input Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama murid, kelas, atau ID pelajar (Cth: Ahmad, 2 BUDI, m-9144055)..."
              className="w-full pl-11 pr-10 py-3 text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Padam carian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download CSV button */}
            <button
              onClick={() =>
                exportStudentsToCsv(
                  filteredStudents,
                  isAdmin,
                  `Senarai_Murid_DELIMa_${currentYear}_${selectedTingkatan !== 'SEMUA' ? selectedTingkatan : 'Semua'}.csv`,
                  nameFormat
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Eksport data yang dipaparkan ke CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Eksport CSV</span>
            </button>

            {/* Admin Quick Batch Register Button */}
            {isAdmin && onOpenBatchImport && (
              <button
                onClick={onOpenBatchImport}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                title="Buka Enjin Pengesanan Luar Talian untuk daftar murid secara batch"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden md:inline">Daftar Batch (Enjin Luar Talian)</span>
                <span className="md:hidden">Daftar Batch</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Paparan Jadual"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Paparan Kad Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tingkatan Tabs Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Tapisan Tingkatan Semasa ({currentYear})</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Jumlah: <strong>{filteredStudents.length}</strong> murid
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {[
              { id: 'SEMUA', label: 'Semua Murid', count: formCounts.SEMUA },
              { id: 'T1', label: 'Tingkatan 1', count: formCounts.T1 },
              { id: 'T2', label: 'Tingkatan 2', count: formCounts.T2 },
              { id: 'T3', label: 'Tingkatan 3', count: formCounts.T3 },
              { id: 'T4', label: 'Tingkatan 4', count: formCounts.T4 },
              { id: 'T5', label: 'Tingkatan 5', count: formCounts.T5 },
              { id: 'Alumni', label: 'Alumni / Tamat Sekolah', count: formCounts.Alumni },
            ].map((tab) => {
              const active = selectedTingkatan === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTingkatanChange(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filters: Kelas, Status & Alphabet */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Optional Kelas Filter */}
            {uniqueClasses.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Kelas:</span>
                <select
                  value={selectedKelas}
                  onChange={(e) => {
                    setSelectedKelas(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-800"
                >
                  <option value="SEMUA">Semua Kelas</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Login Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Status Login:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-800"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="Sudah Login">Sudah Login</option>
                <option value="Belum Login">Belum Login</option>
              </select>
            </div>

            {/* Clear Filters Button if any filter is active */}
            {(search ||
              selectedTingkatan !== 'SEMUA' ||
              selectedKelas !== 'SEMUA' ||
              selectedStatus !== 'SEMUA' ||
              selectedLetter !== 'SEMUA') && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Set Semula Tapisan</span>
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Susun:</span>
            </span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                setSortBy(field);
                setSortOrder(order);
              }}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-800"
            >
              <option value="nama-asc">Nama (A → Z)</option>
              <option value="nama-desc">Nama (Z → A)</option>
              <option value="tingkatan-asc">Tingkatan (Rendah → Tinggi)</option>
              <option value="kelas-asc">Kelas (A → Z)</option>
              <option value="tarikhLogin-desc">Tarikh Login Terbaru</option>
            </select>
          </div>
        </div>

        {/* Quick Alphabet Jump Bar */}
        <div className="pt-2 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Abjad:
          </span>
          <button
            onClick={() => {
              setSelectedLetter('SEMUA');
              setCurrentPage(1);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
              selectedLetter === 'SEMUA'
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Semua
          </button>
          {alphabets.map((ltr) => (
            <button
              key={ltr}
              onClick={() => {
                setSelectedLetter(ltr);
                setCurrentPage(1);
              }}
              className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
                selectedLetter === ltr
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {ltr}
            </button>
          ))}
        </div>
      </div>

      {/* Front Quick-Bar right in front of the Student List */}
      {paginatedStudents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-700">
              Format Paparan Nama:
            </span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onChangeNameFormat('titlecase')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  nameFormat === 'titlecase'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Jana automatik huruf besar di awal perkataan (Cth: Muhammad Ali bin Abu)"
              >
                Aa — Muhammad Ali bin Abu
              </button>
              <button
                type="button"
                onClick={() => onChangeNameFormat('uppercase')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  nameFormat === 'uppercase'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Jana automatik huruf besar semua (Cth: MUHAMMAD ALI BIN ABU)"
              >
                AA — MUHAMMAD ALI BIN ABU
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Memaparkan <strong>{paginatedStudents.length}</strong> daripada{' '}
            <strong>{sortedStudents.length}</strong> murid
          </span>
        </div>
      )}

      {/* Main Content: Table or Grid */}
      {paginatedStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Tiada Murid Dijumpai
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Tiada murid yang sepadan dengan kriteria carian anda. Sila ubah carian atau set semula tapisan.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Padamkan Semua Tapisan
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold tracking-wider select-none">
                  <th className="py-3.5 px-4 w-12 text-center">Bil</th>
                  <th
                    onClick={() => toggleSort('nama')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>Nama Pelajar</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeNameFormat(nameFormat === 'uppercase' ? 'titlecase' : 'uppercase');
                        }}
                        className="ml-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-blue-700 hover:bg-blue-50 normal-case cursor-pointer"
                        title="Tukar format huruf nama (Aa / AA)"
                      >
                        {nameFormat === 'titlecase' ? 'Aa' : 'AA'}
                      </button>
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('tingkatan')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-36"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tingkatan ({currentYear})</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('kelas')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-36"
                  >
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kelas</span>
                      {isAdmin && (
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded font-normal">
                          edit
                        </span>
                      )}
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Emel DELIMa</span>
                      {!isAdmin && (
                        <span className="text-[10px] lowercase text-slate-500 font-normal bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          dikunci
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('status')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-28"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('tarikhLogin')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-36 hidden md:table-cell"
                  >
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Tarikh Login</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right w-24">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedStudents.map((student, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const badge = getTingkatanBadgeColor(student.tingkatan);
                  const isInlineEditing = editingStudentId === student.id;

                  return (
                    <tr
                      key={student.id + idx}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                        {itemIndex}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.nama.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                {highlightMatch(formatStudentName(student.nama, nameFormat), search)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyName(student.nama, student.id)}
                                className="p-1 rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer shrink-0"
                                title="Salin nama murid mengikut format semasa"
                              >
                                {copiedNameId === student.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {student.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.border}`}
                        >
                          {student.tingkatanLabel}
                        </span>
                      </td>

                      {/* Kelas Column with Admin Quick-Edit */}
                      <td className="py-3 px-4">
                        {isInlineEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={inlineClassValue}
                              onChange={(e) => setInlineClassValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineClass(student.id);
                                if (e.key === 'Escape') setEditingStudentId(null);
                              }}
                              placeholder="Taip kelas..."
                              className="px-2 py-1 text-xs border border-indigo-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28 font-medium"
                              autoFocus
                            />
                            <button
                              onClick={() => saveInlineClass(student.id)}
                              className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
                              title="Simpan"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingStudentId(null)}
                              className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                              title="Batal"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => isAdmin && startEditingClass(student)}
                            className={`flex items-center gap-1.5 font-medium ${
                              isAdmin ? 'cursor-pointer hover:text-indigo-600 group/cls' : ''
                            }`}
                            title={isAdmin ? 'Klik untuk edit kelas murid ini' : undefined}
                          >
                            <span className={student.kelas ? 'text-slate-800' : 'text-slate-400 italic'}>
                              {student.kelas || '—'}
                            </span>
                            {isAdmin && (
                              <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover/cls:opacity-100 group-hover/cls:text-indigo-600 transition-opacity" />
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-900 select-all">
                              {student.email || <span className="text-slate-400 italic">Tiada emel</span>}
                            </span>
                            {student.email && (
                              <button
                                onClick={() => copyEmail(student.email, student.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Salin Emel"
                              >
                                {copiedEmailId === student.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={onRequestAdmin}
                            className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 hover:text-indigo-600 cursor-pointer group/mail"
                            title="Emel dikunci. Klik untuk log masuk admin."
                          >
                            <span>{student.email ? maskEmail(student.email) : 'Tiada emel'}</span>
                            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 group-hover/mail:text-indigo-600" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            student.status === 'Sudah Login'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.status === 'Sudah Login' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{student.status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] hidden md:table-cell">
                        {student.tarikhLogin || '-'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectStudent(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profil</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedStudents.map((student, idx) => {
            const badge = getTingkatanBadgeColor(student.tingkatan);

            return (
              <div
                key={student.id + idx}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {student.nama.charAt(0)}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.border}`}
                      >
                        {student.tingkatanLabel}
                      </span>
                      {student.kelas && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Kelas: {student.kelas}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight">
                    {highlightMatch(formatStudentName(student.nama, nameFormat), search)}
                  </h4>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                    <span>ID: {student.id}</span>
                    {isAdmin && (
                      <button
                        onClick={() => startEditingClass(student)}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-sans text-[11px] font-semibold cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Kelas</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">Kelas:</span>
                      <span className="font-semibold text-slate-800">
                        {student.kelas || <span className="text-slate-400 italic">Tiada</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] text-slate-400">Emel DELIMa:</span>
                      {isAdmin ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900">
                          <span className="truncate max-w-[150px]">{student.email || 'Tiada'}</span>
                          {student.email && (
                            <button
                              onClick={() => copyEmail(student.email, student.id)}
                              className="p-1 hover:text-blue-600 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={onRequestAdmin}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-indigo-600"
                        >
                          <span>{student.email ? maskEmail(student.email) : 'Tiada'}</span>
                          <ShieldAlert className="w-3 h-3 text-slate-400" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400">Status Login:</span>
                      <span
                        className={`font-semibold ${
                          student.status === 'Sudah Login' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {student.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {student.tarikhLogin ? `Login: ${student.tarikhLogin.slice(0, 10)}` : 'Belum Login'}
                  </span>
                  <button
                    onClick={() => onSelectStudent(student)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Lihat Profil</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {sortedStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Tunjuk:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="25">25 setiap halaman</option>
              <option value="50">50 setiap halaman</option>
              <option value="100">100 setiap halaman</option>
              <option value="0">Tunjuk Semua ({sortedStudents.length})</option>
            </select>
            <span>
              Menunjukkan{' '}
              <strong>
                {pageSize === 0
                  ? sortedStudents.length
                  : Math.min((currentPage - 1) * pageSize + 1, sortedStudents.length)}{' '}
                - {pageSize === 0 ? sortedStudents.length : Math.min(currentPage * pageSize, sortedStudents.length)}
              </strong>{' '}
              daripada <strong>{sortedStudents.length}</strong> murid
            </span>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Seterusnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
