import { AttendanceRecord, ClassRoom, SchoolProfile, Student } from '../types/attendance';

export const INITIAL_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: 'PKBM Mustaqbal Vocational School',
  npsn: '-',
  address: 'Jl. Pendidikan Karakter No. 10',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  // 4 Pengesahan Resmi Sesuai Standar Administrasi:
  principalName: 'Imam Najmudin, S.kom',
  principalNip: '144802020004',
  kesiswaanName: 'Hanif Daffa Dzulfahmi',
  kesiswaanNip: '144802020007',
  walasIkhwanName: 'Fikri Ihsan Abdulloh',
  walasIkhwanNip: '144802020005',
  walasAkhwatName: 'Sahreny Novaida Purnama',
  walasAkhwatNip: '144802020006',
  homeroomTeacherName: 'Tim Piket / Wali Kelas',
  homeroomTeacherNip: '-',
};

// Ruangan Tingkat X, XI, XII (Ikhwan & Akhwat)
export const INITIAL_CLASSES: ClassRoom[] = [
  // TINGKAT X
  { id: 'c_x_ikhwan_1', name: 'X Ikhwan 1', grade: 'X', category: 'Ikhwan', homeroomTeacher: 'Fikri Ihsan Abdulloh' },
  { id: 'c_x_ikhwan_2', name: 'X Ikhwan 2', grade: 'X', category: 'Ikhwan', homeroomTeacher: 'Fikri Ihsan Abdulloh' },
  { id: 'c_x_akhwat_1', name: 'X Akhwat 1', grade: 'X', category: 'Akhwat', homeroomTeacher: 'Sahreny Novaida Purnama' },
  { id: 'c_x_akhwat_2', name: 'X Akhwat 2', grade: 'X', category: 'Akhwat', homeroomTeacher: 'Sahreny Novaida Purnama' },

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

// 17 Siswa Awal PKBM Mustaqbal Vocational School
export const INITIAL_STUDENTS: Student[] = [
  // X Ikhwan 1 (No 1 - 6)
  { id: 's_1001', nis: '1001', nisn: '1001', name: 'Adam', gender: 'L', classId: 'c_x_ikhwan_1' },
  { id: 's_1002', nis: '1002', nisn: '1002', name: 'Dzaky', gender: 'L', classId: 'c_x_ikhwan_1' },
  { id: 's_1003', nis: '1003', nisn: '1003', name: 'Raffa', gender: 'L', classId: 'c_x_ikhwan_1' },
  { id: 's_1004', nis: '1004', nisn: '1004', name: 'Hudzaifah', gender: 'L', classId: 'c_x_ikhwan_1' },
  { id: 's_1005', nis: '1005', nisn: '1005', name: 'Faiz', gender: 'L', classId: 'c_x_ikhwan_1' },
  { id: 's_1006', nis: '1006', nisn: '1006', name: 'Ardhani', gender: 'L', classId: 'c_x_ikhwan_1' },

  // X Akhwat 1 (No 7 - 17)
  { id: 's_1007', nis: '1007', nisn: '1007', name: 'Rachel', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1008', nis: '1008', nisn: '1008', name: 'Husna', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1009', nis: '1009', nisn: '1009', name: 'Tsaulah', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1010', nis: '1010', nisn: '1010', name: 'Salwa', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1011', nis: '1011', nisn: '1011', name: 'Adzkia', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1012', nis: '1012', nisn: '1012', name: 'Ifa', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1013', nis: '1013', nisn: '1013', name: 'Hilya', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1014', nis: '1014', nisn: '1014', name: 'Husna', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1015', nis: '1015', nisn: '1015', name: 'Qonita', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1016', nis: '1016', nisn: '1016', name: 'Yasmin', gender: 'P', classId: 'c_x_akhwat_1' },
  { id: 's_1017', nis: '1017', nisn: '1017', name: 'Muthia', gender: 'P', classId: 'c_x_akhwat_1' },
];

export const INITIAL_RECORDS: AttendanceRecord[] = [];

const STORAGE_KEY = 'si_hadir_mustaqbal_vocational_v1';

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

  // Fresh initial state with PKBM Mustaqbal Vocational School data and students
  const initialData: StorageData = {
    students: INITIAL_STUDENTS,
    classes: INITIAL_CLASSES,
    records: INITIAL_RECORDS,
    schoolProfile: INITIAL_SCHOOL_PROFILE,
  };
  saveStoredData(initialData);
  return initialData;
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
