import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Info,
  ListPlus,
  Paperclip,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  ClassRoom,
  LeaveEvidenceType,
  SchoolProfile,
  Student,
} from '../types/attendance';
import {
  calculatePercentage,
  formatDateToISO,
  formatIndonesianDate,
  parseISODate,
  STATUS_CONFIG,
  exportAttendanceToExcel,
  aggregateAttendance,
} from '../utils/attendance';
import { EvidenceModal } from './EvidenceModal';

interface DailyAttendanceProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  selectedScope: string;
  onSelectScope: (scope: string) => void;
  classes: ClassRoom[];
  students: Student[];
  records: AttendanceRecord[];
  onSaveRecords: (newRecords: AttendanceRecord[]) => void;
  schoolProfile: SchoolProfile;
  onNavigateToStudents: () => void;
}

interface WorkingItem {
  status: AttendanceStatus;
  note: string;
  attachmentType?: 'skd' | LeaveEvidenceType;
  attachmentData?: string;
  attachmentName?: string;
  leaveType?: 'acara' | 'mendadak';
}

export const DailyAttendance: React.FC<DailyAttendanceProps> = ({
  currentDate,
  onDateChange,
  selectedScope,
  onSelectScope,
  classes,
  students,
  records,
  onSaveRecords,
  schoolProfile,
  onNavigateToStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Evidence modal state
  const [modalStudent, setModalStudent] = useState<Student | null>(null);
  const [modalStatus, setModalStatus] = useState<'Sakit' | 'Izin'>('Sakit');

  // Class lookup map
  const classMap = useMemo(() => {
    const map: Record<string, ClassRoom> = {};
    classes.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [classes]);

  // Filter students by selected scope
  const scopedStudents = useMemo(() => {
    if (selectedScope === 'all') {
      return students;
    }
    if (selectedScope === 'ikhwan') {
      return students.filter((s) => {
        const c = classMap[s.classId];
        return c?.category === 'Ikhwan' || s.gender === 'L';
      });
    }
    if (selectedScope === 'akhwat') {
      return students.filter((s) => {
        const c = classMap[s.classId];
        return c?.category === 'Akhwat' || s.gender === 'P';
      });
    }
    if (selectedScope.startsWith('grade_')) {
      const rawGrade = selectedScope.replace('grade_', '').toUpperCase();
      return students.filter((s) => {
        const c = classMap[s.classId];
        if (!c) return false;
        const cg = c.grade.toUpperCase();
        return (
          cg === rawGrade ||
          (rawGrade === 'X' && cg === '10') ||
          (rawGrade === 'XI' && cg === '11') ||
          (rawGrade === 'XII' && cg === '12') ||
          (rawGrade === '10' && cg === 'X') ||
          (rawGrade === '11' && cg === 'XI') ||
          (rawGrade === '12' && cg === 'XII')
        );
      });
    }
    return students.filter((s) => s.classId === selectedScope);
  }, [students, selectedScope, classMap]);

  // Scope readable label
  const scopeLabel = useMemo(() => {
    if (selectedScope === 'all') return 'Seluruh Siswa Sekolah';
    if (selectedScope === 'ikhwan') return 'Semua Siswa Ikhwan (Putra)';
    if (selectedScope === 'akhwat') return 'Semua Siswi Akhwat (Putri)';
    if (selectedScope === 'grade_X' || selectedScope === 'grade_10') return 'Tingkat X (Semua Ruangan)';
    if (selectedScope === 'grade_XI' || selectedScope === 'grade_11') return 'Tingkat XI (Semua Ruangan)';
    if (selectedScope === 'grade_XII' || selectedScope === 'grade_12') return 'Tingkat XII (Semua Ruangan)';
    return classMap[selectedScope]?.name || 'Kelas Terpilih';
  }, [selectedScope, classMap]);

  // Existing records map for currentDate
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records
      .filter((r) => r.date === currentDate)
      .forEach((r) => {
        map.set(r.studentId, r);
      });
    return map;
  }, [records, currentDate]);

  // Local state for today's working records
  const [attendanceState, setAttendanceState] = useState<Record<string, WorkingItem>>({});

  // Sync state when currentDate, scopedStudents, or records change
  React.useEffect(() => {
    const newState: Record<string, WorkingItem> = {};
    scopedStudents.forEach((student) => {
      const existing = recordsMap.get(student.id);
      if (existing) {
        newState[student.id] = {
          status: existing.status,
          note: existing.note || '',
          attachmentType: existing.attachmentType,
          attachmentData: existing.attachmentData,
          attachmentName: existing.attachmentName,
          leaveType: existing.leaveType,
        };
      } else {
        newState[student.id] = {
          status: 'Hadir',
          note: '',
        };
      }
    });
    setAttendanceState(newState);
  }, [currentDate, scopedStudents, recordsMap]);

  // Function to calculate how many consecutive days a student has been sick
  const getConsecutiveSickDays = (studentId: string, baseDateStr: string): number => {
    let count = 1;
    const check = parseISODate(baseDateStr);

    for (let i = 0; i < 14; i++) {
      check.setDate(check.getDate() - 1);
      const dateStr = formatDateToISO(check);
      const past = records.find((r) => r.studentId === studentId && r.date === dateStr);
      if (past && past.status === 'Sakit') {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  // Counts for today
  const stats = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    scopedStudents.forEach((s) => {
      const item = attendanceState[s.id];
      if (!item) return;
      if (item.status === 'Hadir') hadir++;
      else if (item.status === 'Sakit') sakit++;
      else if (item.status === 'Izin') izin++;
      else if (item.status === 'Alpa') alpa++;
    });

    const total = scopedStudents.length;
    const recorded = hadir + sakit + izin + alpa;
    const rate = calculatePercentage(hadir, recorded);

    return { hadir, sakit, izin, alpa, total, rate };
  }, [scopedStudents, attendanceState]);

  // Handlers
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const current = prev[studentId] || { status: 'Hadir', note: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          status,
          // If switching to Sakit or Izin, auto suggest opening modal if needed
        },
      };
    });

    if (status === 'Sakit' || status === 'Izin') {
      const s = students.find((std) => std.id === studentId);
      if (s) {
        setModalStudent(s);
        setModalStatus(status);
      }
    }
  };

  const handleOpenEvidenceModal = (student: Student, status: 'Sakit' | 'Izin') => {
    setModalStudent(student);
    setModalStatus(status);
  };

  const handleSaveEvidence = (evidenceData: {
    attachmentType: 'skd' | LeaveEvidenceType;
    attachmentData?: string;
    attachmentName?: string;
    leaveType?: 'acara' | 'mendadak';
    note: string;
  }) => {
    if (!modalStudent) return;

    setAttendanceState((prev) => ({
      ...prev,
      [modalStudent.id]: {
        ...prev[modalStudent.id],
        status: modalStatus,
        note: evidenceData.note,
        attachmentType: evidenceData.attachmentType,
        attachmentData: evidenceData.attachmentData,
        attachmentName: evidenceData.attachmentName,
        leaveType: evidenceData.leaveType,
      },
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  const handleMarkAllHadir = () => {
    setAttendanceState((prev) => {
      const next = { ...prev };
      scopedStudents.forEach((s) => {
        next[s.id] = {
          status: 'Hadir',
          note: '',
        };
      });
      return next;
    });
  };

  const handleReset = () => {
    const newState: Record<string, WorkingItem> = {};
    scopedStudents.forEach((student) => {
      const existing = recordsMap.get(student.id);
      if (existing) {
        newState[student.id] = {
          status: existing.status,
          note: existing.note || '',
          attachmentType: existing.attachmentType,
          attachmentData: existing.attachmentData,
          attachmentName: existing.attachmentName,
          leaveType: existing.leaveType,
        };
      } else {
        newState[student.id] = {
          status: 'Hadir',
          note: '',
        };
      }
    });
    setAttendanceState(newState);
  };

  const handleSave = () => {
    const newRecords: AttendanceRecord[] = [];
    const timestamp = new Date().toISOString();

    scopedStudents.forEach((student) => {
      const item = attendanceState[student.id];
      if (item) {
        newRecords.push({
          id: `rec_${student.id}_${currentDate}`,
          studentId: student.id,
          classId: student.classId,
          date: currentDate,
          status: item.status,
          note: item.note ? item.note.trim() : undefined,
          recordedAt: timestamp,
          attachmentType: item.attachmentType,
          attachmentData: item.attachmentData,
          attachmentName: item.attachmentName,
          leaveType: item.leaveType,
          hasSKD: item.status === 'Sakit' && Boolean(item.attachmentData),
        });
      }
    });

    onSaveRecords(newRecords);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handleQuickDate = (offset: number) => {
    const current = parseISODate(currentDate);
    current.setDate(current.getDate() + offset);
    onDateChange(formatDateToISO(current));
  };

  const handleExportToday = () => {
    const summary = aggregateAttendance(scopedStudents, records, currentDate, currentDate, 'daily');
    const cMap: Record<string, string> = {};
    classes.forEach((c) => {
      cMap[c.id] = c.name;
    });

    exportAttendanceToExcel({
      summary,
      schoolProfile,
      className: scopeLabel,
      category: 'Harian',
      periodLabel: formatIndonesianDate(currentDate),
      classMap: cMap,
    });
  };

  // Filtered student list for search
  const filteredStudents = scopedStudents.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.nis.includes(term) ||
      s.nisn.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCheck className="w-5 h-5 text-emerald-200" />
          <div>
            <p className="font-bold text-sm">Data Presensi Berhasil Disimpan!</p>
            <p className="text-xs text-emerald-100">
              Presensi ({scopeLabel}) tanggal {formatIndonesianDate(currentDate, { short: true })} telah diperbarui beserta lampiran bukti SKD/Izin.
            </p>
          </div>
        </div>
      )}

      {/* Date & Header Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <Calendar className="w-3.5 h-3.5" />
                Presensi Harian Seluruh Siswa Sekolah
              </span>
              <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {scopeLabel}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              {formatIndonesianDate(currentDate)}
            </h2>
            <p className="text-xs text-slate-500">
              Ketentuan: Sakit &gt; 1 hari wajib upload Surat SKD Dokter. Izin wajib upload foto bukti acara / surat tertulis izin mendadak.
            </p>
          </div>

          {/* Date Picker Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => handleQuickDate(-1)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Hari Sebelumnya"
                aria-label="Kemarin"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
                aria-label="Pilih Tanggal Presensi"
              />
              <button
                onClick={() => handleQuickDate(1)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Hari Berikutnya"
                aria-label="Besok"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => onDateChange(formatDateToISO(new Date()))}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
            >
              Hari Ini
            </button>

            {scopedStudents.length > 0 && (
              <button
                onClick={handleExportToday}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-200"
                title="Unduh format Excel khusus hari ini"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel Hari Ini</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Siswa
            </span>
            <div className="text-xl font-bold text-slate-800 mt-0.5">
              {stats.total} <span className="text-xs font-normal text-slate-500">orang</span>
            </div>
          </div>

          <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Hadir (H)
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                {stats.rate}%
              </span>
            </div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              {stats.hadir}
            </div>
          </div>

          <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Sakit (S)
            </span>
            <div className="text-xl font-black text-amber-700 mt-0.5">
              {stats.sakit}
            </div>
          </div>

          <div className="bg-blue-50/80 rounded-xl p-3 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              Izin (I)
            </span>
            <div className="text-xl font-black text-blue-700 mt-0.5">
              {stats.izin}
            </div>
          </div>

          <div className="bg-rose-50/80 rounded-xl p-3 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Alpa (A)
            </span>
            <div className="text-xl font-black text-rose-700 mt-0.5">
              {stats.alpa}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
              Tingkat Hadir
            </span>
            <div className="text-xl font-black text-emerald-400">
              {stats.rate}%
            </div>
          </div>
        </div>
      </div>

      {/* Scope quick filter buttons */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs text-xs">
        <span className="font-bold text-slate-500 text-[11px] uppercase mr-1">
          Cakupan:
        </span>
        <button
          onClick={() => onSelectScope('all')}
          className={`px-3 py-1 rounded-lg font-bold transition ${
            selectedScope === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Seluruh Sekolah ({students.length})
        </button>
        <button
          onClick={() => onSelectScope('ikhwan')}
          className={`px-3 py-1 rounded-lg font-bold transition ${
            selectedScope === 'ikhwan'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          Semua Ikhwan
        </button>
        <button
          onClick={() => onSelectScope('akhwat')}
          className={`px-3 py-1 rounded-lg font-bold transition ${
            selectedScope === 'akhwat'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`}
        >
          Semua Akhwat
        </button>
        <button
          onClick={() => onSelectScope('grade_X')}
          className={`px-2.5 py-1 rounded-lg font-semibold transition ${
            selectedScope === 'grade_X' || selectedScope === 'grade_10' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tingkat X
        </button>
        <button
          onClick={() => onSelectScope('grade_XI')}
          className={`px-2.5 py-1 rounded-lg font-semibold transition ${
            selectedScope === 'grade_XI' || selectedScope === 'grade_11' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tingkat XI
        </button>
        <button
          onClick={() => onSelectScope('grade_XII')}
          className={`px-2.5 py-1 rounded-lg font-semibold transition ${
            selectedScope === 'grade_XII' || selectedScope === 'grade_12' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tingkat XII
        </button>
      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {scopedStudents.length > 0 && (
            <>
              <button
                onClick={handleMarkAllHadir}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tandai Semua Hadir</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                title="Kembalikan status awal hari ini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {scopedStudents.length > 0 && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-md hover:shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Simpan Presensi</span>
            </button>
          )}
        </div>
      </div>

      {/* Student List Table or Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Belum Ada Siswa Terdaftar
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Data lama telah dikosongkan. Silakan isi data siswa Anda sendiri dan tentukan kelasnya (tersedia 12 ruangan kelas 10, 11, 12 Ikhwan & Akhwat).
            </p>
            <button
              onClick={onNavigateToStudents}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md"
            >
              + Masukkan Data Siswa Sekarang
            </button>
          </div>
        ) : scopedStudents.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-500 text-xs">
            Tidak ada siswa terdaftar pada ruangan/kelompok ({scopeLabel}). Silakan tentukan siswa ke kelas ini di tab Master Siswa.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3 w-24">NIS</th>
                  <th className="py-3 px-4 min-w-[160px]">Nama Siswa</th>
                  <th className="py-3 px-2 w-12 text-center">L/P</th>
                  <th className="py-3 px-3 w-36">Ruangan Kelas</th>
                  <th className="py-3 px-4 w-72 text-center">Status Kehadiran</th>
                  <th className="py-3 px-4 min-w-[240px]">Bukti SKD / Keterangan Izin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada siswa ditemukan untuk kriteria pencarian ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const item = attendanceState[student.id] || { status: 'Hadir', note: '' };
                    const studentClass = classMap[student.classId];
                    const sickDays = item.status === 'Sakit' ? getConsecutiveSickDays(student.id, currentDate) : 1;
                    const isSickMoreThanOneDay = item.status === 'Sakit' && sickDays >= 2;

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          item.status === 'Alpa'
                            ? 'bg-rose-50/30'
                            : item.status === 'Sakit'
                            ? 'bg-amber-50/30'
                            : item.status === 'Izin'
                            ? 'bg-blue-50/30'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-700 font-bold">
                          {student.nis}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{student.name}</div>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              student.gender === 'L'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-pink-50 text-pink-700 border border-pink-200'
                            }`}
                          >
                            {student.gender}
                          </span>
                        </td>

                        {/* Assigned Class Room */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              studentClass?.category === 'Ikhwan'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {studentClass?.name || 'Belum Ditentukan'}
                          </span>
                        </td>

                        {/* Status Buttons */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
                            {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as AttendanceStatus[]).map((st) => {
                              const isSelected = item.status === st;
                              const config = STATUS_CONFIG[st];

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, st)}
                                  className={`flex-1 flex items-center justify-center gap-0.5 py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all ${
                                    isSelected
                                      ? `${config.bgLight} ${config.text} border ${config.border} shadow-sm font-extrabold scale-102`
                                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  <span>{config.code}</span>
                                  <span className="hidden sm:inline text-[10px] font-semibold">
                                    {st === 'Hadir' ? 'Hadir' : st === 'Sakit' ? 'Sakit' : st === 'Izin' ? 'Izin' : 'Alpa'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Evidence & Note Area */}
                        <td className="py-3 px-4">
                          {item.status === 'Sakit' ? (
                            <div className="space-y-1.5">
                              {/* SKD Alert & Upload Trigger */}
                              <div className="flex flex-wrap items-center gap-2">
                                {item.attachmentData ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEvidenceModal(student, 'Sakit')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                                  >
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>✓ SKD Terlampir</span>
                                    <span className="text-[10px] underline ml-1">Lihat</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEvidenceModal(student, 'Sakit')}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                      isSickMoreThanOneDay
                                        ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                        : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                    }`}
                                  >
                                    <Stethoscope className="w-3.5 h-3.5" />
                                    <span>
                                      {isSickMoreThanOneDay
                                        ? `⚠️ Wajib Upload SKD (Sakit ${sickDays} Hari)`
                                        : 'Upload Surat SKD'}
                                    </span>
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 italic">
                                {item.note || 'Sakit (Belum ada catatan)'}
                              </p>
                            </div>
                          ) : item.status === 'Izin' ? (
                            <div className="space-y-1.5">
                              {/* Izin Evidence Trigger */}
                              <div className="flex flex-wrap items-center gap-2">
                                {item.attachmentData ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEvidenceModal(student, 'Izin')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
                                  >
                                    <Check className="w-3 h-3 text-blue-600" />
                                    <span>
                                      {item.leaveType === 'acara'
                                        ? '✓ Foto Acara Terlampir'
                                        : '✓ Surat Tertulis Terlampir'}
                                    </span>
                                    <span className="text-[10px] underline ml-1">Lihat</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEvidenceModal(student, 'Izin')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100"
                                  >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span>Upload Bukti Acara / Surat</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 italic">
                                {item.note || 'Izin (Klik upload untuk memilih bukti)'}
                              </p>
                            </div>
                          ) : item.status === 'Alpa' ? (
                            <div className="flex items-center gap-1 text-[11px] text-rose-700 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Tanpa keterangan konfirmasi</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={item.note}
                              onChange={(e) => handleNoteChange(student.id, e.target.value)}
                              placeholder="Catatan opsional..."
                              className="w-full text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info & Bottom Save */}
        {scopedStudents.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span>
                Menampilkan {filteredStudents.length} dari {scopedStudents.length} siswa ({scopeLabel}).
              </span>
            </div>

            <button
              onClick={handleSave}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Simpan Presensi Hari Ini</span>
            </button>
          </div>
        )}
      </div>

      {/* Evidence Modal for SKD or Leave Evidence */}
      {modalStudent && (
        <EvidenceModal
          isOpen={Boolean(modalStudent)}
          onClose={() => setModalStudent(null)}
          student={modalStudent}
          status={modalStatus}
          consecutiveSickDays={getConsecutiveSickDays(modalStudent.id, currentDate)}
          initialData={attendanceState[modalStudent.id]}
          onSave={handleSaveEvidence}
        />
      )}
    </div>
  );
};
