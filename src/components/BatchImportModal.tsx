import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  UserPlus,
  Check,
  AlertCircle,
  FileText,
  Trash2,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Student,
  OfflineDetectionResult,
  APPROVED_CLASS_NAMES,
  ApprovedClassName,
  ValidationStatus
} from '../types';
import {
  detectStudentsFromRawText,
  detectStudentsFromExcelFile,
  convertDetectionToStudent,
  classifyStudentRecordOffline
} from '../utils/smartExtractor';
import { getCurrentSchoolYear } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (newStudents: Student[], mode: 'append' | 'replace') => void;
  onShowToast: (msg: string) => void;
  existingStudents?: Student[];
}

export const BatchImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportStudents,
  onShowToast,
  existingStudents,
}) => {
  const currentYear = getCurrentSchoolYear();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'manual'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [detectedRecords, setDetectedRecords] = useState<OfflineDetectionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [filterView, setFilterView] = useState<'all' | 'needs_review' | 'valid'>('all');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  // Manual single student state
  const [manualNama, setManualNama] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualKelas, setManualKelas] = useState<ApprovedClassName | ''>('BUDI');
  const [manualTingkatan, setManualTingkatan] = useState('1');

  // Statistics calculation
  const stats = useMemo(() => {
    const total = detectedRecords.length;
    const valid = detectedRecords.filter((r) => r.validationStatus === 'VALID').length;
    const review = detectedRecords.filter((r) => r.validationStatus === 'NEEDS_REVIEW').length;
    const invalid = detectedRecords.filter((r) => r.validationStatus === 'INVALID').length;
    return { total, valid, review, invalid };
  }, [detectedRecords]);

  // Filtered list for display
  const displayedRecords = useMemo(() => {
    if (filterView === 'needs_review') {
      return detectedRecords.filter((r) => r.validationStatus === 'NEEDS_REVIEW');
    }
    if (filterView === 'valid') {
      return detectedRecords.filter((r) => r.validationStatus === 'VALID');
    }
    return detectedRecords;
  }, [detectedRecords, filterView]);

  if (!isOpen) return null;

  // Handle file upload (.xlsx, .xls, .csv, .tsv, .txt)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let results: OfflineDetectionResult[] = [];
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
        results = await detectStudentsFromExcelFile(file, currentYear, existingStudents);
      } else {
        const text = await file.text();
        results = detectStudentsFromRawText(text, currentYear, existingStudents);
      }

      if (results.length > 0) {
        setDetectedRecords(results);
        onShowToast(
          `Pengesanan luar talian selesai: ${results.length} rekod dianalisis secara deterministik.`
        );
      } else {
        onShowToast('Tiada rekod murid yang dapat dikesan daripada fail ini.');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Ralat membaca fail. Pastikan fail adalah format Excel atau CSV yang sah.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Handle Paste text analysis
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      onShowToast('Sila tampal teks data terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    try {
      const results = detectStudentsFromRawText(pastedText, currentYear, existingStudents);
      if (results.length > 0) {
        setDetectedRecords(results);
        onShowToast(
          `Enjin luar talian mengesan ${results.length} rekod melalui analisis peraturan deterministik.`
        );
      } else {
        onShowToast('Tidak dapat mengesan sebarang rekod. Sila semak teks.');
      }
    } catch {
      onShowToast('Gagal memproses teks.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add manual single student to preview
  const handleAddManualToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNama.trim() && !manualEmail.trim()) {
      onShowToast('Sila masukkan sekurang-kurangnya nama atau emel murid.');
      return;
    }

    const classPart = manualKelas ? `${manualTingkatan} ${manualKelas}` : '';
    const rawTokens = [manualNama.trim(), manualEmail.trim(), classPart].filter(Boolean);
    const lineString = rawTokens.join('\t');

    const result = classifyStudentRecordOffline(rawTokens, lineString, currentYear, existingStudents);

    // If manual selected specific class and form, enforce them
    if (manualKelas) {
      result.className = {
        value: manualKelas,
        confidence: 'HIGH',
        ruleMatched: 'Manual Selection from Approved Class Dictionary',
      };
      result.formNumber = {
        value: parseInt(manualTingkatan, 10),
        confidence: 'HIGH',
        ruleMatched: 'Manual Selection Form Number',
      };
      result.formCode = {
        value: `T${manualTingkatan}`,
        confidence: 'HIGH',
        ruleMatched: `Manual Selection T${manualTingkatan}`,
      };
      result.fullClassDisplay = `${manualTingkatan} ${manualKelas} (${currentYear})`;
      if (result.name.value) {
        result.validationStatus = 'VALID';
        result.validationReasons = [];
      }
    }

    setDetectedRecords((prev) => [result, ...prev]);
    onShowToast(`Murid ${result.name.value || 'Baharu'} ditambah ke jadual semakan!`);
    setManualNama('');
    setManualEmail('');
  };

  const handleRemoveFromPreview = (id: string) => {
    setDetectedRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Real-time manual correction of fields
  const handleUpdateRecordField = (
    id: string,
    field: 'name' | 'email' | 'className' | 'formNumber',
    val: any
  ) => {
    setDetectedRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;

        const updated = { ...rec };

        if (field === 'name') {
          updated.name = {
            ...updated.name,
            value: String(val).toUpperCase(),
            confidence: 'HIGH',
            ruleMatched: 'Manual Input / Semakan Pengguna',
          };
        } else if (field === 'email') {
          updated.email = {
            ...updated.email,
            value: String(val).trim().toLowerCase(),
            confidence: 'HIGH',
            ruleMatched: 'Manual Input / Semakan Pengguna',
          };
        } else if (field === 'className') {
          const classVal = val as ApprovedClassName | '';
          updated.className = {
            ...updated.className,
            value: classVal,
            confidence: 'HIGH',
            ruleMatched: 'Manual Selection from Approved Dictionary',
          };
        } else if (field === 'formNumber') {
          const formNum = val ? parseInt(String(val), 10) : null;
          updated.formNumber = {
            ...updated.formNumber,
            value: formNum,
            confidence: 'HIGH',
            ruleMatched: 'Manual Form Selection',
          };
          updated.formCode = {
            ...updated.formCode,
            value: formNum ? `T${formNum}` : '',
            confidence: 'HIGH',
            ruleMatched: 'Manual Form Selection',
          };
        }

        // Recalculate fullClassDisplay
        if (updated.className.value) {
          const fPrefix = updated.formNumber.value ? `${updated.formNumber.value} ` : '';
          const ySuffix = updated.academicYear.value ? ` (${updated.academicYear.value})` : ` (${currentYear})`;
          updated.fullClassDisplay = `${fPrefix}${updated.className.value}${ySuffix}`;
        } else {
          updated.fullClassDisplay = '';
        }

        // Re-evaluate validation status
        const reasons: string[] = [];
        let status: ValidationStatus = 'VALID';

        if (!updated.name.value || updated.name.value.trim().length < 2) {
          status = 'INVALID';
          reasons.push('Nama murid tidak dijumpai atau terlalu pendek.');
        }

        if (updated.email.value && !/^m-\d+@moe-dl\.edu\.my$/i.test(updated.email.value)) {
          if (status === 'VALID') status = 'NEEDS_REVIEW';
          reasons.push('Emel bukan format DELIMa yang sah (m-<nombor>@moe-dl.edu.my).');
        }

        if (updated.unclassifiedTokens.length > 0 && status === 'VALID') {
          status = 'NEEDS_REVIEW';
          reasons.push(`Token tidak dikelaskan: [${updated.unclassifiedTokens.join(', ')}]`);
        }

        updated.validationStatus = status;
        updated.validationReasons = reasons;

        return updated;
      })
    );
  };

  // Mark a Needs Review record as manually verified / approved
  const handleApproveRecord = (id: string) => {
    setDetectedRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        return {
          ...rec,
          validationStatus: 'VALID',
          validationReasons: ['Diluluskan secara manual oleh Pentadbir'],
        };
      })
    );
    onShowToast('Rekod disahkan sebagai Sah.');
  };

  // Confirm import
  const handleConfirmImport = (onlyValid = false) => {
    const toImport = detectedRecords.filter((r) => {
      if (onlyValid) return r.validationStatus === 'VALID';
      return r.validationStatus === 'VALID' || r.validationStatus === 'NEEDS_REVIEW';
    });

    if (toImport.length === 0) {
      onShowToast('Tiada rekod yang memenuhi syarat pengesahan untuk diimport.');
      return;
    }

    const convertedStudents: Student[] = toImport.map((item) =>
      convertDetectionToStudent(item, currentYear)
    );

    onImportStudents(convertedStudents, importMode);
    onShowToast(`Berjaya mendaftarkan ${convertedStudents.length} rekod murid ke dalam sistem!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[95vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Enjin Pengesanan Data Murid Luar Talian
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  100% Deterministik / Luar Talian
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelasan medan automatik (Nama, Kelas, Tingkatan, Emel DELIMa) berasaskan peraturan ketat tanpa internet atau AI.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Rules & Dictionary Indicator Ribbon */}
        <div className="bg-indigo-50/60 border-b border-indigo-100 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-900 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              Kamus Kelas Diluluskan:
            </span>
            <div className="flex items-center gap-1">
              {APPROVED_CLASS_NAMES.map((cls) => (
                <span
                  key={cls}
                  className="px-1.5 py-0.5 rounded bg-white border border-indigo-200 font-mono font-bold text-indigo-700 text-[10px]"
                >
                  {cls}
                </span>
              ))}
            </div>
            <span className="text-indigo-400">|</span>
            <span className="text-slate-600">
              Tingkatan: <strong>1 - 5</strong> (Format: T1 - T5)
            </span>
            <span className="text-indigo-400">|</span>
            <span className="text-slate-600">
              Corak Emel: <strong>m-&lt;digit&gt;@moe-dl.edu.my</strong>
            </span>
          </div>

          <span className="text-slate-500 italic text-[10px]">
            Tahun Rujukan: {currentYear}
          </span>
        </div>

        {/* Input Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 px-4 sm:px-6 pt-2 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Muat Naik Fail Excel / CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Tampal Teks Baris (Sheets / Excel)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftar Manual</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-md text-indigo-600 flex items-center justify-center mb-2">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm text-slate-800">
                  {isProcessing ? 'Enjin Sedang Menganalisis Fail...' : 'Pilih Fail Excel (.xlsx, .xls) atau CSV'}
                </span>
                <span className="text-xs text-slate-500 mt-1 max-w-lg">
                  Setiap baris akan diproses secara automatik oleh enjin deterministik. Nama, kelas (BUDI/JAYA/MAJU/USAHA), dan emel DELIMa diasingkan dengan ketat.
                </span>
              </label>
            </div>
          )}

          {/* TAB 2: Paste Raw Data */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Tampal teks baris (Tab-separated dari Google Sheets / Excel, atau koma):
                </span>
                <span className="text-indigo-600 font-medium text-[11px]">
                  Menyokong format seperti &quot;1 BUDI (current year)&quot; atau &quot;3 MAJU (curent year)&quot;
                </span>
              </div>
              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Contoh baris yang boleh ditampal:&#10;m-11061863@moe-dl.edu.my	MOHAMAD AMIRUL BIN HISHAM	1 BUDI ( current year)&#10;3 MAJU (curent year)	NUR AINA BINTI HISHAM	m-9876543@moe-dl.edu.my&#10;KUGAN A/L SIVAN	4 JAYA (curent year)&#10;TAN WEI JIE	2 USAHA (2025)	m-5551234@moe-dl.edu.my"
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim() || isProcessing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Jalankan Enjin Pengesanan Luar Talian</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Manual Input */}
          {activeTab === 'manual' && (
            <form onSubmit={handleAddManualToPreview} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penuh Murid (Sokongan nama pelbagai perkataan Malaysia)
                  </label>
                  <input
                    type="text"
                    value={manualNama}
                    onChange={(e) => setManualNama(e.target.value)}
                    placeholder="Cth: AHMAD DANIAL BIN RUSLAN / KUGAN A/L SIVAN"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas Rasmi (Kamus Sekolah)
                  </label>
                  <select
                    value={manualKelas}
                    onChange={(e) => setManualKelas(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 font-semibold text-indigo-700"
                  >
                    <option value="">-- Tiada Kelas --</option>
                    {APPROVED_CLASS_NAMES.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkatan
                  </label>
                  <select
                    value={manualTingkatan}
                    onChange={(e) => setManualTingkatan(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
                  >
                    <option value="1">Tingkatan 1</option>
                    <option value="2">Tingkatan 2</option>
                    <option value="3">Tingkatan 3</option>
                    <option value="4">Tingkatan 4</option>
                    <option value="5">Tingkatan 5</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emel DELIMa Rasmi (Pilihan)
                  </label>
                  <input
                    type="text"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="m-XXXXXXX@moe-dl.edu.my"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sahkan & Masukkan ke Senarai Pralihat</span>
                </button>
              </div>
            </form>
          )}

          {/* Extracted Preview Section & Summary Badges */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Pralihat & Pengesahan Data ({stats.total} Rekod)</span>
                </span>

                {stats.total > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() => setFilterView('all')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        filterView === 'all'
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Semua ({stats.total})
                    </button>
                    <button
                      onClick={() => setFilterView('valid')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        filterView === 'valid'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Sah ({stats.valid})
                    </button>
                    {stats.review > 0 && (
                      <button
                        onClick={() => setFilterView('needs_review')}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          filterView === 'needs_review'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Perlu Semakan ({stats.review})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {stats.total > 0 && (
                <button
                  onClick={() => setDetectedRecords([])}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Pralihat</span>
                </button>
              )}
            </div>

            {/* Empty State */}
            {stats.total === 0 ? (
              <div className="border border-slate-200 rounded-xl p-8 text-center text-slate-400 bg-slate-50/50">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-indigo-400" />
                <p className="text-xs font-semibold text-slate-600">Belum ada rekod untuk disemak</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                  Sila muat naik fail Excel/CSV atau tampal baris murid dari helaian kerja di atas untuk menjalankan enjin pengesanan data luar talian.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Nama Penuh Murid</th>
                        <th className="py-2.5 px-3 w-28">Tingkatan</th>
                        <th className="py-2.5 px-3 w-32">Kelas (Kamus)</th>
                        <th className="py-2.5 px-3">Emel DELIMa</th>
                        <th className="py-2.5 px-3 w-36 text-center">Status Enjin</th>
                        <th className="py-2.5 px-3 w-14 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {displayedRecords.map((item, idx) => {
                        const isExpanded = expandedTraceId === item.id;
                        const isReview = item.validationStatus === 'NEEDS_REVIEW';
                        const isInvalid = item.validationStatus === 'INVALID';

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              className={`transition-colors ${
                                isReview
                                  ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                  : isInvalid
                                  ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                                {idx + 1}
                              </td>

                              {/* Student Name */}
                              <td className="py-2 px-3">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={item.name.value}
                                    placeholder="NAMA MURID DIPERLUKAN"
                                    onChange={(e) =>
                                      handleUpdateRecordField(item.id, 'name', e.target.value)
                                    }
                                    className={`w-full px-2 py-1 rounded text-xs font-semibold uppercase border ${
                                      !item.name.value
                                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                                        : 'border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent focus:bg-white'
                                    }`}
                                  />
                                  <div className="flex items-center gap-1.5 flex-wrap px-1">
                                    {(item.email.ruleMatched?.includes('Padanan Direktori') ||
                                      item.className.ruleMatched?.includes('Padanan Direktori') ||
                                      item.name.ruleMatched?.includes('Padanan Direktori') ||
                                      item.formNumber.ruleMatched?.includes('Padanan Direktori')) && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-200 text-[10px] font-bold">
                                        <Sparkles className="w-2.5 h-2.5 text-cyan-700" />
                                        Padanan Direktori DELIMa
                                      </span>
                                    )}
                                    {item.name.ruleMatched && (
                                      <span className="text-[10px] text-slate-400">
                                        Peraturan: {item.name.ruleMatched}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Form Number */}
                              <td className="py-2 px-3">
                                <select
                                  value={item.formNumber.value || ''}
                                  onChange={(e) =>
                                    handleUpdateRecordField(
                                      item.id,
                                      'formNumber',
                                      e.target.value ? parseInt(e.target.value, 10) : null
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800"
                                >
                                  <option value="">Tiada</option>
                                  <option value="1">T1 (Ting. 1)</option>
                                  <option value="2">T2 (Ting. 2)</option>
                                  <option value="3">T3 (Ting. 3)</option>
                                  <option value="4">T4 (Ting. 4)</option>
                                  <option value="5">T5 (Ting. 5)</option>
                                </select>
                              </td>

                              {/* Approved Class */}
                              <td className="py-2 px-3">
                                <select
                                  value={item.className.value || ''}
                                  onChange={(e) =>
                                    handleUpdateRecordField(item.id, 'className', e.target.value)
                                  }
                                  className={`w-full px-2 py-1 rounded text-xs font-bold border ${
                                    item.className.value
                                      ? 'border-indigo-200 bg-indigo-50/50 text-indigo-800'
                                      : 'border-slate-200 bg-white text-slate-500'
                                  }`}
                                >
                                  <option value="">-- Tiada Kelas --</option>
                                  {APPROVED_CLASS_NAMES.map((cls) => (
                                    <option key={cls} value={cls}>
                                      {cls}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* DELIMa Email */}
                              <td className="py-2 px-3 font-mono text-[11px]">
                                <input
                                  type="text"
                                  value={item.email.value}
                                  placeholder="Tiada emel (Dibenarkan)"
                                  onChange={(e) =>
                                    handleUpdateRecordField(item.id, 'email', e.target.value)
                                  }
                                  className={`w-full px-2 py-1 rounded text-xs border ${
                                    item.email.value &&
                                    !/^m-\d+@moe-dl\.edu\.my$/i.test(item.email.value)
                                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                                      : 'border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent focus:bg-white'
                                  }`}
                                />
                              </td>

                              {/* Engine Status & Verification Badge */}
                              <td className="py-2 px-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {item.validationStatus === 'VALID' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Sah (Valid)
                                    </span>
                                  )}

                                  {item.validationStatus === 'NEEDS_REVIEW' && (
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        Perlu Semakan
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleApproveRecord(item.id)}
                                        title="Luluskan rekod ini secara manual"
                                        className="p-1 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs cursor-pointer"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}

                                  {item.validationStatus === 'INVALID' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                                      <AlertCircle className="w-3 h-3 text-rose-600" />
                                      Nama Hilang
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedTraceId(isExpanded ? null : item.id)
                                    }
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>Jejak</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-2.5 h-2.5" />
                                    ) : (
                                      <ChevronDown className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Row delete action */}
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromPreview(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Padam rekod ini"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>

                            {/* Traceability Details Accordion */}
                            {isExpanded && (
                              <tr className="bg-slate-50/80 border-b border-slate-200">
                                <td colSpan={7} className="p-3 text-[11px] space-y-2">
                                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-slate-600 space-y-1">
                                    <div className="text-slate-400 text-[10px] uppercase font-bold">
                                      Teks Sumber Asal (Raw Trace):
                                    </div>
                                    <div className="text-slate-800 break-all">
                                      {item.originalRow || item.rawTokens.join(' | ')}
                                    </div>
                                  </div>

                                  {item.validationReasons.length > 0 && (
                                    <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 space-y-1">
                                      <div className="font-bold text-[10px] uppercase text-amber-700">
                                        Catatan Pengesahan / Rujukan:
                                      </div>
                                      <ul className="list-disc pl-4 space-y-0.5">
                                        {item.validationReasons.map((r, rIdx) => (
                                          <li key={rIdx}>{r}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {item.unclassifiedTokens.length > 0 && (
                                    <div className="bg-slate-100 p-2 rounded text-slate-600">
                                      <span className="font-semibold text-slate-700">
                                        Token Tidak Dikelaskan:
                                      </span>{' '}
                                      {item.unclassifiedTokens.map((t, tIdx) => (
                                        <span
                                          key={tIdx}
                                          className="inline-block px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono mr-1 text-[10px]"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Mode Selection and Import Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-slate-700">Mod Kemasukan:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tambah ke senarai sedia ada</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-rose-600 focus:ring-rose-500"
              />
              <span className="text-rose-700 font-medium">Gantikan semua rekod</span>
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>

            {stats.review > 0 && stats.valid > 0 && (
              <button
                type="button"
                onClick={() => handleConfirmImport(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Import Rekod Sah Sahaja ({stats.valid})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleConfirmImport(false)}
              disabled={stats.total === 0 || stats.valid + stats.review === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                Sahkan & Masukkan ({stats.valid + stats.review} Murid)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
