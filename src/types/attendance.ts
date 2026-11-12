export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  classId: string;
}

export type ClassCategory = 'Ikhwan' | 'Akhwat' | 'Umum';

export interface ClassRoom {
  id: string;
  name: string;
  grade: string;
  category: ClassCategory;
  homeroomTeacher?: string;
}

export type LeaveEvidenceType = 'foto_acara' | 'surat_tertulis';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  recordedAt: string;
  // Ketentuan Khusus Sakit & Izin
  attachmentType?: 'skd' | LeaveEvidenceType;
  attachmentData?: string; // Data URL / Base64 foto surat
  attachmentName?: string;
  leaveType?: 'acara' | 'mendadak';
  hasSKD?: boolean;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'semester' | 'custom';

export interface SchoolProfile {
  schoolName: string;
  npsn: string;
  address: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  // 4 Tanda Tangan Resmi Pengesahan:
  principalName: string; // Kepala Sekolah
  principalNip: string;
  kesiswaanName: string; // Waka Kesiswaan
  kesiswaanNip: string;
  walasIkhwanName: string; // Wali Kelas / Koordinator Ikhwan
  walasIkhwanNip: string;
  walasAkhwatName: string; // Wali Kelas / Koordinator Akhwat
  walasAkhwatNip: string;
  // Fallbacks opsional
  homeroomTeacherName?: string;
  homeroomTeacherNip?: string;
}

export interface StudentSummary {
  student: Student;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  totalDays: number;
  percentage: number;
  recordsByDate: Record<string, { status: AttendanceStatus; note?: string }>;
}

export interface PeriodSummary {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  label: string;
  totalStudents: number;
  totalDays: number;
  overallAttendanceRate: number;
  totalHadir: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  studentSummaries: StudentSummary[];
  datesInRange: string[];
}
