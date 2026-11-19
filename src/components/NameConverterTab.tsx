import React, { useState, useMemo } from 'react';
import {
  CaseSensitive,
  ArrowRightLeft,
  Copy,
  Check,
  Trash2,
  Download,
  Sparkles,
  BookOpen,
  FileText,
} from 'lucide-react';
import { Student, NameCaseMode } from '../types';
import { formatStudentName } from '../utils/helpers';

interface Props {
  students: Student[];
  onShowToast: (msg: string) => void;
}

const EMAIL_CELL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;

export const NameConverterTab: React.FC<Props> = ({ students, onShowToast }) => {
  const [inputText, setInputText] = useState('');
  const [targetMode, setTargetMode] = useState<NameCaseMode>('titlecase');
  const [stripLeadingNumbers, setStripLeadingNumbers] = useState(false);
  const [skipEmptyLines, setSkipEmptyLines] = useState(true);
  const [selectedTingkatan, setSelectedTingkatan] = useState('SEMUA');
  const [selectedKelas, setSelectedKelas] = useState('SEMUA');
  const [copied, setCopied] = useState(false);

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

  const convertedOutput = useMemo(() => {
    if (!inputText) return '';

    const rawLines = inputText.split(/\r?\n/);
    const processedLines: string[] = [];

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        if (!skipEmptyLines) {
          processedLines.push('');
        }
        continue;
      }

      // Preserve tab-delimited columns (e.g. copied from Excel / Google Sheets)
      if (rawLine.includes('\t')) {
        const cols = rawLine.split('\t').map((col, idx) => {
          let cell = col.trim();
          if (!cell) return '';
          if (EMAIL_CELL_REGEX.test(cell)) return cell.toLowerCase();
          if (idx === 0 && stripLeadingNumbers) {
            cell = cell.replace(/^\s*(?:\[\d+\]|\(\d+\)|\d+[\.\)\-\:\s]+)\s*/, '').trim();
            if (!cell) return '';
          }
          if (/^\d+$/.test(cell)) return cell;
          return formatStudentName(cell, targetMode);
        });
        processedLines.push(cols.join('\t'));
      } else {
        let line = trimmed;
        if (stripLeadingNumbers) {
          line = line.replace(/^\s*(?:\[\d+\]|\(\d+\)|\d+[\.\)\-\:\s]+)\s*/, '').trim();
        }
        if (!line) continue;
        if (EMAIL_CELL_REGEX.test(line)) {
          processedLines.push(line.toLowerCase());
        } else {
          processedLines.push(formatStudentName(line, targetMode));
        }
      }
    }

    return processedLines.join('\n');
  }, [inputText, targetMode, stripLeadingNumbers, skipEmptyLines]);

  const inputCount = useMemo(() => {
    return inputText
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0).length;
  }, [inputText]);

  const outputCount = useMemo(() => {
    return convertedOutput
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0).length;
  }, [convertedOutput]);

  const handleCopyOutput = () => {
    if (!convertedOutput.trim()) {
      onShowToast('Tiada teks hasil untuk disalin.');
      return;
    }
    navigator.clipboard.writeText(convertedOutput);
    setCopied(true);
    onShowToast(`${outputCount} baris nama berjaya disalin!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!convertedOutput.trim()) {
      onShowToast('Tiada teks hasil untuk dimuat turun.');
      return;
    }
    const blob = new Blob(['\uFEFF' + convertedOutput], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      targetMode === 'titlecase' ? 'Senarai_Nama_Aa.txt' : 'Senarai_Nama_AA.txt'
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Fail teks berjaya dimuat turun.');
  };

  const handleLoadSample = () => {
    setInputText(
      [
        'MUHAMMAD ALI BIN ABU',
        'ADANEA RAYANI BINTI RASHIDI',
        '28. RANIA AFIQAH BINTI RADZALEIGH @ GHAZALI',
        'KUGAN A/L SIVAN',
        'SITI NUR AISYAH BT AHMAD AL-AMIN',
      ].join('\n')
    );
    onShowToast('Contoh nama dimuatkan.');
  };

  const handleLoadFromDirectory = () => {
    const matched = students.filter((s) => {
      if (selectedTingkatan !== 'SEMUA' && s.tingkatan !== selectedTingkatan) return false;
      if (selectedKelas !== 'SEMUA' && (s.kelas || '').trim() !== selectedKelas) return false;
      return true;
    });

    if (matched.length === 0) {
      onShowToast('Tiada murid ditemui untuk tapisan tersebut.');
      return;
    }

    const sorted = [...matched].sort((a, b) => a.nama.localeCompare(b.nama));
    setInputText(sorted.map((s) => s.nama).join('\n'));
    onShowToast(`${sorted.length} nama murid dimuatkan daripada direktori.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <CaseSensitive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Penukar Format Nama Murid (AA ↔ Aa)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                Automatik Luar Talian
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tampal senarai nama huruf besar (cth: <strong>MUHAMMAD ALI BIN ABU</strong>) untuk ditukar automatik kepada huruf besar awal perkataan (cth: <strong>Muhammad Ali bin Abu</strong>) mengikut format rasmi nama Malaysia.
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setTargetMode('titlecase')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              targetMode === 'titlecase'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>AA → Aa</span>
            <span className="font-normal opacity-90 hidden sm:inline">(Muhammad Ali bin Abu)</span>
          </button>
          <button
            type="button"
            onClick={() => setTargetMode('uppercase')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              targetMode === 'uppercase'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Aa → AA</span>
            <span className="font-normal opacity-90 hidden sm:inline">(MUHAMMAD ALI BIN ABU)</span>
          </button>
        </div>
      </div>

      {/* Quick Options & Directory Loader */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stripLeadingNumbers}
              onChange={(e) => setStripLeadingNumbers(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="font-medium">Buang nombor baris hadapan (cth: 1. / 28.)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipEmptyLines}
              onChange={(e) => setSkipEmptyLines(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="font-medium">Abaikan baris kosong</span>
          </label>
        </div>

        {/* Load directly from school directory */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Muat dari Direktori:</span>
          </span>
          <select
            value={selectedTingkatan}
            onChange={(e) => {
              setSelectedTingkatan(e.target.value);
              setSelectedKelas('SEMUA');
            }}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="SEMUA">Semua Tingkatan</option>
            <option value="T1">Tingkatan 1</option>
            <option value="T2">Tingkatan 2</option>
            <option value="T3">Tingkatan 3</option>
            <option value="T4">Tingkatan 4</option>
            <option value="T5">Tingkatan 5</option>
            <option value="Alumni">Alumni</option>
          </select>

          {uniqueClasses.length > 0 && (
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="SEMUA">Semua Kelas</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleLoadFromDirectory}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Muat Nama
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Contoh</span>
          </button>
        </div>
      </div>

      {/* Dual Pane Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input Pane */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Teks Asal (Input)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-semibold">
                {inputCount} baris
              </span>
            </div>

            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          <textarea
            rows={14}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tampal senarai nama di sini (satu nama setiap baris, atau salin terus daripada Excel / Google Sheets)...&#10;&#10;Contoh:&#10;MUHAMMAD ALI BIN ABU&#10;ADANEA RAYANI BINTI RASHIDI&#10;28. RANIA AFIQAH BINTI RADZALEIGH @ GHAZALI"
            className="w-full p-4 text-xs sm:text-sm font-mono text-slate-800 bg-white focus:outline-none resize-y min-h-[280px] leading-relaxed"
          />
        </div>

        {/* Output Pane */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hasil Penukaran ({targetMode === 'titlecase' ? 'Aa' : 'AA'})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-semibold">
                {outputCount} baris
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!convertedOutput.trim()}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Muat turun hasil sebagai fail .txt"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.TXT</span>
              </button>

              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!convertedOutput.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Semua</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <textarea
            rows={14}
            readOnly
            value={convertedOutput}
            placeholder="Hasil penukaran automatik akan dipaparkan di sini secara serta-merta dan sedia untuk disalin semula ke Excel atau Google Sheets..."
            className="w-full p-4 text-xs sm:text-sm font-mono text-slate-900 bg-slate-50/40 focus:outline-none resize-y min-h-[280px] leading-relaxed select-all"
          />
        </div>
      </div>

      {/* Rules Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-bold text-slate-700">Peraturan Automatik Malaysia:</span>
        <span>
          Kata hubung (<code className="font-mono text-blue-700">bin, binti, bt, bte, a/l, a/p, anak</code>) dikekalkan huruf kecil dalam mod <strong>Aa</strong>.
        </span>
        <span>
          Tanda alias <code className="font-mono text-blue-700">@</code>, sengkang <code className="font-mono text-blue-700">-</code>, dan emel DELIMa dipelihara dengan tepat.
        </span>
      </div>
    </div>
  );
};
