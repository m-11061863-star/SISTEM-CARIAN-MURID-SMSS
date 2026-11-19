export const APPROVED_CLASS_NAMES = ['BUDI', 'JAYA', 'MAJU', 'USAHA'] as const;
export type ApprovedClassName = (typeof APPROVED_CLASS_NAMES)[number];

export interface Student {
  id: string;
  email: string;
  nama: string;
  baseTingkatan: string;
  baseKelas: string; // The base class name (e.g. "1 BUDI 2025")
  baseYear: number;
  tingkatan: string; // Dynamic: T1, T2, T3, T4, T5, or Alumni
  tingkatanLabel: string;
  kelas: string; // Auto-advanced class, e.g. "2 BUDI 2026" or "Alumni"
  tarikhJana: string;
  tarikhLogin: string;
  status: string;
}

export type SortField = 'nama' | 'tingkatan' | 'kelas' | 'tarikhLogin' | 'status';
export type SortOrder = 'asc' | 'desc';
export type NameCaseMode = 'uppercase' | 'titlecase';

export interface FilterState {
  search: string;
  tingkatan: string;
  kelas: string;
  status: string;
  letter: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

export type DetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCLASSIFIED';

export interface ClassifiedField<T> {
  value: T;
  confidence: DetectionConfidence;
  sourceToken?: string;
  ruleMatched?: string;
}

export type ValidationStatus = 'VALID' | 'NEEDS_REVIEW' | 'INVALID';

export interface OfflineDetectionResult {
  id: string;
  originalRow: string;
  rawTokens: string[];
  name: ClassifiedField<string>;
  email: ClassifiedField<string>;
  className: ClassifiedField<ApprovedClassName | ''>; // strictly one of BUDI, JAYA, MAJU, USAHA or empty
  formNumber: ClassifiedField<number | null>; // 1 - 5
  formCode: ClassifiedField<string>; // "T1" - "T5"
  academicYear: ClassifiedField<number | null>;
  fullClassDisplay: string; // e.g. "1 BUDI (2026)" or "1 BUDI"
  status: ClassifiedField<string>;
  tarikhJana: string;
  tarikhLogin: string;
  unclassifiedTokens: string[];
  conflicts: string[];
  validationStatus: ValidationStatus;
  validationReasons: string[];
}

