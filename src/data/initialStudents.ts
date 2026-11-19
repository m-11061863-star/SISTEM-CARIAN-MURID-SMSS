import studentsData from './students.json';
import { Student } from '../types';
import { processStudentProgression } from '../utils/helpers';

export const initialStudents: Student[] = (studentsData as any[]).map((s) =>
  processStudentProgression({
    id: s.id,
    email: s.email,
    nama: s.nama,
    baseKelas: s.kelas || '',
    baseTingkatan: s.tingkatan || '',
    baseYear: 2025,
    tarikhJana: s.tarikhJana,
    tarikhLogin: s.tarikhLogin,
    status: s.status,
  })
);

export const STORAGE_KEY_STUDENTS = 'delima_students_data_v4';
export const STORAGE_KEY_USER_AUTH = 'delima_user_auth_v1';
export const STORAGE_KEY_ADMIN_AUTH = 'delima_admin_auth_v1';
export const STORAGE_KEY_LAST_CHECK_DATE = 'delima_last_check_date_v4';

export const USER_PASSWORD = 'Wea0206';
export const ADMIN_PASSWORD = 'Azeem135';
