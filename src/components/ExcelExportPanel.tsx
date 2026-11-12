import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Clipboard,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Printer,
  School,
  Search,
  Sliders,
  Sparkles,
  Users,
  ZoomIn,
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
  calculatePercentage,
  exportAttendanceToExcel,
  formatDateToISO,
  formatIndonesianDate,
  getDateRangeForPeriod,
  parseISODate,
  STATUS_CONFIG,
} from '../utils/attendance';

interface ExcelExportPanelProps {
  currentDate: string;
  selectedScope: string;
  onSelectScope: (scope: string) => void;
  classes: ClassRoom[];
  students: Student[];
  records: AttendanceRecord[];
  schoolProfile: SchoolProfile;
  onUpdateSchoolProfile: (profile: SchoolProfile) => void;
}

export const ExcelExportPanel: React.FC<ExcelExportPanelProps> = ({
  currentDate,
  selectedScope,
  onSelectScope,
  classes,
  students,
  records,
  schoolProfile,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'Harian' | 'Mingguan' | 'Bulanan' | 'Semesteran'
  >('Bulanan');
  const [refDate, setRefDate] = useState<string>(currentDate);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportedFile, setLastExportedFile] = useState<string | null>(null);
  const [activeSheetTab, setActiveSheetTab] = useState<'main' | 'stats' | 'profile'>('main');
  const [sheetSearch, setSheetSearch] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const classMap = useMemo(() => {
    const map: Record<string, ClassRoom> = {};
    classes.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [classes]);

  // Filter students based on selected export scope
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

  const periodType: ReportPeriod = useMemo(() => {
    switch (selectedCategory) {
      case 'Harian':
        return 'daily';
      case 'Mingguan':
        return 'weekly';
      case 'Bulanan':
        return 'monthly';
      case 'Semesteran':
        return 'semester';
    }
  }, [selectedCategory]);

  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(periodType, refDate);
  }, [periodType, refDate]);

  const summary = useMemo(() => {
    return aggregateAttendance(
      scopedStudents,
      records,
      dateRange.startDate,
      dateRange.endDate,
      periodType
    );
  }, [scopedStudents, records, dateRange, periodType]);

  const expectedFileName = useMemo(() => {
    const safeScope = scopeLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCat = selectedCategory.toLowerCase();
    const today = formatDateToISO(new Date());
    return `Laporan_Absensi_${safeCat}_${safeScope}_${today}.xlsx`;
  }, [scopeLabel, selectedCategory]);

  // Filtered student summaries for spreadsheet table search
  const filteredStudentSummaries = useMemo(() => {
    if (!sheetSearch.trim()) return summary.studentSummaries;
    const q = sheetSearch.toLowerCase();
    return summary.studentSummaries.filter(
      (s) =>
        s.student.name.toLowerCase().includes(q) ||
        s.student.nis.toLowerCase().includes(q) ||
        (classMap[s.student.classId]?.name || '').toLowerCase().includes(q)
    );
  }, [summary.studentSummaries, sheetSearch, classMap]);

  const handleExecuteExport = (categoryToExport?: 'Harian' | 'Mingguan' | 'Bulanan' | 'Semesteran') => {
    const cat = categoryToExport || selectedCategory;
    setIsExporting(true);

    setTimeout(() => {
      let p: ReportPeriod = 'monthly';
      if (cat === 'Harian') p = 'daily';
      if (cat === 'Mingguan') p = 'weekly';
      if (cat === 'Semesteran') p = 'semester';

      const range = getDateRangeForPeriod(p, refDate);
      const summ = aggregateAttendance(scopedStudents, records, range.startDate, range.endDate, p);

      const cMap: Record<string, string> = {};
      classes.forEach((c) => {
        cMap[c.id] = c.name;
      });

      exportAttendanceToExcel({
        summary: summ,
        schoolProfile,
        className: scopeLabel,
        category: cat,
        periodLabel: range.label,
        classMap: cMap,
      });

      setIsExporting(false);
      setLastExportedFile(expectedFileName);
    }, 400);
  };

  const handleCopyTSV = () => {
    let tsv = '';
    if (selectedCategory === 'Harian') {
      tsv += 'No\tNIS\tNISN\tNama Siswa\tL/P\tKelas\tStatus Kehadiran\tKeterangan\n';
      filteredStudentSummaries.forEach((s, idx) => {
        const rec = s.recordsByDate[summary.startDate];
        tsv += `${idx + 1}\t${s.student.nis}\t${s.student.nisn}\t${s.student.name}\t${s.student.gender}\t${classMap[s.student.classId]?.name || s.student.classId}\t${rec?.status || '-'}\t${rec?.note || '-'}\n`;
      });
    } else {
      tsv += 'No\tNIS\tNama Siswa\tL/P\tKelas\tHadir\tSakit\tIzin\tAlpa\tTotal Hari\t% Kehadiran\n';
      filteredStudentSummaries.forEach((s, idx) => {
        tsv += `${idx + 1}\t${s.student.nis}\t${s.student.name}\t${s.student.gender}\t${classMap[s.student.classId]?.name || s.student.classId}\t${s.hadir}\t${s.sakit}\t${s.izin}\t${s.alpa}\t${s.totalDays}\t${s.percentage}%\n`;
      });
    }

    navigator.clipboard.writeText(tsv).then(() => {
      setCopyToast('Data tabel berhasil disalin ke clipboard! Anda dapat langsung menempelkannya (Ctrl+V) ke Excel atau Google Sheets.');
      setTimeout(() => setCopyToast(null), 4000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Stats for Sheet 2
  const gradeStats = useMemo(() => {
    return ['X', 'XI', 'XII'].map((g) => {
      const studentsInGrade = summary.studentSummaries.filter((s) => {
        const c = classMap[s.student.classId]?.name || '';
        return c.includes(g) || s.student.classId.includes(g);
      });
      const totalG = studentsInGrade.length;
      const hadirG = studentsInGrade.reduce((acc, s) => acc + s.hadir, 0);
      const sakitG = studentsInGrade.reduce((acc, s) => acc + s.sakit, 0);
      const izinG = studentsInGrade.reduce((acc, s) => acc + s.izin, 0);
      const alpaG = studentsInGrade.reduce((acc, s) => acc + s.alpa, 0);
      const grandG = hadirG + sakitG + izinG + alpaG;
      const rateG = calculatePercentage(hadirG, grandG);
      return { grade: g, total: totalG, hadir: hadirG, sakit: sakitG, izin: izinG, alpa: alpaG, rate: rateG };
    });
  }, [summary.studentSummaries, classMap]);

  const genderStats = useMemo(() => {
    const ikhwan = summary.studentSummaries.filter((s) => s.student.gender === 'L');
    const akhwat = summary.studentSummaries.filter((s) => s.student.gender === 'P');

    const ikhwanHadir = ikhwan.reduce((a, s) => a + s.hadir, 0);
    const ikhwanSakit = ikhwan.reduce((a, s) => a + s.sakit, 0);
    const ikhwanIzin = ikhwan.reduce((a, s) => a + s.izin, 0);
    const ikhwanAlpa = ikhwan.reduce((a, s) => a + s.alpa, 0);
    const ikhwanRate = calculatePercentage(ikhwanHadir, ikhwanHadir + ikhwanSakit + ikhwanIzin + ikhwanAlpa);

    const akhwatHadir = akhwat.reduce((a, s) => a + s.hadir, 0);
    const akhwatSakit = akhwat.reduce((a, s) => a + s.sakit, 0);
    const akhwatIzin = akhwat.reduce((a, s) => a + s.izin, 0);
    const akhwatAlpa = akhwat.reduce((a, s) => a + s.alpa, 0);
    const akhwatRate = calculatePercentage(akhwatHadir, akhwatHadir + akhwatSakit + akhwatIzin + akhwatAlpa);

    return {
      ikhwan: { total: ikhwan.length, hadir: ikhwanHadir, sakit: ikhwanSakit, izin: ikhwanIzin, alpa: ikhwanAlpa, rate: ikhwanRate },
      akhwat: { total: akhwat.length, hadir: akhwatHadir, sakit: akhwatSakit, izin: akhwatIzin, alpa: akhwatAlpa, rate: akhwatRate },
    };
  }, [summary.studentSummaries]);

  // Column letters helper (A, B, C...)
  const getColLetter = (index: number): string => {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {copyToast && (
        <div className="p-3.5 bg-emerald-700 text-white text-xs rounded-xl shadow-lg flex items-center justify-between border border-emerald-600 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{copyToast}</span>
          </div>
          <button onClick={() => setCopyToast(null)} className="text-white hover:text-emerald-200 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-800/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/80 px-3 py-1 rounded-full border border-emerald-700/50 mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              Sistem Ekspor & Spreadsheet Resmi Lembaga Pendidikan
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Studio Spreadsheet & Ekspor Excel (.xlsx) Formal
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Didesain khusus untuk administrasi lembaga formal, madrasah, dan sekolah terpadu. Dilengkapi kop surat resmi, pemisah garis ganda, multi-sheet (Laporan Utama, Analisis & Statistik, Profil & Regulasi), serta lembar pengesahan sah 4 pejabat.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
            <button
              onClick={() => handleExecuteExport(selectedCategory)}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 rounded-xl transition shadow-lg shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>{isExporting ? 'Memproses File...' : `Unduh Excel (.xlsx)`}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 active:scale-98 rounded-xl transition border border-white/10 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-200" />
              <span>Cetak A4</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards for the 4 Mandatory Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            4 Kategori Format Laporan Administrasi Sekolah:
          </h3>
          <span className="text-[11px] text-slate-500">
            Pilih format untuk melihat pratinjau spreadsheet dan mengunduh file
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Laporan Harian */}
          <div
            onClick={() => setSelectedCategory('Harian')}
            className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
              selectedCategory === 'Harian'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Kategori 1
              </span>
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-2">
              Laporan Harian
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Buku presensi harian per tanggal kalender dengan status H/S/I/A dan rincian SKD Dokter / bukti izin.
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Periode: 1 Hari</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                Pilih Format &rarr;
              </span>
            </div>
          </div>

          {/* 2. Laporan Mingguan */}
          <div
            onClick={() => setSelectedCategory('Mingguan')}
            className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
              selectedCategory === 'Mingguan'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                Kategori 2
              </span>
              <Calendar className="w-4 h-4 text-teal-600" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-2">
              Laporan Mingguan
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Matriks kehadiran Senin s/d Sabtu dengan kode status, jumlah hari aktif, dan persentase kehadiran mingguan.
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Periode: 1 Pekan</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                Pilih Format &rarr;
              </span>
            </div>
          </div>

          {/* 3. Laporan Bulanan */}
          <div
            onClick={() => setSelectedCategory('Bulanan')}
            className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
              selectedCategory === 'Bulanan'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                Kategori 3
              </span>
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-2">
              Laporan Bulanan
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Buku presensi bulanan resmi sekolah per tanggal kalender, akumulasi H/S/I/A, dan analisis persentase.
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Periode: 1 Bulan</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                Pilih Format &rarr;
              </span>
            </div>
          </div>

          {/* 4. Laporan Semesteran */}
          <div
            onClick={() => setSelectedCategory('Semesteran')}
            className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
              selectedCategory === 'Semesteran'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                Kategori 4
              </span>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-2">
              Laporan Semesteran
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Rekapitulasi kumulatif satu semester penuh untuk buku induk raport siswa, predikat disiplin, dan pengesahan sekolah.
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Periode: 1 Semester</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                Pilih Format &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration & Parameter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-500 block mb-1">
              Cakupan Siswa yang Diekspor:
            </label>
            <select
              value={selectedScope}
              onChange={(e) => onSelectScope(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Seluruh Siswa Sekolah ({students.length} Siswa)</option>
              <option value="ikhwan">Semua Siswa Ikhwan (Putra)</option>
              <option value="akhwat">Semua Siswi Akhwat (Putri)</option>
              <optgroup label="Per Tingkat:">
                <option value="grade_X">Tingkat X (Semua Ruangan)</option>
                <option value="grade_XI">Tingkat XI (Semua Ruangan)</option>
                <option value="grade_XII">Tingkat XII (Semua Ruangan)</option>
              </optgroup>
              <optgroup label="Ruangan Tingkat X:">
                {classes.filter((c) => c.grade === 'X' || c.grade === '10').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Ruangan Tingkat XI:">
                {classes.filter((c) => c.grade === 'XI' || c.grade === '11').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Ruangan Tingkat XII:">
                {classes.filter((c) => c.grade === 'XII' || c.grade === '12').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-500 block mb-1">
              Tanggal / Bulan Acuan:
            </label>
            <input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-500 block mb-1">
              Rentang Terhitung Otomatis:
            </label>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 font-bold text-emerald-800 truncate">
              {dateRange.label}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-500 block mb-1">
              Pencarian Cepat di Spreadsheet:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari siswa atau NIS..."
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SPREADSHEET STUDIO WORKSPACE (INTERACTIVE WORKBOOK) */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden">
        {/* Spreadsheet Studio Top Toolbar */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>XLSX WORKBOOK</span>
            </div>
            <span className="text-slate-400">|</span>
            <span className="font-semibold text-slate-700">
              {expectedFileName}
            </span>
            <span className="bg-slate-200 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded">
              {filteredStudentSummaries.length} baris
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTSV}
              title="Salin seluruh baris tabel agar bisa langsung di-paste ke Excel / Google Sheets"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Salin Data (TSV)</span>
            </button>

            <button
              onClick={handlePrint}
              title="Cetak langsung dengan format resmi A4"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak Resmi</span>
            </button>

            <button
              onClick={() => handleExecuteExport(selectedCategory)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isExporting ? 'Memproses...' : 'Unduh .xlsx'}</span>
            </button>
          </div>
        </div>

        {/* Sheet Tabs Bar (Just like Microsoft Excel & Google Sheets) */}
        <div className="bg-slate-200/90 border-b border-slate-300 px-2 pt-1.5 flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveSheetTab('main')}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer ${
              activeSheetTab === 'main'
                ? 'bg-white text-emerald-800 border-slate-300 border-b-white -mb-px shadow-xs'
                : 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${activeSheetTab === 'main' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>Sheet 1: Laporan Presensi ({selectedCategory})</span>
          </button>

          <button
            onClick={() => setActiveSheetTab('stats')}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer ${
              activeSheetTab === 'stats'
                ? 'bg-white text-emerald-800 border-slate-300 border-b-white -mb-px shadow-xs'
                : 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${activeSheetTab === 'stats' ? 'bg-teal-500' : 'bg-slate-400'}`} />
            <span>Sheet 2: Analisis & Statistik</span>
          </button>

          <button
            onClick={() => setActiveSheetTab('profile')}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer ${
              activeSheetTab === 'profile'
                ? 'bg-white text-emerald-800 border-slate-300 border-b-white -mb-px shadow-xs'
                : 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${activeSheetTab === 'profile' ? 'bg-indigo-500' : 'bg-slate-400'}`} />
            <span>Sheet 3: Profil & Regulasi Lembaga</span>
          </button>
        </div>

        {/* TAB 1: SHEET 1 (LAPORAN UTAMA DENGAN KOP SURAT DAN 4 TANDA TANGAN) */}
        {activeSheetTab === 'main' && (
          <div className="p-4 sm:p-6 bg-slate-50/50 overflow-x-auto">
            {/* The Document Canvas (Paper-like aesthetic) */}
            <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm font-sans text-slate-900">
              {/* KOP SURAT RESMI LEMBAGA FORMAL */}
              <div className="text-center pb-4 border-b-2 border-emerald-900 relative">
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                  MAJELIS PENDIDIKAN & PENGAJARAN SEKOLAH ISLAM TERPADU
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight uppercase">
                  {schoolProfile.schoolName}
                </h1>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  NPSN: <span className="font-mono">{schoolProfile.npsn}</span> | STATUS AKREDITASI: <span className="text-emerald-700">"A" (UNGGUL)</span> | TAHUN AJARAN: <span className="font-mono">{schoolProfile.academicYear}</span>
                </div>
                <div className="text-[11px] text-slate-500 italic mt-0.5">
                  Alamat: {schoolProfile.address} | Email: tatausaha@sekolah.sch.id | Dokumen Administrasi Resmi
                </div>
                {/* Formal Double Line (Garis Pembatas Kop Resmi) */}
                <div className="mt-3 pt-0.5 border-t border-slate-400"></div>
              </div>

              {/* Title Banner */}
              <div className="my-5 text-center">
                <div className="inline-block bg-emerald-900 text-white px-6 py-1.5 rounded-lg font-black text-xs sm:text-sm uppercase tracking-wider shadow-xs">
                  LAPORAN RESMI REKAPITULASI PRESENSI & KEDISIPLINAN SISWA - KATEGORI {selectedCategory.toUpperCase()}
                </div>
              </div>

              {/* Administrative Metadata Box (Tabel Informasi Dokumen) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-36 font-bold text-slate-600">Jenis Presensi:</span>
                    <span className="font-semibold text-slate-900">Presensi Harian Seluruh Siswa Sekolah</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 font-bold text-slate-600">Kategori Laporan:</span>
                    <span className="font-bold text-emerald-700">Laporan {selectedCategory}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 font-bold text-slate-600">Cakupan Siswa / Kelas:</span>
                    <span className="font-bold text-slate-900">{scopeLabel}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-36 font-bold text-slate-600">Tahun Ajaran / Sem:</span>
                    <span className="font-semibold text-slate-900">{schoolProfile.academicYear} / Semester {schoolProfile.semester}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 font-bold text-slate-600">Periode Kehadiran:</span>
                    <span className="font-bold text-slate-900">{dateRange.label}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 font-bold text-slate-600">Tanggal Cetak:</span>
                    <span className="font-mono text-slate-700">{formatIndonesianDate(formatDateToISO(new Date()))} WIB</span>
                  </div>
                </div>
              </div>

              {/* SPREADSHEET TABLE GRID WITH COLUMN LETTERS & ROW NUMBERS */}
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    {/* Excel Column Letters Row (A, B, C...) */}
                    <tr className="bg-slate-200 text-slate-500 font-mono text-[10px] border-b border-slate-300 select-none">
                      <th className="p-1 text-center w-8 bg-slate-300 border-r border-slate-300">#</th>
                      <th className="p-1 text-center border-r border-slate-300">A</th>
                      <th className="p-1 text-center border-r border-slate-300">B</th>
                      <th className="p-1 text-center border-r border-slate-300">C</th>
                      <th className="p-1 text-center border-r border-slate-300">D</th>
                      <th className="p-1 text-center border-r border-slate-300">E</th>
                      <th className="p-1 text-center border-r border-slate-300">F</th>
                      <th className="p-1 text-center border-r border-slate-300">G</th>
                      {selectedCategory === 'Semesteran' && (
                        <>
                          <th className="p-1 text-center border-r border-slate-300">H</th>
                          <th className="p-1 text-center border-r border-slate-300">I</th>
                          <th className="p-1 text-center border-r border-slate-300">J</th>
                          <th className="p-1 text-center border-r border-slate-300">K</th>
                          <th className="p-1 text-center">L</th>
                        </>
                      )}
                      {(selectedCategory === 'Mingguan' || selectedCategory === 'Bulanan') && (
                        <>
                          <th className="p-1 text-center border-r border-slate-300">H</th>
                          <th className="p-1 text-center border-r border-slate-300">I</th>
                          <th className="p-1 text-center border-r border-slate-300">J</th>
                          <th className="p-1 text-center border-r border-slate-300">K</th>
                          <th className="p-1 text-center">L</th>
                        </>
                      )}
                    </tr>

                    {/* Official Table Headers */}
                    <tr className="bg-emerald-950 text-white font-bold border-b border-emerald-900">
                      <th className="p-2 text-center w-8 bg-emerald-900 border-r border-emerald-800 text-[10px]">No</th>
                      <th className="p-2 text-center border-r border-emerald-800">No</th>
                      <th className="p-2 text-center border-r border-emerald-800">NIS</th>
                      <th className="p-2 text-left border-r border-emerald-800 min-w-[150px]">Nama Siswa</th>
                      <th className="p-2 text-center border-r border-emerald-800 w-10">L/P</th>
                      <th className="p-2 text-center border-r border-emerald-800">Ruangan Kelas</th>

                      {selectedCategory === 'Harian' && (
                        <>
                          <th className="p-2 text-center border-r border-emerald-800">Status Kehadiran</th>
                          <th className="p-2 text-left min-w-[180px]">Keterangan / Alasan</th>
                        </>
                      )}

                      {(selectedCategory === 'Mingguan' || selectedCategory === 'Bulanan') && (
                        <>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Hadir (H)</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Sakit (S)</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Izin (I)</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Alpa (A)</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-16">Total Hari</th>
                          <th className="p-2 text-center w-16">% Hadir</th>
                        </>
                      )}

                      {selectedCategory === 'Semesteran' && (
                        <>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Hadir</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Sakit</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Izin</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-12">Alpa</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-16">Hari Efektif</th>
                          <th className="p-2 text-center border-r border-emerald-800 w-16">% Hadir</th>
                          <th className="p-2 text-center w-24">Predikat</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudentSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400 bg-white">
                          Tidak ada data siswa yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredStudentSummaries.map((s, idx) => {
                        const isEven = idx % 2 === 0;
                        const rowClass = isEven ? 'bg-white' : 'bg-slate-50/70';
                        const rec = s.recordsByDate[summary.startDate];
                        const studentClass = classMap[s.student.classId]?.name || s.student.classId;

                        let predikat = 'Sangat Baik (A)';
                        if (s.percentage < 75) predikat = 'Kurang (D)';
                        else if (s.percentage < 85) predikat = 'Cukup (C)';
                        else if (s.percentage < 95) predikat = 'Baik (B)';

                        return (
                          <tr key={s.student.id} className={`${rowClass} border-b border-slate-200 hover:bg-emerald-50/40 transition`}>
                            {/* Row number index */}
                            <td className="p-1.5 text-center font-mono text-[10px] text-slate-400 bg-slate-100 border-r border-slate-200 select-none">
                              {idx + 14}
                            </td>

                            <td className="p-2 text-center border-r border-slate-200">{idx + 1}</td>
                            <td className="p-2 text-center font-mono font-medium text-slate-700 border-r border-slate-200">
                              {s.student.nis}
                            </td>
                            <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                              {s.student.name}
                            </td>
                            <td className="p-2 text-center border-r border-slate-200">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.student.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                {s.student.gender}
                              </span>
                            </td>
                            <td className="p-2 text-center font-medium text-slate-700 border-r border-slate-200">
                              {studentClass}
                            </td>

                            {selectedCategory === 'Harian' && (
                              <>
                                <td className="p-2 text-center border-r border-slate-200">
                                  {rec ? (
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${STATUS_CONFIG[rec.status]?.bgLight} ${STATUS_CONFIG[rec.status]?.text} border ${STATUS_CONFIG[rec.status]?.border}`}>
                                      {rec.status}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Belum Dicatat</span>
                                  )}
                                </td>
                                <td className="p-2 text-slate-600 truncate max-w-xs">
                                  {rec?.note || '-'}
                                </td>
                              </>
                            )}

                            {(selectedCategory === 'Mingguan' || selectedCategory === 'Bulanan') && (
                              <>
                                <td className="p-2 text-center font-mono font-bold text-emerald-700 border-r border-slate-200">{s.hadir}</td>
                                <td className="p-2 text-center font-mono text-amber-700 border-r border-slate-200">{s.sakit}</td>
                                <td className="p-2 text-center font-mono text-blue-700 border-r border-slate-200">{s.izin}</td>
                                <td className="p-2 text-center font-mono text-rose-700 border-r border-slate-200">{s.alpa}</td>
                                <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-200">{s.totalDays}</td>
                                <td className="p-2 text-center font-bold text-emerald-800">
                                  <span className={s.percentage < 85 ? 'text-amber-700' : 'text-emerald-700'}>
                                    {s.percentage}%
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedCategory === 'Semesteran' && (
                              <>
                                <td className="p-2 text-center font-mono font-bold text-emerald-700 border-r border-slate-200">{s.hadir}</td>
                                <td className="p-2 text-center font-mono text-amber-700 border-r border-slate-200">{s.sakit}</td>
                                <td className="p-2 text-center font-mono text-blue-700 border-r border-slate-200">{s.izin}</td>
                                <td className="p-2 text-center font-mono text-rose-700 border-r border-slate-200">{s.alpa}</td>
                                <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-200">{s.totalDays}</td>
                                <td className="p-2 text-center font-bold text-emerald-800 border-r border-slate-200">{s.percentage}%</td>
                                <td className="p-2 text-center font-semibold text-slate-800">{predikat}</td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}

                    {/* Official Total Row (Double Underline Standard) */}
                    <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-b-2 border-slate-400">
                      <td className="p-1.5 text-center font-mono text-[10px] text-slate-500 bg-slate-300 border-r border-slate-300">
                        Σ
                      </td>
                      <td colSpan={3} className="p-2 text-right pr-4 uppercase tracking-wider border-r border-slate-300">
                        TOTAL & RATA-RATA ({summary.totalStudents} Siswa)
                      </td>
                      <td colSpan={2} className="p-2 text-center border-r border-slate-300 text-slate-600">
                        Akumulasi Lembaga
                      </td>

                      {selectedCategory === 'Harian' && (
                        <>
                          <td className="p-2 text-center text-emerald-800 border-r border-slate-300">
                            {summary.overallAttendanceRate}% Hadir
                          </td>
                          <td className="p-2 text-slate-700">
                            H: {summary.totalHadir} | S: {summary.totalSakit} | I: {summary.totalIzin} | A: {summary.totalAlpa}
                          </td>
                        </>
                      )}

                      {(selectedCategory === 'Mingguan' || selectedCategory === 'Bulanan') && (
                        <>
                          <td className="p-2 text-center font-mono text-emerald-800 border-r border-slate-300">{summary.totalHadir}</td>
                          <td className="p-2 text-center font-mono text-amber-800 border-r border-slate-300">{summary.totalSakit}</td>
                          <td className="p-2 text-center font-mono text-blue-800 border-r border-slate-300">{summary.totalIzin}</td>
                          <td className="p-2 text-center font-mono text-rose-800 border-r border-slate-300">{summary.totalAlpa}</td>
                          <td className="p-2 text-center font-mono text-slate-800 border-r border-slate-300">{summary.totalDays}</td>
                          <td className="p-2 text-center font-black text-emerald-800">{summary.overallAttendanceRate}%</td>
                        </>
                      )}

                      {selectedCategory === 'Semesteran' && (
                        <>
                          <td className="p-2 text-center font-mono text-emerald-800 border-r border-slate-300">{summary.totalHadir}</td>
                          <td className="p-2 text-center font-mono text-amber-800 border-r border-slate-300">{summary.totalSakit}</td>
                          <td className="p-2 text-center font-mono text-blue-800 border-r border-slate-300">{summary.totalIzin}</td>
                          <td className="p-2 text-center font-mono text-rose-800 border-r border-slate-300">{summary.totalAlpa}</td>
                          <td className="p-2 text-center font-mono text-slate-800 border-r border-slate-300">{summary.totalDays}</td>
                          <td className="p-2 text-center font-black text-emerald-800 border-r border-slate-300">{summary.overallAttendanceRate}%</td>
                          <td className="p-2 text-center text-emerald-800">TERTIB</td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* STATISTICAL SUMMARY BOX */}
              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Ringkasan Statistik Kehadiran Lembaga Formal
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Siswa Aktif</span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">{summary.totalStudents}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Total Hadir (H)</span>
                    <span className="text-base font-black text-emerald-700 mt-0.5 block">{summary.totalHadir}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-amber-700 uppercase font-semibold block">Total Sakit (S)</span>
                    <span className="text-base font-black text-amber-700 mt-0.5 block">{summary.totalSakit}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-blue-700 uppercase font-semibold block">Total Izin (I)</span>
                    <span className="text-base font-black text-blue-700 mt-0.5 block">{summary.totalIzin}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] text-rose-700 uppercase font-semibold block">Total Alpa (A)</span>
                    <span className="text-base font-black text-rose-700 mt-0.5 block">{summary.totalAlpa}</span>
                  </div>
                  <div className="p-3 bg-emerald-100/70 rounded-lg border border-emerald-300 text-center">
                    <span className="text-[10px] text-emerald-900 uppercase font-bold block">Tingkat Disiplin</span>
                    <span className="text-base font-black text-emerald-900 mt-0.5 block">{summary.overallAttendanceRate}%</span>
                  </div>
                </div>
              </div>

              {/* LEMBAR PENGESAHAN 4 PEJABAT RESMI SEKOLAH */}
              <div className="mt-8 pt-6 border-t-2 border-slate-300">
                <div className="text-center mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    LEMBAR PENGESAHAN LAPORAN PRESENSI SISWA SEKOLAH
                  </h4>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                    Ditetapkan di: Jakarta | Pada Tanggal: {formatIndonesianDate(formatDateToISO(new Date()))}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Pejabat 1: Kepala Sekolah */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-center flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Mengetahui & Mengesahkan,</span>
                      <span className="font-bold text-slate-900 block mt-0.5">Kepala Sekolah</span>
                    </div>
                    <div className="my-6">
                      <div className="inline-block border border-dashed border-emerald-400 bg-emerald-50 text-[10px] text-emerald-800 font-semibold px-2 py-1 rounded">
                        Cap & Tanda Tangan Basah
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 underline underline-offset-2">
                        {schoolProfile.principalName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NIP. {schoolProfile.principalNip}
                      </p>
                    </div>
                  </div>

                  {/* Pejabat 2: Waka Kesiswaan */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-center flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Diverifikasi Oleh,</span>
                      <span className="font-bold text-slate-900 block mt-0.5">Waka Kesiswaan</span>
                    </div>
                    <div className="my-6">
                      <div className="inline-block border border-dashed border-indigo-400 bg-indigo-50 text-[10px] text-indigo-800 font-semibold px-2 py-1 rounded">
                        Paraf Verifikasi
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 underline underline-offset-2">
                        {schoolProfile.kesiswaanName || 'Ust. Muhammad Salman, S.Pd.'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NIP. {schoolProfile.kesiswaanNip || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Pejabat 3: Walas Ikhwan */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-center flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Disusun Oleh (Putra),</span>
                      <span className="font-bold text-slate-900 block mt-0.5">Walas / Koord. Ikhwan</span>
                    </div>
                    <div className="my-6">
                      <div className="inline-block border border-dashed border-sky-400 bg-sky-50 text-[10px] text-sky-800 font-semibold px-2 py-1 rounded">
                        Tanda Tangan Walas
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 underline underline-offset-2">
                        {schoolProfile.walasIkhwanName || 'Ust. Abdullah Fatih, S.Pd.I'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NIP. {schoolProfile.walasIkhwanNip || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Pejabat 4: Walas Akhwat */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-center flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Disusun Oleh (Putri),</span>
                      <span className="font-bold text-slate-900 block mt-0.5">Walas / Koord. Akhwat</span>
                    </div>
                    <div className="my-6">
                      <div className="inline-block border border-dashed border-rose-400 bg-rose-50 text-[10px] text-rose-800 font-semibold px-2 py-1 rounded">
                        Tanda Tangan Walas
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 underline underline-offset-2">
                        {schoolProfile.walasAkhwatName || 'Usth. Maryam Salsabila, S.Si.'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NIP. {schoolProfile.walasAkhwatNip || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHEET 2 (ANALISIS & STATISTIK DISTRIBUSI) */}
        {activeSheetTab === 'stats' && (
          <div className="p-6 bg-slate-50/50 space-y-6">
            <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm space-y-6">
              <div className="border-b pb-4">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
                  Sheet 2: Analisis & Statistik Distribusi Kehadiran
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Statistik Komparatif Lembaga: Per Tingkatan & Kelompok Gender
                </h3>
              </div>

              {/* Table 1: Per Grade */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  I. Rekapitulasi Berdasarkan Tingkat Kelas (X, XI, XII):
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-emerald-900 text-white font-bold">
                      <tr>
                        <th className="p-2.5">Tingkat Kelas</th>
                        <th className="p-2.5 text-center">Jumlah Siswa</th>
                        <th className="p-2.5 text-center">Hadir</th>
                        <th className="p-2.5 text-center">Sakit</th>
                        <th className="p-2.5 text-center">Izin</th>
                        <th className="p-2.5 text-center">Alpa</th>
                        <th className="p-2.5 text-center">% Kehadiran</th>
                        <th className="p-2.5 text-center">Kategori Disiplin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {gradeStats.map((g) => (
                        <tr key={g.grade} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">Tingkat {g} (Semua Ruangan)</td>
                          <td className="p-2.5 text-center font-mono">{g.total} siswa</td>
                          <td className="p-2.5 text-center font-mono text-emerald-700 font-bold">{g.hadir}</td>
                          <td className="p-2.5 text-center font-mono text-amber-700">{g.sakit}</td>
                          <td className="p-2.5 text-center font-mono text-blue-700">{g.izin}</td>
                          <td className="p-2.5 text-center font-mono text-rose-700 font-bold">{g.alpa}</td>
                          <td className="p-2.5 text-center font-bold text-emerald-800">{g.rate}%</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {g.rate >= 90 ? 'Sangat Baik' : g.rate >= 80 ? 'Baik' : 'Perlu Evaluasi'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Ikhwan vs Akhwat */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  II. Perbandingan Kelompok Gender (Ikhwan vs Akhwat):
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-teal-900 text-white font-bold">
                      <tr>
                        <th className="p-2.5">Kelompok Gender</th>
                        <th className="p-2.5 text-center">Jumlah Siswa</th>
                        <th className="p-2.5 text-center">Hadir</th>
                        <th className="p-2.5 text-center">Sakit</th>
                        <th className="p-2.5 text-center">Izin</th>
                        <th className="p-2.5 text-center">Alpa</th>
                        <th className="p-2.5 text-center">% Kehadiran</th>
                        <th className="p-2.5 text-center">Status Disiplin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-blue-900 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-600" />
                          Kelompok Ikhwan (Putra)
                        </td>
                        <td className="p-2.5 text-center font-mono">{genderStats.ikhwan.total} siswa</td>
                        <td className="p-2.5 text-center font-mono text-emerald-700 font-bold">{genderStats.ikhwan.hadir}</td>
                        <td className="p-2.5 text-center font-mono text-amber-700">{genderStats.ikhwan.sakit}</td>
                        <td className="p-2.5 text-center font-mono text-blue-700">{genderStats.ikhwan.izin}</td>
                        <td className="p-2.5 text-center font-mono text-rose-700 font-bold">{genderStats.ikhwan.alpa}</td>
                        <td className="p-2.5 text-center font-black text-emerald-800">{genderStats.ikhwan.rate}%</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            Tertib & Disiplin
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-rose-900 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-rose-600" />
                          Kelompok Akhwat (Putri)
                        </td>
                        <td className="p-2.5 text-center font-mono">{genderStats.akhwat.total} siswi</td>
                        <td className="p-2.5 text-center font-mono text-emerald-700 font-bold">{genderStats.akhwat.hadir}</td>
                        <td className="p-2.5 text-center font-mono text-amber-700">{genderStats.akhwat.sakit}</td>
                        <td className="p-2.5 text-center font-mono text-blue-700">{genderStats.akhwat.izin}</td>
                        <td className="p-2.5 text-center font-mono text-rose-700 font-bold">{genderStats.akhwat.alpa}</td>
                        <td className="p-2.5 text-center font-black text-emerald-800">{genderStats.akhwat.rate}%</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Tertib & Disiplin
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 3: Predicate Distribution */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  III. Distribusi Predikat Nilai Kehadiran Siswa:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[11px] font-bold text-emerald-800">Predikat A (&ge; 95%)</span>
                    <p className="text-xl font-black text-emerald-950 mt-1">
                      {summary.studentSummaries.filter((s) => s.percentage >= 95).length} <span className="text-xs font-normal text-slate-500">siswa</span>
                    </p>
                    <span className="text-[10px] text-emerald-700">Sangat Baik</span>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-[11px] font-bold text-blue-800">Predikat B (85% - 94%)</span>
                    <p className="text-xl font-black text-blue-950 mt-1">
                      {summary.studentSummaries.filter((s) => s.percentage >= 85 && s.percentage < 95).length} <span className="text-xs font-normal text-slate-500">siswa</span>
                    </p>
                    <span className="text-[10px] text-blue-700">Baik</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[11px] font-bold text-amber-800">Predikat C (75% - 84%)</span>
                    <p className="text-xl font-black text-amber-950 mt-1">
                      {summary.studentSummaries.filter((s) => s.percentage >= 75 && s.percentage < 85).length} <span className="text-xs font-normal text-slate-500">siswa</span>
                    </p>
                    <span className="text-[10px] text-amber-700">Cukup</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-[11px] font-bold text-rose-800">Predikat D (&lt; 75%)</span>
                    <p className="text-xl font-black text-rose-950 mt-1">
                      {summary.studentSummaries.filter((s) => s.percentage < 75).length} <span className="text-xs font-normal text-slate-500">siswa</span>
                    </p>
                    <span className="text-[10px] text-rose-700">Perhatian Khusus</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SHEET 3 (PROFIL & REGULASI LEMBAGA) */}
        {activeSheetTab === 'profile' && (
          <div className="p-6 bg-slate-50/50 space-y-6">
            <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm space-y-6 text-xs">
              <div className="border-b pb-4">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                  Sheet 3: Profil Lembaga, Legalitas & Ketentuan Presensi
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Satuan Pendidikan & Standar Operasional Presensi Resmi
                </h3>
              </div>

              {/* School Identity */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                  <School className="w-4 h-4 text-emerald-700" />
                  Identitas Satuan Pendidikan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nama Lembaga Formal</span>
                    <span className="font-bold text-slate-900">{schoolProfile.schoolName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">NPSN</span>
                    <span className="font-mono font-bold text-slate-900">{schoolProfile.npsn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Alamat Lengkap</span>
                    <span className="font-medium text-slate-800">{schoolProfile.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status Akreditasi</span>
                    <span className="font-bold text-emerald-800">Terakreditasi "A" (Unggul)</span>
                  </div>
                </div>
              </div>

              {/* Ketentuan Presensi Resmi */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <h4 className="font-bold text-emerald-950 text-sm mb-3 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  Ketentuan Resmi & Regulasi Presensi Siswa
                </h4>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-800">1.</span>
                    <span><strong>Jam Kedatangan:</strong> Siswa wajib hadir sebelum bel jam 07.15 WIB. Presensi dilakukan sekali setiap pagi untuk presensi harian seluruh sekolah.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-800">2.</span>
                    <span><strong>Ketentuan Sakit:</strong> Sakit lebih dari 1 hari <strong>wajib melampirkan & mengunggah Surat Keterangan Dokter (SKD)</strong> resmi.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-800">3.</span>
                    <span><strong>Ketentuan Izin:</strong> Izin acara keluarga wajib disertai <strong>bukti foto acara</strong>. Izin mendadak di sekolah menyertakan <strong>surat tertulis</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-800">4.</span>
                    <span><strong>Toleransi Alpa:</strong> Batas maksimal alpa tanpa keterangan adalah 3 hari per semester sebelum dilakukan pemanggilan orang tua/wali siswa.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-800">5.</span>
                    <span><strong>Syarat Raport & Kelulusan:</strong> Minimal persentase kehadiran 85% untuk memenuhi syarat kenaikan kelas dan penerbitan buku raport.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification after export */}
      {lastExportedFile && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">File Spreadsheet Excel Berhasil Diunduh!</p>
            <p className="text-emerald-800 mt-0.5">
              Nama file: <span className="font-mono font-bold">{lastExportedFile}</span>. Berisi 3 sheet lengkap: <strong>Laporan Presensi</strong>, <strong>Analisis & Statistik</strong>, dan <strong>Profil & Regulasi Lembaga</strong> dengan kop surat resmi dan 4 tanda tangan pengesahan.
            </p>
          </div>
          <button
            onClick={() => handleExecuteExport(selectedCategory)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
          >
            Unduh Lagi
          </button>
        </div>
      )}
    </div>
  );
};
