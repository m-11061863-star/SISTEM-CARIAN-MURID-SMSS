import * as XLSX from 'xlsx';
import { Student, OfflineDetectionResult } from '../types';
import { getCurrentSchoolYear } from './helpers';
import {
  classifyStudentRecordOffline,
  detectStudentsFromRawText,
  convertDetectionToStudent,
} from './offlineDataEngine';

export {
  detectStudentsFromRawText,
  convertDetectionToStudent,
  classifyStudentRecordOffline,
};

/**
 * Deterministic offline parser for Excel (.xlsx / .xls) files
 * Extracts rows and passes them strictly through the offline detection engine
 */
export async function detectStudentsFromExcelFile(
  file: File,
  currentYear = getCurrentSchoolYear(),
  existingStudents?: Student[]
): Promise<OfflineDetectionResult[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D array of rows
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  if (!rawRows || rawRows.length === 0) return [];

  const results: OfflineDetectionResult[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const cells = row
      .map((c) => (c !== null && c !== undefined ? String(c).trim() : ''))
      .filter((c) => c.length > 0);

    if (cells.length === 0) continue;

    const joinedLower = cells.join(' ').toLowerCase();

    // Skip table header line if detected
    if (
      (joinedLower.includes('nama') || joinedLower.includes('name')) &&
      (joinedLower.includes('email') ||
        joinedLower.includes('emel') ||
        joinedLower.includes('tingkatan') ||
        joinedLower.includes('kelas') ||
        joinedLower.includes('bil') ||
        joinedLower.includes('no'))
    ) {
      continue;
    }

    const originalRowString = cells.join('\t');
    const detected = classifyStudentRecordOffline(cells, originalRowString, currentYear, existingStudents);

    // Only keep if record has a Name, Email, or Class
    if (!detected.name.value && !detected.email.value && !detected.className.value) {
      continue;
    }

    results.push(detected);
  }

  return results;
}

/**
 * Parse raw text to valid Student objects via the offline detection engine
 */
export function parseRawTextToStudents(
  rawText: string,
  currentYear = getCurrentSchoolYear()
): Student[] {
  const detectedList = detectStudentsFromRawText(rawText, currentYear);
  // Only convert records that have at least a recognized student name
  return detectedList
    .filter((d) => d.name.value && d.validationStatus !== 'INVALID')
    .map((d) => convertDetectionToStudent(d, currentYear));
}

/**
 * Parse Excel file to valid Student objects via the offline detection engine
 */
export async function parseExcelFileToStudents(
  file: File,
  currentYear = getCurrentSchoolYear()
): Promise<Student[]> {
  const detectedList = await detectStudentsFromExcelFile(file, currentYear);
  return detectedList
    .filter((d) => d.name.value && d.validationStatus !== 'INVALID')
    .map((d) => convertDetectionToStudent(d, currentYear));
}
