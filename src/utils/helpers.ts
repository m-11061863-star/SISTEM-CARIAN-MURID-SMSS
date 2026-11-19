import { Student, NameCaseMode } from '../types';

/**
 * Get current calendar school year (e.g. 2026)
 */
export function getCurrentSchoolYear(): number {
  return new Date().getFullYear();
}

/**
 * Compute the student's current Tingkatan based on their base form in baseYear (2025)
 * Example: 2025 T1 -> 2026 becomes T2, 2027 becomes T3
 * If graduated beyond Form 5, marked as Alumni
 */
export function calculateEffectiveTingkatan(
  baseTingkatan: string,
  baseYear: number = 2025,
  currentYear: number = getCurrentSchoolYear()
): { code: string; label: string } {
  const cleanBase = (baseTingkatan || '').toUpperCase().trim();

  // Match T1, T2, T3, T4, T5 or numbers 1 to 5
  const match = cleanBase.match(/(?:T|TINGKATAN\s*)?([1-5])/i);
  if (!match) {
    return {
      code: 'Alumni',
      label: 'Alumni / Lain-lain',
    };
  }

  const baseNum = parseInt(match[1], 10);
  const yearDiff = currentYear - baseYear;
  const currentNum = baseNum + yearDiff;

  if (currentNum >= 1 && currentNum <= 5) {
    return {
      code: `T${currentNum}`,
      label: `Tingkatan ${currentNum}`,
    };
  } else if (currentNum > 5) {
    const graduateYear = baseYear + (5 - baseNum);
    return {
      code: 'Alumni',
      label: `Alumni (Tamat SPM ${graduateYear})`,
    };
  } else {
    return {
      code: `T${Math.max(1, currentNum)}`,
      label: `Tingkatan ${Math.max(1, currentNum)}`,
    };
  }
}

/**
 * Auto-advance Class (Kelas) according to current year!
 * Example: "1 BUDI 2025" in 2026 becomes "2 BUDI 2026", in 2027 becomes "3 BUDI 2027"
 * Graduated beyond Form 5 becomes "Alumni"
 */
export function calculateEffectiveClass(
  baseClass: string,
  baseYear: number = 2025,
  currentYear: number = getCurrentSchoolYear()
): string {
  if (!baseClass || baseClass === 'Tanpa Kelas' || baseClass === 'Alumni') return '';
  const trimmed = baseClass.trim();
  const yearDiff = currentYear - baseYear;

  // Match e.g. "1 BUDI 2025" or "1 BUDI" or "2 JAYA 2025"
  const match = trimmed.match(/^([1-5])\s+([A-Za-z\s]+?)(?:\s+\d{4})?$/i);
  if (match) {
    const formNum = parseInt(match[1], 10);
    const className = match[2].trim().toUpperCase();
    const newFormNum = formNum + yearDiff;

    if (newFormNum >= 1 && newFormNum <= 5) {
      return `${newFormNum} ${className} ${currentYear}`;
    } else if (newFormNum > 5) {
      const gradYear = baseYear + (5 - formNum);
      return `Alumni (Tamat ${gradYear})`;
    } else {
      return `${Math.max(1, newFormNum)} ${className} ${currentYear}`;
    }
  }

  // Generic match if starts with digit 1-5 e.g. "1-A 2025" or "3 Sc"
  const genericMatch = trimmed.match(/^([1-5])(.*)$/);
  if (genericMatch) {
    const formNum = parseInt(genericMatch[1], 10);
    const rest = genericMatch[2].replace(/\b\d{4}\b/, '').trim();
    const newFormNum = formNum + yearDiff;

    if (newFormNum >= 1 && newFormNum <= 5) {
      return `${newFormNum} ${rest} ${currentYear}`.replace(/\s+/g, ' ').trim();
    } else if (newFormNum > 5) {
      return 'Alumni';
    }
  }

  return baseClass;
}

/**
 * Process a student record to guarantee up-to-date Tingkatan AND Kelas for the current school year
 */
export function processStudentProgression(
  raw: any,
  currentYear: number = getCurrentSchoolYear()
): Student {
  const baseTingkatan = raw.baseTingkatan || raw.tingkatan || '';
  const baseKelas = raw.baseKelas !== undefined ? raw.baseKelas : (raw.kelas || '');
  const baseYear = raw.baseYear || 2025;

  const effectiveTingkatan = calculateEffectiveTingkatan(baseTingkatan, baseYear, currentYear);
  const effectiveKelas = calculateEffectiveClass(baseKelas, baseYear, currentYear);

  return {
    id: raw.id || (raw.email ? raw.email.split('@')[0] : `std-${Math.random()}`),
    email: raw.email || '',
    nama: (raw.nama || '').trim().toUpperCase(),
    baseKelas: baseKelas,
    kelas: effectiveKelas,
    baseTingkatan: baseTingkatan,
    baseYear: baseYear,
    tingkatan: effectiveTingkatan.code,
    tingkatanLabel: effectiveTingkatan.label,
    tarikhJana: raw.tarikhJana || '-',
    tarikhLogin: raw.tarikhLogin || '-',
    status: raw.status || 'Sudah Login',
  };
}

/**
 * Mask student email when user is not authenticated as admin
 */
export function maskEmail(email: string): string {
  if (!email) return 'Tiada Emel';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '••••••••••••';
  const prefix = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  if (prefix.length > 3) {
    return `${prefix.slice(0, 2)}${'•'.repeat(prefix.length - 2)}${domain}`;
  }
  return `••••••••${domain}`;
}

/**
 * Color badge based on Tingkatan
 */
export function getTingkatanBadgeColor(tingkatan: string): { bg: string; text: string; border: string } {
  switch (tingkatan) {
    case 'T1':
      return { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'T2':
      return { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200' };
    case 'T3':
      return { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-200' };
    case 'T4':
      return { bg: 'bg-purple-50 text-purple-700', text: 'text-purple-700', border: 'border-purple-200' };
    case 'T5':
      return { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-200' };
    default:
      return { bg: 'bg-slate-100 text-slate-700', text: 'text-slate-700', border: 'border-slate-300' };
  }
}

/**
 * Clean readable label for Tingkatan
 */
export function getTingkatanLabel(tingkatan: string): string {
  switch (tingkatan) {
    case 'T1':
      return 'Tingkatan 1';
    case 'T2':
      return 'Tingkatan 2';
    case 'T3':
      return 'Tingkatan 3';
    case 'T4':
      return 'Tingkatan 4';
    case 'T5':
      return 'Tingkatan 5';
    default:
      return 'Alumni / Bekas Pelajar';
  }
}

const LOWERCASE_NAME_CONNECTORS = new Set([
  'bin',
  'binti',
  'bt',
  'bte',
  'b.',
  'bt.',
  'a/l',
  'a/p',
  'anak',
  'ak',
  'd/o',
  's/o',
]);

function capitalizeSegment(segment: string): string {
  if (!segment) return segment;
  // Preserve leading non-letter chars such as '(' or quotes
  return segment.replace(/^([^A-Za-zÀ-ÖØ-öø-ÿ]*)([A-Za-zÀ-ÖØ-öø-ÿ])(.*)$/, (_, prefix, first, rest) => {
    return `${prefix}${first.toUpperCase()}${rest.toLowerCase()}`;
  });
}

/**
 * Automatically format student name from stored data:
 * - 'uppercase': MUHAMMAD ALI BIN ABU
 * - 'titlecase': Muhammad Ali bin Abu (Malaysian connectors stay lowercase)
 */
export function formatStudentName(name: string, mode: NameCaseMode = 'uppercase'): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  if (mode === 'uppercase') {
    return trimmed.toUpperCase();
  }

  return trimmed
    .split(/\s+/)
    .map((word, index) => {
      if (word === '@') return '@';
      const lower = word.toLowerCase();

      if (index > 0 && LOWERCASE_NAME_CONNECTORS.has(lower)) {
        return lower;
      }

      // Handle hyphenated or apostrophe-joined parts (e.g. AL-AMIN -> Al-Amin, D'SOUZA -> D'Souza)
      return lower
        .split(/([-'])/)
        .map((part) => (part === '-' || part === "'" ? part : capitalizeSegment(part)))
        .join('');
    })
    .join(' ');
}

/**
 * Generate CSV text and trigger download
 */
export function exportStudentsToCsv(
  students: Student[],
  includeEmail: boolean,
  filename = 'Senarai_Murid_DELIMa.csv',
  nameFormat: NameCaseMode = 'uppercase'
): void {
  const currentYear = getCurrentSchoolYear();
  const headers = [
    'ID Murid',
    'Nama Murid',
    `Tingkatan Semasa (${currentYear})`,
    `Kelas Semasa (${currentYear})`,
    includeEmail ? 'Emel DELIMa' : 'Status Emel',
    'Status Login',
    'Tarikh Jana',
    'Tarikh Login',
  ];
  const rows = students.map((s) => [
    `"${s.id}"`,
    `"${formatStudentName(s.nama, nameFormat).replace(/"/g, '""')}"`,
    `"${s.tingkatanLabel}"`,
    `"${(s.kelas || '').replace(/"/g, '""')}"`,
    `"${includeEmail ? s.email : 'DILINDUNGI (Akses Admin Sahaja)'}"`,
    `"${s.status}"`,
    `"${s.tarikhJana}"`,
    `"${s.tarikhLogin}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse uploaded CSV file content into Student objects
 */
export function parseCsvFileContent(content: string, currentYear: number = getCurrentSchoolYear()): Student[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const results: Student[] = [];
  const headerLine = lines[0].toLowerCase();
  const hasComma = headerLine.includes(',');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === (hasComma ? ',' : '\t') && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current);

    const email = (cols[0] || '').trim().replace(/^"/, '').replace(/"$/, '');
    const nama = (cols[1] || '').trim().replace(/^"/, '').replace(/"$/, '');
    const rawTingkatan = (cols[2] || '').trim().replace(/^"/, '').replace(/"$/, '');
    const rawKelas = (cols[3] || '').trim().replace(/^"/, '').replace(/"$/, '');
    const tarikhJana = (cols[4] || '').trim().replace(/^"/, '').replace(/"$/, '');
    const tarikhLogin = (cols[5] || '').trim().replace(/^"/, '').replace(/"$/, '');
    const status = (cols[6] || '').trim().replace(/^"/, '').replace(/"$/, '') || 'Sudah Login';

    if (nama || email) {
      const student = processStudentProgression(
        {
          id: email.split('@')[0] || `std-${Date.now()}-${i}`,
          email,
          nama,
          baseTingkatan: rawTingkatan,
          baseKelas: rawKelas,
          baseYear: 2025,
          tarikhJana: tarikhJana || '-',
          tarikhLogin: tarikhLogin || '-',
          status,
        },
        currentYear
      );
      results.push(student);
    }
  }

  return results;
}
