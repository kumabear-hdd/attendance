import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Filter,
  Printer,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  AttendanceRecord,
  ClassRoom,
  ReportPeriod,
  SchoolProfile,
  Student,
} from '../types/attendance';
import {
  aggregateAttendance,
  exportAttendanceToExcel,
  formatDateToISO,
  formatIndonesianDate,
  getDateRangeForPeriod,
  parseISODate,
  STATUS_CONFIG,
} from '../utils/attendance';

interface AttendanceSummaryProps {
  currentDate: string;
  selectedScope: string;
  onSelectScope: (scope: string) => void;
  classes: ClassRoom[];
  students: Student[];
  records: AttendanceRecord[];
  schoolProfile: SchoolProfile;
  onNavigateToExport: () => void;
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({
  currentDate,
  selectedScope,
  onSelectScope,
  classes,
  students,
  records,
  schoolProfile,
  onNavigateToExport,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [baseDate, setBaseDate] = useState<string>(currentDate);
  const [customStart, setCustomStart] = useState<string>(
    formatDateToISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState<string>(currentDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_alpa' | 'has_sakit_izin' | 'below_85'>('all');

  const classMap = useMemo(() => {
    const map: Record<string, ClassRoom> = {};
    classes.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [classes]);

  // Filter students according to scope
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

  const scopeLabel = useMemo(() => {
    if (selectedScope === 'all') return 'Seluruh Siswa Sekolah';
    if (selectedScope === 'ikhwan') return 'Semua Siswa Ikhwan (Putra)';
    if (selectedScope === 'akhwat') return 'Semua Siswi Akhwat (Putri)';
    if (selectedScope === 'grade_X' || selectedScope === 'grade_10') return 'Tingkat X (Semua Ruangan)';
    if (selectedScope === 'grade_XI' || selectedScope === 'grade_11') return 'Tingkat XI (Semua Ruangan)';
    if (selectedScope === 'grade_XII' || selectedScope === 'grade_12') return 'Tingkat XII (Semua Ruangan)';
    return classMap[selectedScope]?.name || 'Kelas Terpilih';
  }, [selectedScope, classMap]);

  // Compute date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, baseDate, customStart, customEnd);
  }, [period, baseDate, customStart, customEnd]);

  // Compute aggregated summary
  const summary = useMemo(() => {
    return aggregateAttendance(
      scopedStudents,
      records,
      dateRange.startDate,
      dateRange.endDate,
      period
    );
  }, [scopedStudents, records, dateRange, period]);

  // Filtered students according to search and status filter
  const filteredSummaries = useMemo(() => {
    return summary.studentSummaries.filter((s) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        s.student.name.toLowerCase().includes(term) ||
        s.student.nis.includes(term) ||
        s.student.nisn.includes(term);

      if (!matchSearch) return false;

      if (statusFilter === 'has_alpa') {
        return s.alpa > 0;
      }
      if (statusFilter === 'has_sakit_izin') {
        return s.sakit > 0 || s.izin > 0;
      }
      if (statusFilter === 'below_85') {
        return s.percentage < 85;
      }
      return true;
    });
  }, [summary.studentSummaries, searchTerm, statusFilter]);

  // Students needing attention
  const studentsNeedAttention = useMemo(() => {
    return summary.studentSummaries
      .filter((s) => s.alpa >= 2 || s.percentage < 80)
      .sort((a, b) => b.alpa - a.alpa);
  }, [summary.studentSummaries]);

  const handleExportThisView = () => {
    const categoryMap: Record<ReportPeriod, 'Harian' | 'Mingguan' | 'Bulanan' | 'Semesteran'> = {
      daily: 'Harian',
      weekly: 'Mingguan',
      monthly: 'Bulanan',
      semester: 'Semesteran',
      custom: 'Bulanan',
    };

    const cMap: Record<string, string> = {};
    classes.forEach((c) => {
      cMap[c.id] = c.name;
    });

    exportAttendanceToExcel({
      summary,
      schoolProfile,
      className: scopeLabel,
      category: categoryMap[period],
      periodLabel: dateRange.label,
      classMap: cMap,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <TrendingUp className="w-3.5 h-3.5" />
                Rekapitulasi Kehadiran Sekolah
              </span>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
                {scopeLabel}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              {dateRange.label}
            </h2>
            <p className="text-xs text-slate-500">
              Analisis statistik kehadiran seluruh siswa sekolah (bukan per mapel), persentase keaktifan, dan matriks rekapitulasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak / PDF</span>
            </button>

            {scopedStudents.length > 0 && (
              <button
                onClick={handleExportThisView}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Unduh Excel Rekap Ini</span>
              </button>
            )}
          </div>
        </div>

        {/* Scope and Period Selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Periode:
            </span>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { id: 'daily', label: 'Harian' },
                  { id: 'weekly', label: 'Mingguan' },
                  { id: 'monthly', label: 'Bulanan' },
                  { id: 'semester', label: 'Semesteran' },
                  { id: 'custom', label: 'Rentang Kustom' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPeriod(item.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    period === item.id
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker controls based on selected period */}
          {period !== 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Tanggal Acuan:</span>
              <input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          )}

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Dari:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 text-slate-800"
              />
              <span className="text-xs text-slate-500 font-medium">Sampai:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 text-slate-800"
              />
            </div>
          )}
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
              <span>Kehadiran Kumulatif</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black tracking-tight text-white mt-2">
              {summary.overallAttendanceRate}%
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.overallAttendanceRate >= 90
                    ? 'bg-emerald-400'
                    : summary.overallAttendanceRate >= 75
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
                style={{ width: `${summary.overallAttendanceRate}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Target sekolah: <span className="text-emerald-400 font-bold">90.0%</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>TOTAL HADIR (H)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full">
              Hadir Masuk
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">
              {summary.totalHadir}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Presensi siswa hadir</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>TOTAL SAKIT (S)</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full">
              Sakit
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">
              {summary.totalSakit}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Surat dokter / ortu</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>TOTAL IZIN (I)</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full">
              Izin
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">
              {summary.totalIzin}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Acara keluarga / dinas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>TOTAL ALPA (A)</span>
            <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full">
              Tanpa Ket.
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600">
              {summary.totalAlpa}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Perlu tindak lanjut BK</p>
          </div>
        </div>
      </div>

      {/* Warning Alert if students have high Alpa */}
      {studentsNeedAttention.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 no-print">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900">
              Perhatian Guru / Wali Kelas: {studentsNeedAttention.length} Siswa Terdeteksi Memiliki Catatan Alpa atau Kehadiran &lt;80%
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {studentsNeedAttention.map((s) => (
                <span
                  key={s.student.id}
                  className="bg-white text-amber-900 border border-amber-300 px-2 py-1 rounded-lg font-medium inline-flex items-center gap-1.5"
                >
                  <span className="font-bold">{s.student.name}</span>
                  <span className="text-[10px] text-slate-500">({classMap[s.student.classId]?.name})</span>
                  <span className="bg-rose-100 text-rose-700 px-1 py-0.5 rounded text-[10px] font-bold">
                    {s.alpa} Alpa
                  </span>
                  <span className="text-slate-400">({s.percentage}%)</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Filter Data:</span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Siswa Terdata ({scopedStudents.length})</option>
            <option value="has_alpa">Hanya yang Pernah Alpa</option>
            <option value="has_sakit_izin">Hanya yang Sakit / Izin</option>
            <option value="below_85">Kehadiran &lt; 85%</option>
          </select>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari siswa atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print-only mb-6 text-center border-b pb-4">
        <h1 className="text-xl font-bold uppercase">{schoolProfile.schoolName}</h1>
        <p className="text-xs text-gray-600">{schoolProfile.address} | NPSN: {schoolProfile.npsn}</p>
        <h2 className="text-base font-bold mt-2">LAPORAN REKAPITULASI PRESENSI HARIAN SISWA SEKOLAH</h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>Cakupan: {scopeLabel}</span>
          <span>Periode: {dateRange.label}</span>
          <span>Tahun Ajaran: {schoolProfile.academicYear} ({schoolProfile.semester})</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {scopedStudents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Belum ada siswa dalam cakupan ini. Silakan tambahkan siswa di tab Master Siswa & Kelas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 w-20">NIS</th>
                  <th className="py-3 px-4 min-w-[170px]">Nama Siswa</th>
                  <th className="py-3 px-2 w-10 text-center">L/P</th>
                  <th className="py-3 px-3 min-w-[130px]">Kelas</th>

                  {(period === 'weekly' || (period === 'monthly' && summary.datesInRange.length <= 31)) &&
                    summary.datesInRange.map((d) => {
                      const parsed = parseISODate(d);
                      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                      return (
                        <th
                          key={d}
                          className="py-2 px-1 text-center font-mono min-w-[32px] border-l border-slate-200/60"
                          title={formatIndonesianDate(d)}
                        >
                          <div className="text-[9px] text-slate-400 font-normal">
                            {days[parsed.getDay()]}
                          </div>
                          <div className="text-[10px] text-slate-700">
                            {parsed.getDate()}
                          </div>
                        </th>
                      );
                    })}

                  <th className="py-3 px-2.5 text-center bg-emerald-50/50 text-emerald-800 w-12 border-l border-slate-200">
                    H
                  </th>
                  <th className="py-3 px-2.5 text-center bg-amber-50/50 text-amber-800 w-12">
                    S
                  </th>
                  <th className="py-3 px-2.5 text-center bg-blue-50/50 text-blue-800 w-12">
                    I
                  </th>
                  <th className="py-3 px-2.5 text-center bg-rose-50/50 text-rose-800 w-12">
                    A
                  </th>
                  <th className="py-3 px-3 text-center w-20">Total</th>
                  <th className="py-3 px-4 text-center w-28">% Kehadiran</th>
                  {period === 'semester' && (
                    <th className="py-3 px-4 text-center w-28">Predikat</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400">
                      Tidak ada siswa yang sesuai dengan filter atau kata kunci.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((s, idx) => {
                    const studentClass = classMap[s.student.classId];
                    let predikat = 'Sangat Baik (A)';
                    let predikatColor = 'bg-emerald-100 text-emerald-800';
                    if (s.percentage < 75) {
                      predikat = 'Kurang (D)';
                      predikatColor = 'bg-rose-100 text-rose-800';
                    } else if (s.percentage < 85) {
                      predikat = 'Cukup (C)';
                      predikatColor = 'bg-amber-100 text-amber-800';
                    } else if (s.percentage < 95) {
                      predikat = 'Baik (B)';
                      predikatColor = 'bg-blue-100 text-blue-800';
                    }

                    return (
                      <tr
                        key={s.student.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          s.alpa > 0 ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {s.student.nis}
                        </td>

                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {s.student.name}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              s.student.gender === 'L'
                                ? 'text-indigo-700 bg-indigo-50'
                                : 'text-pink-700 bg-pink-50'
                            }`}
                          >
                            {s.student.gender}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              studentClass?.category === 'Ikhwan'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {studentClass?.name || '-'}
                          </span>
                        </td>

                        {(period === 'weekly' || (period === 'monthly' && summary.datesInRange.length <= 31)) &&
                          summary.datesInRange.map((d) => {
                            const rec = s.recordsByDate[d];
                            if (!rec) {
                              return (
                                <td
                                  key={d}
                                  className="py-2 px-1 text-center font-mono text-slate-300 border-l border-slate-100"
                                >
                                  -
                                </td>
                              );
                            }
                            const config = STATUS_CONFIG[rec.status];
                            return (
                              <td
                                key={d}
                                className="py-2 px-1 text-center border-l border-slate-100"
                                title={`${formatIndonesianDate(d)}: ${rec.status} ${
                                  rec.note ? `(${rec.note})` : ''
                                }`}
                              >
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold ${
                                    rec.status === 'Hadir'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : rec.status === 'Sakit'
                                      ? 'bg-amber-100 text-amber-800 font-extrabold'
                                      : rec.status === 'Izin'
                                      ? 'bg-blue-100 text-blue-800 font-extrabold'
                                      : 'bg-rose-100 text-rose-800 font-black'
                                  }`}
                                >
                                  {config.code}
                                </span>
                              </td>
                            );
                          })}

                        <td className="py-2.5 px-2.5 text-center font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">
                          {s.hadir}
                        </td>

                        <td className="py-2.5 px-2.5 text-center font-bold text-amber-700 bg-amber-50/30">
                          {s.sakit}
                        </td>

                        <td className="py-2.5 px-2.5 text-center font-bold text-blue-700 bg-blue-50/30">
                          {s.izin}
                        </td>

                        <td className="py-2.5 px-2.5 text-center font-black text-rose-700 bg-rose-50/30">
                          {s.alpa}
                        </td>

                        <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                          {s.totalDays}
                        </td>

                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`font-mono font-bold text-xs ${
                              s.percentage >= 90
                                ? 'text-emerald-700'
                                : s.percentage >= 75
                                ? 'text-amber-700'
                                : 'text-rose-700 font-black'
                            }`}
                          >
                            {s.percentage}%
                          </span>
                        </td>

                        {period === 'semester' && (
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${predikatColor}`}>
                              {predikat}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100/90 font-bold text-xs border-t border-slate-300 text-slate-800">
                <tr>
                  <td
                    colSpan={
                      5 +
                      (period === 'weekly' || (period === 'monthly' && summary.datesInRange.length <= 31)
                        ? summary.datesInRange.length
                        : 0)
                    }
                    className="py-3 px-4 text-right uppercase tracking-wider text-[11px]"
                  >
                    Total Akumulasi ({scopeLabel}):
                  </td>
                  <td className="py-3 px-2 text-center text-emerald-800 bg-emerald-100/60 border-l border-slate-300">
                    {summary.totalHadir}
                  </td>
                  <td className="py-3 px-2 text-center text-amber-800 bg-amber-100/60">
                    {summary.totalSakit}
                  </td>
                  <td className="py-3 px-2 text-center text-blue-800 bg-blue-100/60">
                    {summary.totalIzin}
                  </td>
                  <td className="py-3 px-2 text-center text-rose-800 bg-rose-100/60">
                    {summary.totalAlpa}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {summary.totalHadir + summary.totalSakit + summary.totalIzin + summary.totalAlpa}
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-800 font-black">
                    {summary.overallAttendanceRate}%
                  </td>
                  {period === 'semester' && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-500 text-[11px] uppercase">
              Kode Status:
            </span>
            <span className="font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              H = Hadir
            </span>
            <span className="font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              S = Sakit
            </span>
            <span className="font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
              I = Izin
            </span>
            <span className="font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
              A = Alpa
            </span>
          </div>

          <button
            onClick={onNavigateToExport}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Laporan Excel Lengkap &rarr;</span>
          </button>
        </div>
      </div>

      {/* Lembar Pengesahan Resmi 4 Pejabat (Kepsek, Kesiswaan, Walas Ikhwan, Walas Akhwat) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm print:break-inside-avoid">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Lembar Pengesahan Rekapitulasi Presensi Sekolah ({scopeLabel}):
          </h4>
          <span className="text-[11px] text-slate-400">
            Disahkan oleh 4 Pejabat Sekolah (SOP SIM Pendidikan)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center text-xs">
          {/* 1. Kepala Sekolah */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800">Mengetahui / Mengesahkan:</p>
              <p className="font-bold text-slate-800 text-xs mt-0.5">Kepala Sekolah</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 underline decoration-slate-400">{schoolProfile.principalName}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {schoolProfile.principalNip}</p>
            </div>
          </div>

          {/* 2. Waka Kesiswaan */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-800">Diverifikasi Oleh:</p>
              <p className="font-bold text-slate-800 text-xs mt-0.5">Waka Kesiswaan</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 underline decoration-slate-400">{schoolProfile.kesiswaanName || 'Ust. Muhammad Salman, S.Pd.'}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {schoolProfile.kesiswaanNip || '-'}</p>
            </div>
          </div>

          {/* 3. Walas Ikhwan */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] uppercase font-bold text-sky-800">Disusun Oleh (Putra):</p>
              <p className="font-bold text-slate-800 text-xs mt-0.5">Wali Kelas / Koordinator Ikhwan</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 underline decoration-slate-400">{schoolProfile.walasIkhwanName || 'Ust. Abdullah Fatih, S.Pd.I'}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {schoolProfile.walasIkhwanNip || '-'}</p>
            </div>
          </div>

          {/* 4. Walas Akhwat */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] uppercase font-bold text-rose-800">Disusun Oleh (Putri):</p>
              <p className="font-bold text-slate-800 text-xs mt-0.5">Wali Kelas / Koordinator Akhwat</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 underline decoration-slate-400">{schoolProfile.walasAkhwatName || 'Usth. Maryam Salsabila, S.Si.'}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {schoolProfile.walasAkhwatNip || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
