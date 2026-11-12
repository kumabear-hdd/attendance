import { AttendanceRecord, ClassRoom, SchoolProfile, Student } from '../types/attendance';

export const INITIAL_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: 'Sekolah Islam Terpadu / Pesantren',
  npsn: '20109988',
  address: 'Jl. Pendidikan Karakter No. 10',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  // 4 Pengesahan Resmi:
  principalName: 'Drs. H. Ahmad Fauzan, M.Pd.',
  principalNip: '19750815 200501 1 003',
  kesiswaanName: 'Ust. Muhammad Salman, S.Pd.',
  kesiswaanNip: '19820412 201001 1 008',
  walasIkhwanName: 'Ust. Abdullah Fatih, S.Pd.I',
  walasIkhwanNip: '19880920 201502 1 004',
  walasAkhwatName: 'Usth. Maryam Salsabila, S.Si.',
  walasAkhwatNip: '19900315 201603 2 006',
  homeroomTeacherName: 'Tim Piket / Wali Kelas',
  homeroomTeacherNip: '-',
};

// 12 Ruangan: Tingkat X, XI, XII, masing-masing 2 ruangan Ikhwan & 2 ruangan Akhwat (tanpa mapel/jurusan seperti MIPA)
export const INITIAL_CLASSES: ClassRoom[] = [
  // TINGKAT X
  { id: 'c_x_ikhwan_1', name: 'X Ikhwan 1', grade: 'X', category: 'Ikhwan', homeroomTeacher: 'Ust. Muhammad Rizki' },
  { id: 'c_x_ikhwan_2', name: 'X Ikhwan 2', grade: 'X', category: 'Ikhwan', homeroomTeacher: 'Ust. Fajar Ramadhan' },
  { id: 'c_x_akhwat_1', name: 'X Akhwat 1', grade: 'X', category: 'Akhwat', homeroomTeacher: 'Usth. Sarah Khadijah' },
  { id: 'c_x_akhwat_2', name: 'X Akhwat 2', grade: 'X', category: 'Akhwat', homeroomTeacher: 'Usth. Fatimah Az-Zahra' },

  // TINGKAT XI
  { id: 'c_xi_ikhwan_1', name: 'XI Ikhwan 1', grade: 'XI', category: 'Ikhwan', homeroomTeacher: 'Ust. Abdullah Fatih' },
  { id: 'c_xi_ikhwan_2', name: 'XI Ikhwan 2', grade: 'XI', category: 'Ikhwan', homeroomTeacher: 'Ust. Salman Al-Farisi' },
  { id: 'c_xi_akhwat_1', name: 'XI Akhwat 1', grade: 'XI', category: 'Akhwat', homeroomTeacher: 'Usth. Maryam Salsabila' },
  { id: 'c_xi_akhwat_2', name: 'XI Akhwat 2', grade: 'XI', category: 'Akhwat', homeroomTeacher: 'Usth. Zainab Binti Ali' },

  // TINGKAT XII
  { id: 'c_xii_ikhwan_1', name: 'XII Ikhwan 1', grade: 'XII', category: 'Ikhwan', homeroomTeacher: 'Ust. Farhan Kurniawan' },
  { id: 'c_xii_ikhwan_2', name: 'XII Ikhwan 2', grade: 'XII', category: 'Ikhwan', homeroomTeacher: 'Ust. Hamzah Asadullah' },
  { id: 'c_xii_akhwat_1', name: 'XII Akhwat 1', grade: 'XII', category: 'Akhwat', homeroomTeacher: 'Usth. Aisyah Humaira' },
  { id: 'c_xii_akhwat_2', name: 'XII Akhwat 2', grade: 'XII', category: 'Akhwat', homeroomTeacher: 'Usth. Ruqayyah Wardani' },
];

// Clean state: user starts with clean empty students and records
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_RECORDS: AttendanceRecord[] = [];

const STORAGE_KEY = 'si_hadir_sekolah_12ruangan_clean_v5';

export interface StorageData {
  students: Student[];
  classes: ClassRoom[];
  records: AttendanceRecord[];
  schoolProfile: SchoolProfile;
}

export function loadStoredData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.students) && Array.isArray(parsed.classes) && Array.isArray(parsed.records) && parsed.schoolProfile) {
        return {
          ...parsed,
          schoolProfile: {
            ...INITIAL_SCHOOL_PROFILE,
            ...parsed.schoolProfile,
          },
        };
      }
    }
  } catch (err) {
    console.error('Failed to parse stored attendance data:', err);
  }

  // Fresh clean state
  const cleanData: StorageData = {
    students: INITIAL_STUDENTS,
    classes: INITIAL_CLASSES,
    records: INITIAL_RECORDS,
    schoolProfile: INITIAL_SCHOOL_PROFILE,
  };
  saveStoredData(cleanData);
  return cleanData;
}

export function resetToInitialData(): StorageData {
  const clean: StorageData = {
    students: INITIAL_STUDENTS,
    classes: INITIAL_CLASSES,
    records: INITIAL_RECORDS,
    schoolProfile: INITIAL_SCHOOL_PROFILE,
  };
  saveStoredData(clean);
  return clean;
}

export function saveStoredData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save attendance data to localStorage:', err);
  }
}

export function clearAllStudentData(currentClasses: ClassRoom[], profile: SchoolProfile): StorageData {
  const clean: StorageData = {
    students: [],
    records: [],
    classes: currentClasses.length > 0 ? currentClasses : INITIAL_CLASSES,
    schoolProfile: profile,
  };
  saveStoredData(clean);
  return clean;
}
