import {
  APPROVED_CLASS_NAMES,
  ApprovedClassName,
  OfflineDetectionResult,
  ClassifiedField,
  ValidationStatus,
  Student,
} from '../types';
import { getCurrentSchoolYear, processStudentProgression } from './helpers';
import { initialStudents } from '../data/initialStudents';

// ==========================================
// 1. DICTIONARIES & REGULAR EXPRESSIONS
// Fully offline, zero external dependencies
// ==========================================

export const APPROVED_CLASSES: readonly ApprovedClassName[] = APPROVED_CLASS_NAMES;

/**
 * DELIMa Email format: m-<digits>@moe-dl.edu.my
 */
export const DELIMA_EMAIL_REGEX = /^m-\d+@moe-dl\.edu\.my$/i;

/**
 * Standard RFC-5322 compliant email regex
 */
export const STANDARD_EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;

/**
 * Any email occurring within text
 */
export const EMBEDDED_EMAIL_REGEX =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i;

/**
 * Form / Tingkatan regex (T1-T5, Tingkatan 1-5, Form 1-5, or standalone digit 1-5)
 */
export const FORM_STANDALONE_REGEX = /^(?:T|TINGKATAN\s*|FORM\s*)?([1-5])$/i;

/**
 * Date regex (YYYY-MM-DD or DD/MM/YYYY)
 */
export const DATE_REGEX = /^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/;

/**
 * Status keywords recognized in DELIMa portal
 */
export const STATUS_KEYWORDS = [
  'SUDAH LOGIN',
  'BELUM LOGIN',
  'LOGIN',
  'AKTIF',
  'TIDAK AKTIF',
  'ACTIVE',
  'INACTIVE',
];

export const PORTAL_NOISE_KEYWORDS = [
  'NILAM',
  'HANTAR',
  'SUBMIT',
  'SIMPAN',
  'SAVE',
  'BATAL',
  'CANCEL',
  'RESET',
  'KEMASKINI',
  'UPDATE',
  'PADAM',
  'DELETE',
  'SEMAK',
  'SEMAKAN',
  'CHECK',
  'VERIFY',
  'CETAK',
  'PRINT',
  'LOG MASUK',
  'LOGIN',
  'LOG KELUAR',
  'LOGOUT',
  'TAMBAH',
  'ADD',
  'PILIH',
  'SELECT',
  'MUAT NAIK',
  'UPLOAD',
  'MUAT TURUN',
  'DOWNLOAD',
  'KEMBALI',
  'BACK',
  'SETERUSNYA',
  'NEXT',
  'SEBELUMNYA',
  'PREV',
  'TINDAKAN',
  'ACTION',
  'ACTIONS',
  'EDIT',
  'TUTUP',
  'CLOSE',
  'BIL',
  'BIL.',
  'NO',
  'NO.',
  'NOMBOR',
  'NUMBER',
  'INDEX',
  'ID',
  'ID MURID',
  'KOD',
  'KOD SEKOLAH',
  'NAMA',
  'NAMA MURID',
  'NAMA PELAJAR',
  'STUDENT NAME',
  'NAME',
  'FULL NAME',
  'TINGKATAN',
  'FORM',
  'KELAS',
  'CLASS',
  'TAHUN',
  'YEAR',
  'SESI',
  'SESSION',
  'EMEL',
  'EMAIL',
  'E-MEL',
  'STATUS',
  'TARIKH',
  'DATE',
  'MASA',
  'TIME',
  'TARIKH JANA',
  'TARIKH LOGIN',
  'PERKARA',
  'TAJUK',
  'CATATAN',
  'SENARAI',
  'ROW',
  'JUMLAH',
  'TOTAL',
  'ENROLMEN',
  'ENROLMENT',
  'SEKOLAH',
  'SCHOOL',
  'GURU',
  'TEACHER',
  'PENGGUNA',
  'USER',
  'PERANAN',
  'ROLE',
  'JANTINA',
  'GENDER',
  'BANGSA',
  'RACE',
  'AGAMA',
  'RELIGION',
  'KAUM',
  'BORANG',
  'FORMULIR',
  'DELIMA',
  'APDM',
  'KPM',
  'MOE',
  'SPS',
  'SSDM',
];

export const HEADER_KEYWORDS = PORTAL_NOISE_KEYWORDS;

/**
 * Malaysian name connector words and legitimate naming patterns
 * Includes '@' as official alias/nama samaran marker
 */
export const MALAYSIAN_NAME_MARKERS = [
  'BIN',
  'BINTI',
  'BT',
  'BTE',
  'B.',
  'BT.',
  'A/L',
  'A/P',
  'AL',
  'AP',
  'ANAK LELAKI',
  'ANAK PEREMPUAN',
  'ANAK',
  'AK',
  '@', // Official Malaysian alias marker (e.g. RADZALEIGH @ GHAZALI)
  'MOHD',
  'MD',
  'MUHD',
  'WAN',
  'NIK',
  'CHE',
  'TENGKU',
  'RAJA',
  'SYED',
  'SHARIFAH',
  'SYARIFFAH',
  'MEGAT',
  'PUTERI',
  'DAYANG',
  'AWANG',
  'ABANG',
];

// ==========================================
// 2. HELPER FUNCTIONS FOR ISOLATED TESTING
// ==========================================

export function isDelimaEmail(text: string): boolean {
  return DELIMA_EMAIL_REGEX.test(text.trim());
}

export function isValidEmail(text: string): boolean {
  return STANDARD_EMAIL_REGEX.test(text.trim());
}

export function isApprovedClassName(word: string): word is ApprovedClassName {
  const normalized = word.trim().toUpperCase();
  return (APPROVED_CLASSES as readonly string[]).includes(normalized);
}

/**
 * Check if a token contains or matches a class specification
 * Supports strings like:
 * - "1 BUDI ( current year)"
 * - "3 MAJU (curent year)"
 * - "4 JAYA (curent year)"
 * - "2 USAHA (2025)"
 * - "1 BUDI"
 * - "BUDI"
 */
export interface ParsedClassStructure {
  form: number | null;
  className: ApprovedClassName | '';
  academicYear: number | null;
  isCurrentYearIndicator: boolean;
  rawMatched: string;
}

export function parseClassStructure(token: string, currentYear: number): ParsedClassStructure | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  // Pattern A: Form (1-5) + Class Name + optional (current year / curent year / 2025 / etc.)
  // Matches "1 BUDI ( current year)", "3 MAJU (curent year)", "4 JAYA (curent year)", "1 BUDI 2025"
  const fullPattern =
    /^(?:T|TINGKATAN\s*)?([1-5])\s+([A-Za-z]+)(?:\s*(?:\(\s*(?:cu?r+ent\s*year|\d{4})\s*\)|\b(?:\d{4})\b))?/i;

  const match = trimmed.match(fullPattern);
  if (match) {
    const rawClassCandidate = match[2].toUpperCase();
    // CRITICAL: Must check approved class dictionary!
    if (isApprovedClassName(rawClassCandidate)) {
      const formNum = parseInt(match[1], 10);
      let academicYear: number | null = null;
      let isCurrentYearIndicator = false;

      // Check if current year indicator or numeric year was provided
      if (/cu?r+ent\s*year/i.test(trimmed)) {
        academicYear = currentYear;
        isCurrentYearIndicator = true;
      } else {
        const yearMatch = trimmed.match(/\b(20\d{2})\b/);
        if (yearMatch) {
          academicYear = parseInt(yearMatch[1], 10);
        }
      }

      return {
        form: formNum,
        className: rawClassCandidate,
        academicYear,
        isCurrentYearIndicator,
        rawMatched: trimmed,
      };
    }
  }

  // Pattern B: Class Name only (e.g. "BUDI", "JAYA", "MAJU", "USAHA")
  const upperWord = trimmed.toUpperCase();
  if (isApprovedClassName(upperWord)) {
    return {
      form: null,
      className: upperWord,
      academicYear: null,
      isCurrentYearIndicator: false,
      rawMatched: trimmed,
    };
  }

  return null;
}

/**
 * Normalizes student name for database lookup
 */
export function normalizeStudentLookupName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^\s*(?:\[\d+\]|\(\d+\)|\d+[\.\)\-\:\s]+)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Deterministically finds a matching student in the school's master DELIMa directory
 */
export function findMatchingStudentInDatabase(
  candidateName: string,
  database: Student[] = initialStudents
): Student | null {
  if (!candidateName) return null;
  const cleanCandidate = normalizeStudentLookupName(candidateName);
  if (!cleanCandidate || cleanCandidate.length < 3) return null;

  // 1. Exact normalized match
  const exact = database.find((s) => normalizeStudentLookupName(s.nama) === cleanCandidate);
  if (exact) return exact;

  // 2. Tolerance for alias spacing (e.g. "RADZALEIGH@GHAZALI" vs "RADZALEIGH @ GHAZALI")
  const candidateAliasNorm = cleanCandidate.replace(/\s*@\s*/g, ' @ ');
  const aliasMatch = database.find((s) => {
    const sNorm = normalizeStudentLookupName(s.nama).replace(/\s*@\s*/g, ' @ ');
    return sNorm === candidateAliasNorm;
  });
  if (aliasMatch) return aliasMatch;

  // 3. Compact character match (strips extra spaces or punctuation)
  const compactCandidate = cleanCandidate.replace(/[^A-Z0-9]/g, '');
  if (compactCandidate.length >= 4) {
    const compactMatch = database.find((s) => {
      const sCompact = normalizeStudentLookupName(s.nama).replace(/[^A-Z0-9]/g, '');
      return sCompact === compactCandidate;
    });
    if (compactMatch) return compactMatch;
  }

  return null;
}

// ==========================================
// 3. CORE DETERMINISTIC DETECTION ENGINE
// ==========================================

/**
 * Tokenize input string line taking into account tabs, commas, semicolons, and quotes
 */
export function tokenizeLine(line: string): string[] {
  const trimmedLine = line.trim();
  if (!trimmedLine) return [];

  // Determine delimiter
  let delimiter = '\t';
  if (trimmedLine.includes('\t')) {
    delimiter = '\t';
  } else if (trimmedLine.includes(',')) {
    delimiter = ',';
  } else if (trimmedLine.includes(';')) {
    delimiter = ';';
  } else if (trimmedLine.includes('|')) {
    delimiter = '|';
  }

  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < trimmedLine.length; i++) {
    const char = trimmedLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim());

  // Clean quotes from ends of tokens and strip empty
  return tokens
    .map((t) => t.replace(/^["']+|["']+$/g, '').trim())
    .filter((t) => t.length > 0);
}

/**
 * Classifies a single student record completely offline using strict deterministic rules
 */
export function classifyStudentRecordOffline(
  tokens: string[],
  originalRowString: string,
  currentYear = getCurrentSchoolYear(),
  existingStudents: Student[] = initialStudents
): OfflineDetectionResult {
  const rawTokens = [...tokens];
  const unclassifiedTokens: string[] = [];
  const conflicts: string[] = [];
  const validationReasons: string[] = [];

  // Default empty classified fields
  let classifiedEmail: ClassifiedField<string> = {
    value: '',
    confidence: 'UNCLASSIFIED',
  };

  let classifiedName: ClassifiedField<string> = {
    value: '',
    confidence: 'UNCLASSIFIED',
  };

  let classifiedClassName: ClassifiedField<ApprovedClassName | ''> = {
    value: '',
    confidence: 'UNCLASSIFIED',
  };

  let classifiedFormNumber: ClassifiedField<number | null> = {
    value: null,
    confidence: 'UNCLASSIFIED',
  };

  let classifiedFormCode: ClassifiedField<string> = {
    value: '',
    confidence: 'UNCLASSIFIED',
  };

  let classifiedAcademicYear: ClassifiedField<number | null> = {
    value: null,
    confidence: 'UNCLASSIFIED',
  };

  let classifiedStatus: ClassifiedField<string> = {
    value: 'Sudah Login',
    confidence: 'MEDIUM',
  };

  let tarikhJana = '-';
  let tarikhLogin = '-';

  // Pool of candidate tokens to process
  const remainingTokens: string[] = [];

  // -------------------------------------------------------------
  // STEP 1: Strict Email Recognition & Field Isolation
  // An email MUST only populate the Email field.
  // Never interpret an email as name or class.
  // -------------------------------------------------------------
  for (const token of rawTokens) {
    if (DELIMA_EMAIL_REGEX.test(token)) {
      if (!classifiedEmail.value) {
        classifiedEmail = {
          value: token.toLowerCase(),
          confidence: 'HIGH',
          sourceToken: token,
          ruleMatched: 'DELIMa Email Regex (m-<digits>@moe-dl.edu.my)',
        };
      } else if (classifiedEmail.value !== token.toLowerCase()) {
        conflicts.push(`Multiple email values found: '${classifiedEmail.value}' vs '${token}'`);
        unclassifiedTokens.push(token);
      }
      continue;
    }

    if (STANDARD_EMAIL_REGEX.test(token)) {
      if (!classifiedEmail.value) {
        classifiedEmail = {
          value: token.toLowerCase(),
          confidence: 'HIGH',
          sourceToken: token,
          ruleMatched: 'Standard RFC-5322 Email Regex',
        };
      } else if (classifiedEmail.value !== token.toLowerCase()) {
        conflicts.push(`Multiple email values found: '${classifiedEmail.value}' vs '${token}'`);
        unclassifiedTokens.push(token);
      }
      continue;
    }

    // Check if token contains embedded email
    if (EMBEDDED_EMAIL_REGEX.test(token)) {
      const match = token.match(EMBEDDED_EMAIL_REGEX);
      if (match && !classifiedEmail.value) {
        const found = match[0].toLowerCase();
        classifiedEmail = {
          value: found,
          confidence: DELIMA_EMAIL_REGEX.test(found) ? 'HIGH' : 'MEDIUM',
          sourceToken: token,
          ruleMatched: 'Embedded Email Regex Extraction',
        };
        // Remove email portion from token and keep rest if meaningful
        const cleanedRest = token.replace(match[0], '').trim();
        if (cleanedRest.length > 0) {
          remainingTokens.push(cleanedRest);
        }
        continue;
      }
    }

    // -------------------------------------------------------------
    // STEP 2: Date and Status Isolation
    // -------------------------------------------------------------
    if (DATE_REGEX.test(token)) {
      if (tarikhJana === '-') {
        tarikhJana = token;
      } else if (tarikhLogin === '-') {
        tarikhLogin = token;
      }
      continue;
    }

    const upperToken = token.toUpperCase();
    if (STATUS_KEYWORDS.includes(upperToken) || upperToken.includes('LOGIN')) {
      const isBelum = upperToken.includes('BELUM') || upperToken.includes('TIDAK');
      classifiedStatus = {
        value: isBelum ? 'Belum Login' : 'Sudah Login',
        confidence: 'HIGH',
        sourceToken: token,
        ruleMatched: 'Portal Login Status Keyword Match',
      };
      continue;
    }

    // Pass forward to next classification stage
    remainingTokens.push(token);
  }

  // -------------------------------------------------------------
  // STEP 3: Strict Class & Form Recognition
  // - Approved class names dictionary: BUDI, JAYA, MAJU, USAHA
  // - Forms 1 through 5
  // - Strings like: "1 BUDI ( current year)", "3 MAJU (curent year)", etc.
  // - Extract form number, class name, and optional academic year independently.
  // - Do NOT treat the year as part of the class name!
  // - Do NOT classify arbitrary number-and-word combinations as valid classes.
  // -------------------------------------------------------------
  const afterClassTokens: string[] = [];

  for (const token of remainingTokens) {
    const classParsed = parseClassStructure(token, currentYear);

    if (classParsed) {
      // We found an approved class structure!
      if (!classifiedClassName.value) {
        classifiedClassName = {
          value: classParsed.className,
          confidence: 'HIGH',
          sourceToken: token,
          ruleMatched: `Approved Class Dictionary (${classParsed.className})`,
        };

        if (classParsed.form !== null && !classifiedFormNumber.value) {
          classifiedFormNumber = {
            value: classParsed.form,
            confidence: 'HIGH',
            sourceToken: token,
            ruleMatched: `Extracted Form Number (${classParsed.form})`,
          };
          classifiedFormCode = {
            value: `T${classParsed.form}`,
            confidence: 'HIGH',
            sourceToken: token,
            ruleMatched: `Form Code T${classParsed.form}`,
          };
        }

        if (classParsed.academicYear !== null && !classifiedAcademicYear.value) {
          classifiedAcademicYear = {
            value: classParsed.academicYear,
            confidence: 'HIGH',
            sourceToken: token,
            ruleMatched: classParsed.isCurrentYearIndicator
              ? 'Resolved Academic Year (Current Year Indicator)'
              : `Explicit Academic Year (${classParsed.academicYear})`,
          };
        }
      } else if (classifiedClassName.value !== classParsed.className) {
        conflicts.push(`Conflicting classes: '${classifiedClassName.value}' vs '${classParsed.className}'`);
        unclassifiedTokens.push(token);
      }
      continue;
    }

    // Check standalone Form token (e.g. "T1", "T2", "Tingkatan 1", or isolated digit "1"-"5")
    if (!classifiedFormNumber.value && FORM_STANDALONE_REGEX.test(token)) {
      const match = token.match(FORM_STANDALONE_REGEX);
      if (match) {
        const formNum = parseInt(match[1], 10);
        classifiedFormNumber = {
          value: formNum,
          confidence: 'HIGH',
          sourceToken: token,
          ruleMatched: `Isolated Form Specifier (T${formNum})`,
        };
        classifiedFormCode = {
          value: `T${formNum}`,
          confidence: 'HIGH',
          sourceToken: token,
          ruleMatched: `Form Code T${formNum}`,
        };
        continue;
      }
    }

    // Check if user provided an unapproved class (e.g. "1 CEMERLANG", "2 AMANAH")
    // Rule: Do not classify arbitrary number-and-word combinations as valid classes without checking the approved class dictionary!
    const arbitraryClassMatch = token.match(/^(?:T|TINGKATAN\s*)?([1-5])\s+([A-Za-z]+)/i);
    if (arbitraryClassMatch) {
      const potentialWord = arbitraryClassMatch[2].toUpperCase();
      if (!isApprovedClassName(potentialWord)) {
        validationReasons.push(
          `Kelas '${potentialWord}' bukan dalam senarai kelas diluluskan (${APPROVED_CLASSES.join(', ')}). Nilai ditandakan untuk semakan.`
        );
        unclassifiedTokens.push(token);
        continue;
      }
    }

    afterClassTokens.push(token);
  }

  // -------------------------------------------------------------
  // STEP 4: Student Name Recognition
  // - Identify names only after excluding recognized emails, classes, dates, statuses
  // - Strip leading numbering (e.g. "28. ", "1. ", "01) ", "[3] ")
  // - Support multi-word Malaysian student names (BIN, BINTI, A/L, A/P, ANAK, @ alias)
  // - Preserve original spelling, word order, spaces, and legitimate name components
  // - Discard portal noise, button words, and table headers (NILAM, HANTAR, etc.)
  // -------------------------------------------------------------
  for (const token of afterClassTokens) {
    if (!token) continue;
    let cleanCandidate = token.trim();
    if (!cleanCandidate) continue;

    // A. Strip leading index numbering (e.g. "28. ", "1. ", "01) ", "3 - ", "[4] ")
    cleanCandidate = cleanCandidate.replace(/^\s*(?:\[\d+\]|\(\d+\)|\d+[\.\)\-\:\s]+)\s*/, '').trim();

    const upperToken = cleanCandidate.toUpperCase();
    const upperNoDot = upperToken.replace(/\.$/, '');

    // B. Exclude portal action buttons, table headers, and system keywords (NILAM, HANTAR, etc.)
    if (
      PORTAL_NOISE_KEYWORDS.includes(upperToken) ||
      PORTAL_NOISE_KEYWORDS.includes(upperNoDot) ||
      HEADER_KEYWORDS.includes(upperToken) ||
      HEADER_KEYWORDS.includes(upperNoDot)
    ) {
      continue;
    }

    // C. Exclude pure numbers, index row numbers (e.g. "1", "1.", "01", "25.", "#1")
    if (/^\d+\.?$/.test(cleanCandidate) || /^#\d+$/.test(cleanCandidate)) {
      continue;
    }

    // D. Character check:
    // Letters (A-Za-z) are mandatory.
    // Allowed symbols: spaces, hyphens (-), apostrophes ('), dots (.), slashes (/ for A/L), and @ (for alias like "RADZALEIGH @ GHAZALI")
    // Strictly forbidden: # $ ^ & * + = [ ] { } | < > ? ~ % ! ; : \ " and any digits (0-9)
    const hasLetters = /[A-Za-z]/.test(cleanCandidate);
    const hasForbiddenChars = /[#$^&*+=\[\]{}|<>?~%!;:\"0-9]/.test(cleanCandidate);

    if (!hasLetters || hasForbiddenChars || cleanCandidate.length < 2) {
      unclassifiedTokens.push(token);
      continue;
    }

    // E. Distinguish authentic student names from stray words:
    const words = cleanCandidate.split(/\s+/).filter(Boolean);
    const hasMalaysianMarker = MALAYSIAN_NAME_MARKERS.some((m) =>
      m === '@'
        ? /\s+@\s+/.test(cleanCandidate) || /@[A-Za-z]/.test(cleanCandidate)
        : new RegExp(`\\b${m.replace('/', '\\/')}\\b`, 'i').test(upperToken)
    );

    // If it's only a single word with no Malaysian marker (like "NILAM" or "HANTAR"):
    if (words.length < 2 && !hasMalaysianMarker) {
      // Stray single word that is not a recognized patronymic name - do not treat as student name
      continue;
    }

    if (!classifiedName.value) {
      // Name candidate found!
      // Preserves original spelling, word order, spaces, and components
      const normalizedName = cleanCandidate.replace(/\s+/g, ' ').trim();

      classifiedName = {
        value: normalizedName,
        confidence: 'HIGH',
        sourceToken: token,
        ruleMatched: hasMalaysianMarker
          ? 'Format Nama Malaysia (BIN/BINTI/A-L/A-P/Anak/@ Alias)'
          : 'Pola Nama Penuh Berbilang Perkataan',
      };
    } else {
      // We already have a name. If another long text token is found, flag as conflict
      conflicts.push(`Calon nama berbilang: '${classifiedName.value}' vs '${cleanCandidate}'`);
      unclassifiedTokens.push(token);
    }
  }

  // -------------------------------------------------------------
  // STEP 5: Reconcile Form and Class
  // Form values must remain separate from class names
  // -------------------------------------------------------------
  let fullClassDisplay = '';

  // -------------------------------------------------------------
  // STEP 5.5: Smart Auto-Lookup & Directory Cross-Referencing
  // If student name exists in the school's master DELIMa directory,
  // automatically enrich missing Email, Kelas, Tingkatan, and status!
  // -------------------------------------------------------------
  if (classifiedName.value && (!classifiedEmail.value || !classifiedClassName.value || !classifiedFormNumber.value)) {
    const matched = findMatchingStudentInDatabase(classifiedName.value, existingStudents);
    if (matched) {
      if (!classifiedEmail.value && matched.email) {
        classifiedEmail = {
          value: matched.email.toLowerCase(),
          confidence: 'HIGH',
          sourceToken: matched.email,
          ruleMatched: 'Padanan Direktori DELIMa (Automatik)',
        };
      }

      if (!classifiedClassName.value && (matched.kelas || matched.baseKelas)) {
        const fullCls = matched.kelas || matched.baseKelas || '';
        const classWordMatch = fullCls.match(/\b(BUDI|JAYA|MAJU|USAHA)\b/i);
        if (classWordMatch) {
          const matchedClassWord = classWordMatch[1].toUpperCase() as ApprovedClassName;
          classifiedClassName = {
            value: matchedClassWord,
            confidence: 'HIGH',
            sourceToken: fullCls,
            ruleMatched: 'Padanan Direktori DELIMa (Automatik)',
          };
        }
      }

      if (!classifiedFormNumber.value) {
        let fNum: number | null = null;
        if (matched.tingkatan) {
          const tMatch = matched.tingkatan.match(/(?:T|TINGKATAN\s*)?([1-5])/i);
          if (tMatch) fNum = parseInt(tMatch[1], 10);
        }
        if (!fNum && matched.kelas) {
          const kMatch = matched.kelas.match(/(?:T|TINGKATAN\s*)?([1-5])/i);
          if (kMatch) fNum = parseInt(kMatch[1], 10);
        }
        if (!fNum && matched.baseTingkatan) {
          const btMatch = matched.baseTingkatan.match(/(?:T|TINGKATAN\s*)?([1-5])/i);
          if (btMatch) {
            const rawBase = parseInt(btMatch[1], 10);
            const diff = (currentYear || 2026) - (matched.baseYear || 2025);
            fNum = Math.min(5, Math.max(1, rawBase + (diff > 0 ? diff : 0)));
          }
        }

        if (fNum) {
          classifiedFormNumber = {
            value: fNum,
            confidence: 'HIGH',
            sourceToken: matched.tingkatan || matched.kelas,
            ruleMatched: 'Padanan Direktori DELIMa (Automatik)',
          };
          classifiedFormCode = {
            value: `T${fNum}`,
            confidence: 'HIGH',
            sourceToken: matched.tingkatan || matched.kelas,
            ruleMatched: 'Padanan Direktori DELIMa (Automatik)',
          };
        }
      }

      if (matched.kelas) {
        fullClassDisplay = matched.kelas;
      }

      if (tarikhJana === '-' && matched.tarikhJana) {
        tarikhJana = matched.tarikhJana;
      }
      if (tarikhLogin === '-' && matched.tarikhLogin) {
        tarikhLogin = matched.tarikhLogin;
      }
      if (matched.status) {
        classifiedStatus = {
          value: matched.status,
          confidence: 'HIGH',
          ruleMatched: 'Padanan Direktori DELIMa (Automatik)',
        };
      }
    }
  }

  if (classifiedClassName.value && !classifiedFormNumber.value) {
    validationReasons.push(`Kelas '${classifiedClassName.value}' dikesan tanpa nombor Tingkatan (1-5).`);
  }

  // Construct display string for Class if not already set
  if (!fullClassDisplay && classifiedClassName.value) {
    const formPrefix = classifiedFormNumber.value ? `${classifiedFormNumber.value} ` : '';
    const yearSuffix = classifiedAcademicYear.value ? ` (${classifiedAcademicYear.value})` : ` (${currentYear})`;
    fullClassDisplay = `${formPrefix}${classifiedClassName.value}${yearSuffix}`;
  }

  // -------------------------------------------------------------
  // STEP 6: Validation Status Determination (Strict Validation)
  // -------------------------------------------------------------
  let validationStatus: ValidationStatus = 'VALID';

  // Rule A: Name is mandatory
  if (!classifiedName.value) {
    validationStatus = 'INVALID';
    validationReasons.push('Nama murid tidak dijumpai dalam baris data.');
  }

  // Rule B: Conflicts require human review
  if (conflicts.length > 0) {
    validationStatus = 'NEEDS_REVIEW';
    validationReasons.push(...conflicts);
  }

  // Rule C: Unclassified tokens require review
  if (unclassifiedTokens.length > 0) {
    if (validationStatus === 'VALID') {
      validationStatus = 'NEEDS_REVIEW';
    }
    validationReasons.push(
      `Terdapat ${unclassifiedTokens.length} token data yang tidak dapat dikelaskan dengan yakin: [${unclassifiedTokens.join(', ')}]`
    );
  }

  // Rule D: If email present but not DELIMa format
  if (classifiedEmail.value && !DELIMA_EMAIL_REGEX.test(classifiedEmail.value)) {
    if (validationStatus === 'VALID') {
      validationStatus = 'NEEDS_REVIEW';
    }
    validationReasons.push(
      `Emel '${classifiedEmail.value}' bukan format rasmi DELIMa (m-<digits>@moe-dl.edu.my).`
    );
  }

  const id = classifiedEmail.value
    ? classifiedEmail.value.split('@')[0]
    : `std-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return {
    id,
    originalRow: originalRowString,
    rawTokens,
    name: classifiedName,
    email: classifiedEmail,
    className: classifiedClassName,
    formNumber: classifiedFormNumber,
    formCode: classifiedFormCode,
    academicYear: classifiedAcademicYear,
    fullClassDisplay,
    status: classifiedStatus,
    tarikhJana,
    tarikhLogin,
    unclassifiedTokens,
    conflicts,
    validationStatus,
    validationReasons,
  };
}

/**
 * Parse and classify raw text (tab/comma/semicolon delimited) offline
 */
export function detectStudentsFromRawText(
  rawText: string,
  currentYear = getCurrentSchoolYear(),
  existingStudents: Student[] = initialStudents
): OfflineDetectionResult[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const results: OfflineDetectionResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const tokens = tokenizeLine(line);
    if (tokens.length === 0) continue;

    // A. Skip if entire line is just a portal button or keyword (e.g. "NILAM", "HANTAR", "SUBMIT")
    const cleanedLineUpper = line.toUpperCase().trim();
    if (PORTAL_NOISE_KEYWORDS.includes(cleanedLineUpper)) {
      continue;
    }

    // B. Skip if all tokens are noise words or numbers
    const allTokensAreNoise = tokens.every((t) => {
      const up = t.toUpperCase().replace(/\.$/, '');
      return PORTAL_NOISE_KEYWORDS.includes(up) || /^\d+\.?$/.test(t) || /^#\d+$/.test(t);
    });
    if (allTokensAreNoise) {
      continue;
    }

    // C. Skip table header line if detected
    const joinedLower = tokens.join(' ').toLowerCase();
    const isHeaderRow =
      (joinedLower.includes('nama') || joinedLower.includes('name')) &&
      (joinedLower.includes('email') ||
        joinedLower.includes('emel') ||
        joinedLower.includes('tingkatan') ||
        joinedLower.includes('kelas') ||
        joinedLower.includes('bil') ||
        joinedLower.includes('no'));

    if (isHeaderRow) {
      continue;
    }

    const detected = classifyStudentRecordOffline(tokens, line, currentYear, existingStudents);

    // D. Only keep records that have at least a Name or an Email or a Class
    if (!detected.name.value && !detected.email.value && !detected.className.value) {
      continue;
    }

    results.push(detected);
  }

  return results;
}

/**
 * Convert verified Detection Result to a standard Student model
 */
export function convertDetectionToStudent(
  item: OfflineDetectionResult,
  currentYear = getCurrentSchoolYear()
): Student {
  const baseTingkatan = item.formCode.value || (item.formNumber.value ? `T${item.formNumber.value}` : '');
  const baseClassName = item.className.value || '';
  const baseYear = item.academicYear.value || currentYear;

  // Base class string formatted according to standard (e.g. "1 BUDI 2025" or "1 BUDI")
  const baseKelas =
    baseClassName && item.formNumber.value
      ? `${item.formNumber.value} ${baseClassName} ${baseYear}`
      : baseClassName;

  return processStudentProgression(
    {
      id: item.email.value ? item.email.value.split('@')[0] : item.id,
      email: item.email.value,
      nama: item.name.value.toUpperCase(),
      baseKelas: baseKelas,
      kelas: baseKelas,
      baseTingkatan: baseTingkatan,
      baseYear: baseYear,
      tarikhJana: item.tarikhJana !== '-' ? item.tarikhJana : new Date().toISOString().slice(0, 19).replace('T', ' '),
      tarikhLogin: item.tarikhLogin,
      status: item.status.value || 'Sudah Login',
    },
    currentYear
  );
}
