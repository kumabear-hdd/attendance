import XLSX from 'xlsx-js-style';
import {
  AttendanceRecord,
  AttendanceStatus,
  PeriodSummary,
  ReportPeriod,
  SchoolProfile,
  Student,
  StudentSummary,
} from '../types/attendance';

export const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    code: string;
    label: string;
    color: string;
    bgLight: string;
    border: string;
    text: string;
    badgeBg: string;
  }
> = {
  Hadir: {
    code: 'H',
    label: 'Hadir',
    color: '#10b981',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  Sakit: {
    code: 'S',
    label: 'Sakit',
    color: '#f59e0b',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  Izin: {
    code: 'I',
    label: 'Izin',
    color: '#3b82f6',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  Alpa: {
    code: 'A',
    label: 'Alpa (Tanpa Keterangan)',
    color: '#ef4444',
    bgLight: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
  },
};

/**
 * Format Date to ISO string YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD safely into a Date object at local midnight
 */
export function parseISODate(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

/**
 * Format date into Indonesian locale string: "Rabu, 11 November 2026"
 */
export function formatIndonesianDate(dateStr: string, options?: { withDay?: boolean; short?: boolean }): string {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const monthName = options?.short ? shortMonths[date.getMonth()] : months[date.getMonth()];
  const year = date.getFullYear();

  if (options?.withDay === false) {
    return `${dayNum} ${monthName} ${year}`;
  }
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

/**
 * Calculate attendance percentage safely rounded to 1 decimal place
 */
export function calculatePercentage(hadir: number, total: number): number {
  if (total <= 0) return 0;
  const val = (hadir / total) * 100;
  return Math.round(val * 10) / 10;
}

/**
 * Generate dates range array between two ISO dates (inclusive)
 */
export function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = parseISODate(startDate);
  const end = parseISODate(endDate);

  while (current <= end) {
    // Exclude Sunday (0) if you wish, or include all school days (Mon-Sat, 1-6)
    // In Indonesian schools, Monday to Friday or Saturday are active days.
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) { // skip Sunday
      dates.push(formatDateToISO(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Get date range based on period selection
 */
export function getDateRangeForPeriod(
  period: ReportPeriod,
  baseDateStr: string,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const baseDate = parseISODate(baseDateStr);

  if (period === 'daily') {
    return {
      startDate: baseDateStr,
      endDate: baseDateStr,
      label: `Harian (${formatIndonesianDate(baseDateStr)})`,
    };
  }

  if (period === 'weekly') {
    // Current week: Monday to Saturday
    const day = baseDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // If Sunday, previous Monday
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const startStr = formatDateToISO(monday);
    const endStr = formatDateToISO(saturday);

    return {
      startDate: startStr,
      endDate: endStr,
      label: `Mingguan (${formatIndonesianDate(startStr, { withDay: false, short: true })} - ${formatIndonesianDate(endStr, { withDay: false, short: true })})`,
    };
  }

  if (period === 'monthly') {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startStr = formatDateToISO(firstDay);
    const endStr = formatDateToISO(lastDay);
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    return {
      startDate: startStr,
      endDate: endStr,
      label: `Bulanan (${monthNames[month]} ${year})`,
    };
  }

  if (period === 'semester') {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth(); // 0-11
    let startMonth = 6; // Juli (Ganjil: Jul-Des)
    let endMonth = 11;
    let semesterName = 'Ganjil';
    let semesterYear = `${year}/${year + 1}`;

    if (month < 6) {
      // Semester Genap: Januari - Juni
      startMonth = 0;
      endMonth = 5;
      semesterName = 'Genap';
      semesterYear = `${year - 1}/${year}`;
    }

    const firstDay = new Date(year, startMonth, 1);
    const lastDay = new Date(year, endMonth + 1, 0);

    return {
      startDate: formatDateToISO(firstDay),
      endDate: formatDateToISO(lastDay),
      label: `Semester ${semesterName} TP ${semesterYear}`,
    };
  }

  // Custom
  return {
    startDate: customStart || baseDateStr,
    endDate: customEnd || baseDateStr,
    label: `Kustom (${customStart || baseDateStr} s/d ${customEnd || baseDateStr})`,
  };
}

/**
 * Aggregates attendance statistics for a given list of students and date range
 */
export function aggregateAttendance(
  students: Student[],
  records: AttendanceRecord[],
  startDate: string,
  endDate: string,
  period: ReportPeriod
): PeriodSummary {
  // Collect all unique dates recorded in range, or generate business dates
  const datesInRange = getDatesBetween(startDate, endDate);

  // Filter records within range and matching students
  const studentIds = new Set(students.map((s) => s.id));
  const relevantRecords = records.filter(
    (r) => studentIds.has(r.studentId) && r.date >= startDate && r.date <= endDate
  );

  // Group records by student
  const recordsByStudent: Record<string, Record<string, { status: AttendanceStatus; note?: string }>> = {};
  students.forEach((s) => {
    recordsByStudent[s.id] = {};
  });

  relevantRecords.forEach((r) => {
    if (recordsByStudent[r.studentId]) {
      recordsByStudent[r.studentId][r.date] = {
        status: r.status,
        note: r.note,
      };
    }
  });

  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;

  const studentSummaries: StudentSummary[] = students.map((student) => {
    const studentRecords = recordsByStudent[student.id] || {};
    let sHadir = 0;
    let sSakit = 0;
    let sIzin = 0;
    let sAlpa = 0;

    Object.values(studentRecords).forEach((rec) => {
      if (rec.status === 'Hadir') sHadir++;
      else if (rec.status === 'Sakit') sSakit++;
      else if (rec.status === 'Izin') sIzin++;
      else if (rec.status === 'Alpa') sAlpa++;
    });

    const recordedDays = sHadir + sSakit + sIzin + sAlpa;
    const percentage = calculatePercentage(sHadir, recordedDays);

    totalHadir += sHadir;
    totalSakit += sSakit;
    totalIzin += sIzin;
    totalAlpa += sAlpa;

    return {
      student,
      hadir: sHadir,
      sakit: sSakit,
      izin: sIzin,
      alpa: sAlpa,
      totalDays: recordedDays,
      percentage,
      recordsByDate: studentRecords,
    };
  });

  const grandTotal = totalHadir + totalSakit + totalIzin + totalAlpa;
  const overallAttendanceRate = calculatePercentage(totalHadir, grandTotal);

  return {
    period,
    startDate,
    endDate,
    label: getDateRangeForPeriod(period, startDate, startDate, endDate).label,
    totalStudents: students.length,
    totalDays: datesInRange.length,
    overallAttendanceRate,
    totalHadir,
    totalSakit,
    totalIzin,
    totalAlpa,
    studentSummaries,
    datesInRange,
  };
}

/**
 * Membangun lembar pengesahan resmi 4 tanda tangan (Kepsek, Kesiswaan, Walas Ikhwan, Walas Akhwat)
 */
export function buildSignatureSection(schoolProfile: SchoolProfile): (string | number)[][] {
  const kepsekName = schoolProfile.principalName || '-';
  const kepsekNip = schoolProfile.principalNip || '-';
  const kesiswaanName = schoolProfile.kesiswaanName || 'Ust. Muhammad Salman, S.Pd.';
  const kesiswaanNip = schoolProfile.kesiswaanNip || '-';
  const walasIkhwanName = schoolProfile.walasIkhwanName || 'Ust. Abdullah Fatih, S.Pd.I';
  const walasIkhwanNip = schoolProfile.walasIkhwanNip || '-';
  const walasAkhwatName = schoolProfile.walasAkhwatName || 'Usth. Maryam Salsabila, S.Si.';
  const walasAkhwatNip = schoolProfile.walasAkhwatNip || '-';

  return [
    [],
    ['LEMBAR PENGESAHAN LAPORAN PRESENSI SISWA SEKOLAH'],
    [],
    ['Mengetahui / Mengesahkan:', '', 'Diverifikasi Oleh:', '', 'Disusun Oleh (Putra):', '', 'Disusun Oleh (Putri):'],
    ['Kepala Sekolah,', '', 'Waka Kesiswaan,', '', 'Wali Kelas / Koordinator Ikhwan,', '', 'Wali Kelas / Koordinator Akhwat,'],
    [],
    [],
    [],
    [kepsekName, '', kesiswaanName, '', walasIkhwanName, '', walasAkhwatName],
    [`NIP. ${kepsekNip}`, '', `NIP. ${kesiswaanNip}`, '', `NIP. ${walasIkhwanNip}`, '', `NIP. ${walasAkhwatNip}`],
  ];
}

/**
 * Ekspor Laporan Absensi ke Format Spreadsheet Excel (.xlsx) dengan SheetJS & xlsx-js-style
 * Menghasilkan file Excel berstandar lembaga formal, multi-sheet, ber-kop surat resmi,
 * dilengkapi lembar pengesahan 4 tanda tangan (Kepsek, Kesiswaan, Walas Ikhwan, Walas Akhwat),
 * serta lembar analisis statistik dan regulasi presensi.
 */
export function exportAttendanceToExcel(options: {
  summary: PeriodSummary;
  schoolProfile: SchoolProfile;
  className: string;
  category: 'Harian' | 'Mingguan' | 'Bulanan' | 'Semesteran';
  periodLabel: string;
  classMap?: Record<string, string>;
}): void {
  const { summary, schoolProfile, className, category, periodLabel, classMap = {} } = options;

  const wb = XLSX.utils.book_new();

  // Helper styles
  const BORDER_THIN = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const BORDER_DOUBLE_BOTTOM = {
    top: { style: 'thin', color: { rgb: '94A3B8' } },
    bottom: { style: 'double', color: { rgb: '0F172A' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const styleHeader = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
    fill: { fgColor: { rgb: '064E3B' } }, // Deep Forest Emerald
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER_THIN,
  };

  const styleSubHeader = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 9.5, name: 'Calibri' },
    fill: { fgColor: { rgb: '0F766E' } }, // Teal Accent
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER_THIN,
  };

  const styleKopYayasan = {
    font: { bold: true, sz: 9.5, color: { rgb: '475569' }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const styleKopSekolah = {
    font: { bold: true, sz: 16, color: { rgb: '064E3B' }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const styleKopNpsn = {
    font: { bold: true, sz: 9.5, color: { rgb: '1E293B' }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const styleKopAlamat = {
    font: { italic: true, sz: 8.5, color: { rgb: '64748B' }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const styleTitleBanner = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '065F46' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_THIN,
  };

  const styleMetaLabel = {
    font: { bold: true, sz: 9, color: { rgb: '1E293B' }, name: 'Calibri' },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: BORDER_THIN,
  };

  const styleMetaValue = {
    font: { sz: 9, color: { rgb: '0F172A' }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: BORDER_THIN,
  };

  const styleDataCenter = (isEven: boolean) => ({
    font: { sz: 9.5, color: { rgb: '1E293B' }, name: 'Calibri' },
    fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_THIN,
  });

  const styleDataLeft = (isEven: boolean) => ({
    font: { sz: 9.5, color: { rgb: '1E293B' }, name: 'Calibri' },
    fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFC' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: BORDER_THIN,
  });

  const styleDataBoldCenter = (isEven: boolean) => ({
    font: { bold: true, sz: 9.5, color: { rgb: '1E293B' }, name: 'Calibri' },
    fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_THIN,
  });

  const statusStyles: Record<string, any> = {
    Hadir: {
      font: { bold: true, color: { rgb: '166534' }, sz: 9.5, name: 'Calibri' },
      fill: { fgColor: { rgb: 'DCFCE7' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_THIN,
    },
    Sakit: {
      font: { bold: true, color: { rgb: '92400E' }, sz: 9.5, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FEF3C7' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_THIN,
    },
    Izin: {
      font: { bold: true, color: { rgb: '1E40AF' }, sz: 9.5, name: 'Calibri' },
      fill: { fgColor: { rgb: 'DBEAFE' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_THIN,
    },
    Alpa: {
      font: { bold: true, color: { rgb: '991B1B' }, sz: 9.5, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FEE2E2' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_THIN,
    },
  };

  const styleTotalCell = {
    font: { bold: true, sz: 9.5, color: { rgb: '0F172A' }, name: 'Calibri' },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_DOUBLE_BOTTOM,
  };

  const styleTotalLabel = {
    font: { bold: true, sz: 9.5, color: { rgb: '0F172A' }, name: 'Calibri' },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: BORDER_DOUBLE_BOTTOM,
  };

  // Safe cell setter
  const setCell = (ws: any, r: number, c: number, val: any, style?: any, type: string = 's') => {
    const ref = XLSX.utils.encode_cell({ r, c });
    ws[ref] = { v: val, t: typeof val === 'number' ? 'n' : type };
    if (style) {
      ws[ref].s = style;
    }
  };

  const nowFormatted = formatIndonesianDate(formatDateToISO(new Date()));

  // ==========================================
  // SHEET 1: LAPORAN UTAMA PRESENSI
  // ==========================================
  const sheetRows: (string | number)[][] = [];

  // Kop Surat (Rows 0-3)
  sheetRows.push(['MAJELIS PENDIDIKAN & PENGAJARAN SEKOLAH ISLAM TERPADU']);
  sheetRows.push([schoolProfile.schoolName.toUpperCase()]);
  sheetRows.push([`NPSN: ${schoolProfile.npsn} | STATUS AKREDITASI: "A" (UNGGUL) | TAHUN AJARAN: ${schoolProfile.academicYear}`]);
  sheetRows.push([`Alamat: ${schoolProfile.address} | Email: tatausaha@sekolah.sch.id | Dokumen Administrasi Resmi`]);
  sheetRows.push(['═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════']);
  sheetRows.push([]); // Row 5: spacer

  // Banner Title (Row 6)
  sheetRows.push([`LAPORAN RESMI REKAPITULASI PRESENSI & KEDISIPLINAN SISWA - KATEGORI ${category.toUpperCase()}`]);
  sheetRows.push([]); // Row 7: spacer

  // Metadata Box (Rows 8-11)
  sheetRows.push(['Jenis Presensi:', 'Presensi Harian Seluruh Siswa Sekolah (Bukan Per-Mapel)', '', 'Tahun Ajaran / Semester:', `${schoolProfile.academicYear} / ${schoolProfile.semester}`]);
  sheetRows.push(['Kategori Laporan:', `Laporan ${category}`, '', 'Cakupan Siswa / Kelas:', className]);
  sheetRows.push(['Periode Kehadiran:', periodLabel, '', 'Tanggal Cetak Dokumen:', `${nowFormatted} (Pukul ${new Date().toLocaleTimeString('id-ID')} WIB)`]);
  sheetRows.push(['Sifat Dokumen:', 'DOKUMEN RESMI TATA USAHA & KESISWAAN - BERSIFAT RESMI DAN MENGIKAT', '', 'Status Validasi:', 'TERVERIFIKASI SISTEM SI-HADIR']);
  sheetRows.push([]); // Row 12: spacer

  // Table Data based on category
  let tableHeaderRowIndex = sheetRows.length;
  let maxCols = 8;
  let dateHeaderCount = 0;

  if (category === 'Harian') {
    maxCols = 8;
    sheetRows.push(['No', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'Ruangan Kelas', 'Status Kehadiran', 'Keterangan / Alasan']);

    summary.studentSummaries.forEach((s, idx) => {
      const rec = s.recordsByDate[summary.startDate];
      const statusText = rec ? rec.status : 'Belum Dicatat';
      const noteText = rec?.note || '-';
      const studentClass = classMap[s.student.classId] || s.student.classId;
      sheetRows.push([
        idx + 1,
        s.student.nis,
        s.student.nisn || '-',
        s.student.name,
        s.student.gender,
        studentClass,
        statusText,
        noteText,
      ]);
    });

    // Total Row
    sheetRows.push([
      'TOTAL DATA SISWA',
      summary.totalStudents,
      '',
      `Hadir: ${summary.totalHadir} | Sakit: ${summary.totalSakit} | Izin: ${summary.totalIzin} | Alpa: ${summary.totalAlpa}`,
      '',
      '',
      `${summary.overallAttendanceRate}% Hadir`,
      summary.totalAlpa === 0 ? 'Disiplin Sangat Baik (Nol Alpa)' : `${summary.totalAlpa} Siswa Alpa`,
    ]);
  } else if (category === 'Mingguan' || category === 'Bulanan') {
    const dateHeaders = summary.datesInRange.map((d) => {
      const parsed = parseISODate(d);
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayShort = dayNames[parsed.getDay()];
      return `${dayShort}\n${parsed.getDate()}/${parsed.getMonth() + 1}`;
    });
    dateHeaderCount = dateHeaders.length;
    maxCols = 5 + dateHeaderCount + 6;

    sheetRows.push([
      'No',
      'NIS',
      'Nama Siswa',
      'L/P',
      'Ruangan Kelas',
      ...dateHeaders,
      'Hadir (H)',
      'Sakit (S)',
      'Izin (I)',
      'Alpa (A)',
      'Total Hari',
      '% Kehadiran',
    ]);

    summary.studentSummaries.forEach((s, idx) => {
      const dateCells = summary.datesInRange.map((d) => {
        const rec = s.recordsByDate[d];
        if (!rec) return '-';
        return STATUS_CONFIG[rec.status]?.code || rec.status[0];
      });
      const studentClass = classMap[s.student.classId] || s.student.classId;

      sheetRows.push([
        idx + 1,
        s.student.nis,
        s.student.name,
        s.student.gender,
        studentClass,
        ...dateCells,
        s.hadir,
        s.sakit,
        s.izin,
        s.alpa,
        s.totalDays,
        `${s.percentage}%`,
      ]);
    });

    // Total Row
    const dateFillers = summary.datesInRange.map(() => '-');
    sheetRows.push([
      'TOTAL & RATA-RATA',
      `${summary.totalStudents} Siswa`,
      'Akumulasi Keseluruhan Siswa',
      '',
      '',
      ...dateFillers,
      summary.totalHadir,
      summary.totalSakit,
      summary.totalIzin,
      summary.totalAlpa,
      summary.totalDays,
      `${summary.overallAttendanceRate}%`,
    ]);
  } else {
    // Semesteran
    maxCols = 13;
    sheetRows.push([
      'No',
      'NIS',
      'NISN',
      'Nama Siswa',
      'L/P',
      'Ruangan Kelas',
      'Hadir (Hari)',
      'Sakit (Hari)',
      'Izin (Hari)',
      'Alpa (Hari)',
      'Hari Efektif',
      '% Kehadiran',
      'Predikat Disiplin',
    ]);

    summary.studentSummaries.forEach((s, idx) => {
      let predikat = 'Sangat Baik (A)';
      if (s.percentage < 75) predikat = 'Perlu Perhatian (D)';
      else if (s.percentage < 85) predikat = 'Cukup (C)';
      else if (s.percentage < 95) predikat = 'Baik (B)';
      const studentClass = classMap[s.student.classId] || s.student.classId;

      sheetRows.push([
        idx + 1,
        s.student.nis,
        s.student.nisn || '-',
        s.student.name,
        s.student.gender,
        studentClass,
        s.hadir,
        s.sakit,
        s.izin,
        s.alpa,
        s.totalDays,
        `${s.percentage}%`,
        predikat,
      ]);
    });

    // Total Row
    sheetRows.push([
      'TOTAL REKAPITULASI',
      `${summary.totalStudents} Siswa`,
      '',
      'Akumulasi Seluruh Siswa Semester',
      '',
      '',
      summary.totalHadir,
      summary.totalSakit,
      summary.totalIzin,
      summary.totalAlpa,
      summary.totalDays,
      `${summary.overallAttendanceRate}%`,
      summary.overallAttendanceRate >= 90 ? 'Lembaga Sangat Tertib' : 'Tertib',
    ]);
  }

  // Summary Table Section
  sheetRows.push([]); // Spacer
  const summaryBoxStartRow = sheetRows.length;
  sheetRows.push(['RINGKASAN STATISTIK KEHADIRAN LEMBAGA']);
  sheetRows.push(['Parameter Kehadiran', 'Nilai / Jumlah', 'Keterangan Lembaga']);
  sheetRows.push(['Total Siswa Terdata:', summary.totalStudents, 'Siswa aktif terdaftar dalam sistem']);
  sheetRows.push(['Total Hari Efektif Belajar:', summary.totalDays, 'Hari kalender akademik terhitung']);
  sheetRows.push(['Total Kehadiran Siswa (Hadir):', summary.totalHadir, 'Jumlah kehadiran tercatat']);
  sheetRows.push(['Total Siswa Sakit (S):', summary.totalSakit, 'Sakit > 1 hari wajib upload SKD Dokter']);
  sheetRows.push(['Total Siswa Izin (I):', summary.totalIzin, 'Wajib upload bukti foto/surat izin']);
  sheetRows.push(['Total Siswa Alpa (A):', summary.totalAlpa, 'Tanpa keterangan resmi']);
  sheetRows.push(['Rata-Rata Tingkat Kehadiran:', `${summary.overallAttendanceRate}%`, summary.overallAttendanceRate >= 90 ? 'Memenuhi Standar Target Mutu Lembaga (>=90%)' : 'Di Bawah Standar Target Mutu']);
  sheetRows.push([]); // Spacer

  // 4 Official Signatures (Kepsek, Kesiswaan, Walas Ikhwan, Walas Akhwat)
  const sigStartRow = sheetRows.length;
  sheetRows.push(['LEMBAR PENGESAHAN LAPORAN PRESENSI SISWA SEKOLAH']);
  sheetRows.push([`Ditetapkan di: Jakarta | Pada Tanggal: ${nowFormatted}`]);
  sheetRows.push([]); // Spacer
  sheetRows.push(['Mengetahui / Mengesahkan:', '', 'Diverifikasi Oleh:', '', 'Disusun Oleh (Putra):', '', 'Disusun Oleh (Putri):']);
  sheetRows.push(['Kepala Sekolah,', '', 'Waka Kesiswaan,', '', 'Wali Kelas / Koordinator Ikhwan,', '', 'Wali Kelas / Koordinator Akhwat,']);
  sheetRows.push([]); // Signature space 1
  sheetRows.push([]); // Signature space 2
  sheetRows.push([]); // Signature space 3
  sheetRows.push([
    schoolProfile.principalName || 'Drs. H. Ahmad Fauzan, M.Pd.',
    '',
    schoolProfile.kesiswaanName || 'Ust. Muhammad Salman, S.Pd.',
    '',
    schoolProfile.walasIkhwanName || 'Ust. Abdullah Fatih, S.Pd.I',
    '',
    schoolProfile.walasAkhwatName || 'Usth. Maryam Salsabila, S.Si.',
  ]);
  sheetRows.push([
    `NIP. ${schoolProfile.principalNip || '-'}`,
    '',
    `NIP. ${schoolProfile.kesiswaanNip || '-'}`,
    '',
    `NIP. ${schoolProfile.walasIkhwanNip || '-'}`,
    '',
    `NIP. ${schoolProfile.walasAkhwatNip || '-'}`,
  ]);

  // Create primary worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);

  // Setup merges
  const merges: any[] = [
    // Kop Surat merges (Rows 0-4 across all columns)
    { s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: maxCols - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: maxCols - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: maxCols - 1 } },
    // Banner title
    { s: { r: 6, c: 0 }, e: { r: 6, c: maxCols - 1 } },
    // Metadata box merges
    { s: { r: 8, c: 1 }, e: { r: 8, c: 2 } },
    { s: { r: 8, c: 4 }, e: { r: 8, c: Math.max(4, maxCols - 1) } },
    { s: { r: 9, c: 1 }, e: { r: 9, c: 2 } },
    { s: { r: 9, c: 4 }, e: { r: 9, c: Math.max(4, maxCols - 1) } },
    { s: { r: 10, c: 1 }, e: { r: 10, c: 2 } },
    { s: { r: 10, c: 4 }, e: { r: 10, c: Math.max(4, maxCols - 1) } },
    { s: { r: 11, c: 1 }, e: { r: 11, c: 2 } },
    { s: { r: 11, c: 4 }, e: { r: 11, c: Math.max(4, maxCols - 1) } },
    // Summary box title
    { s: { r: summaryBoxStartRow, c: 0 }, e: { r: summaryBoxStartRow, c: 2 } },
    // Signature section title & date
    { s: { r: sigStartRow, c: 0 }, e: { r: sigStartRow, c: maxCols - 1 } },
    { s: { r: sigStartRow + 1, c: 0 }, e: { r: sigStartRow + 1, c: maxCols - 1 } },
  ];

  // Apply styling to Sheet 1 cells
  // 1. Kop Surat
  setCell(ws, 0, 0, sheetRows[0][0], styleKopYayasan);
  setCell(ws, 1, 0, sheetRows[1][0], styleKopSekolah);
  setCell(ws, 2, 0, sheetRows[2][0], styleKopNpsn);
  setCell(ws, 3, 0, sheetRows[3][0], styleKopAlamat);
  setCell(ws, 4, 0, '═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════', {
    font: { sz: 8, color: { rgb: '047857' } },
    alignment: { horizontal: 'center' },
  });

  // 2. Banner
  setCell(ws, 6, 0, sheetRows[6][0], styleTitleBanner);

  // 3. Metadata box
  for (let r = 8; r <= 11; r++) {
    const leftLabelRef = XLSX.utils.encode_cell({ r, c: 0 });
    const leftValRef = XLSX.utils.encode_cell({ r, c: 1 });
    const rightLabelRef = XLSX.utils.encode_cell({ r, c: 3 });
    const rightValRef = XLSX.utils.encode_cell({ r, c: 4 });
    if (ws[leftLabelRef]) ws[leftLabelRef].s = styleMetaLabel;
    if (ws[leftValRef]) ws[leftValRef].s = styleMetaValue;
    if (ws[rightLabelRef]) ws[rightLabelRef].s = styleMetaLabel;
    if (ws[rightValRef]) ws[rightValRef].s = styleMetaValue;
  }

  // 4. Table Header
  for (let c = 0; c < maxCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: tableHeaderRowIndex, c });
    if (ws[cellRef]) {
      ws[cellRef].s = styleHeader;
    }
  }

  // 5. Table Data Rows
  const dataRowCount = summary.studentSummaries.length;
  for (let idx = 0; idx < dataRowCount; idx++) {
    const r = tableHeaderRowIndex + 1 + idx;
    const isEven = idx % 2 === 0;

    for (let c = 0; c < maxCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;

      const val = ws[cellRef].v;

      // Status cells or specific columns
      if (category === 'Harian' && c === 6) {
        // Status column
        ws[cellRef].s = statusStyles[val] || styleDataBoldCenter(isEven);
      } else if ((category === 'Mingguan' || category === 'Bulanan') && c >= 5 && c < 5 + dateHeaderCount) {
        // Date matrix cells: H, S, I, A
        if (val === 'H') ws[cellRef].s = statusStyles['Hadir'];
        else if (val === 'S') ws[cellRef].s = statusStyles['Sakit'];
        else if (val === 'I') ws[cellRef].s = statusStyles['Izin'];
        else if (val === 'A') ws[cellRef].s = statusStyles['Alpa'];
        else ws[cellRef].s = styleDataCenter(isEven);
      } else if (c === 3 || (category === 'Harian' && c === 7)) {
        // Name or Notes: Left aligned
        ws[cellRef].s = styleDataLeft(isEven);
      } else if (c === 0 || c === 1 || c === 2 || c === 4 || c === 5) {
        // No, NIS, NISN, L/P, Kelas
        ws[cellRef].s = styleDataCenter(isEven);
      } else {
        // Summary numbers / percentage
        ws[cellRef].s = styleDataBoldCenter(isEven);
      }
    }
  }

  // 6. Total Row
  const totalRowIndex = tableHeaderRowIndex + 1 + dataRowCount;
  for (let c = 0; c < maxCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c });
    if (ws[cellRef]) {
      ws[cellRef].s = c === 0 ? styleTotalLabel : styleTotalCell;
    }
  }

  // 7. Summary Box Styling
  const summaryBoxTitleRef = XLSX.utils.encode_cell({ r: summaryBoxStartRow, c: 0 });
  if (ws[summaryBoxTitleRef]) {
    ws[summaryBoxTitleRef].s = {
      font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '064E3B' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: BORDER_THIN,
    };
  }
  for (let r = summaryBoxStartRow + 1; r <= summaryBoxStartRow + 8; r++) {
    for (let c = 0; c < 3; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: r === summaryBoxStartRow + 1 || c === 0, sz: 9, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: r % 2 === 0 ? 'F8FAFC' : 'FFFFFF' } },
          alignment: { horizontal: c === 1 ? 'center' : 'left', vertical: 'center' },
          border: BORDER_THIN,
        };
      }
    }
  }

  // 8. Signature Block Styling
  const sigTitleRef = XLSX.utils.encode_cell({ r: sigStartRow, c: 0 });
  const sigDateRef = XLSX.utils.encode_cell({ r: sigStartRow + 1, c: 0 });
  if (ws[sigTitleRef]) ws[sigTitleRef].s = { font: { bold: true, sz: 11, color: { rgb: '0F2942' } }, alignment: { horizontal: 'center' } };
  if (ws[sigDateRef]) ws[sigDateRef].s = { font: { italic: true, sz: 9, color: { rgb: '475569' } }, alignment: { horizontal: 'center' } };

  // Roles row (sigStartRow + 3 & + 4)
  for (let c = 0; c < maxCols; c++) {
    const cell1 = XLSX.utils.encode_cell({ r: sigStartRow + 3, c });
    const cell2 = XLSX.utils.encode_cell({ r: sigStartRow + 4, c });
    if (ws[cell1] && ws[cell1].v) ws[cell1].s = { font: { sz: 9, color: { rgb: '475569' } }, alignment: { horizontal: 'center' } };
    if (ws[cell2] && ws[cell2].v) ws[cell2].s = { font: { bold: true, sz: 9.5, color: { rgb: '1E293B' } }, alignment: { horizontal: 'center' } };
  }

  // Names row (sigStartRow + 8) & NIP row (sigStartRow + 9)
  for (let c = 0; c < maxCols; c++) {
    const nameCell = XLSX.utils.encode_cell({ r: sigStartRow + 8, c });
    const nipCell = XLSX.utils.encode_cell({ r: sigStartRow + 9, c });
    if (ws[nameCell] && ws[nameCell].v) {
      ws[nameCell].s = { font: { bold: true, sz: 10, color: { rgb: '0F172A' }, underline: true }, alignment: { horizontal: 'center' } };
    }
    if (ws[nipCell] && ws[nipCell].v) {
      ws[nipCell].s = { font: { sz: 9, color: { rgb: '475569' } }, alignment: { horizontal: 'center' } };
    }
  }

  // Column Widths
  if (category === 'Harian') {
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 16 },
      { wch: 34 },
      { wch: 6 },
      { wch: 18 },
      { wch: 18 },
      { wch: 38 },
    ];
  } else if (category === 'Mingguan' || category === 'Bulanan') {
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 32 },
      { wch: 6 },
      { wch: 18 },
      ...summary.datesInRange.map(() => ({ wch: 6.5 })),
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
    ];
  } else {
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 16 },
      { wch: 34 },
      { wch: 6 },
      { wch: 18 },
      { wch: 13 },
      { wch: 13 },
      { wch: 13 },
      { wch: 13 },
      { wch: 16 },
      { wch: 15 },
      { wch: 22 },
    ];
  }

  // Row Heights for spacing
  ws['!rows'] = [
    { hpt: 16 }, // Kop yayasan
    { hpt: 24 }, // Kop nama sekolah
    { hpt: 16 }, // Kop npsn
    { hpt: 16 }, // Kop alamat
    { hpt: 12 }, // Garis pemisah
    { hpt: 10 }, // Spacer
    { hpt: 26 }, // Title banner
    { hpt: 10 }, // Spacer
  ];

  ws['!merges'] = merges;
  XLSX.utils.book_append_sheet(wb, ws, `Presensi ${category}`);

  // ==========================================
  // SHEET 2: ANALISIS & STATISTIK DISTRIBUSI
  // ==========================================
  const statRows: (string | number)[][] = [
    ['ANALISIS STATISTIK & DISTRIBUSI KEHADIRAN SISWA SEKOLAH'],
    [schoolProfile.schoolName.toUpperCase()],
    [`Tahun Ajaran ${schoolProfile.academicYear} - Semester ${schoolProfile.semester} | Periode: ${periodLabel}`],
    [],
    ['I. REKAPITULASI BERDASARKAN TINGKAT KELAS'],
    ['Tingkat Kelas', 'Jumlah Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', '% Kehadiran', 'Kategori Kedisiplinan'],
  ];

  // Group by Grade
  const grades = ['X', 'XI', 'XII'];
  grades.forEach((g) => {
    const studentsInGrade = summary.studentSummaries.filter((s) => {
      const c = classMap[s.student.classId] || '';
      return c.includes(g) || s.student.classId.includes(g);
    });
    const totalG = studentsInGrade.length;
    const hadirG = studentsInGrade.reduce((acc, s) => acc + s.hadir, 0);
    const sakitG = studentsInGrade.reduce((acc, s) => acc + s.sakit, 0);
    const izinG = studentsInGrade.reduce((acc, s) => acc + s.izin, 0);
    const alpaG = studentsInGrade.reduce((acc, s) => acc + s.alpa, 0);
    const grandG = hadirG + sakitG + izinG + alpaG;
    const rateG = calculatePercentage(hadirG, grandG);

    statRows.push([
      `Tingkat ${g} (Semua Ruangan)`,
      totalG,
      hadirG,
      sakitG,
      izinG,
      alpaG,
      `${rateG}%`,
      rateG >= 90 ? 'Sangat Baik' : rateG >= 80 ? 'Baik' : 'Perlu Evaluasi',
    ]);
  });

  statRows.push([]);
  statRows.push(['II. REKAPITULASI BERDASARKAN KELOMPOK GENDER (IKHWAN & AKHWAT)']);
  statRows.push(['Kategori Kelompok', 'Jumlah Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', '% Kehadiran', 'Status Kedisiplinan']);

  const ikhwanStudents = summary.studentSummaries.filter((s) => s.student.gender === 'L');
  const akhwatStudents = summary.studentSummaries.filter((s) => s.student.gender === 'P');

  const ikhwanHadir = ikhwanStudents.reduce((a, s) => a + s.hadir, 0);
  const ikhwanSakit = ikhwanStudents.reduce((a, s) => a + s.sakit, 0);
  const ikhwanIzin = ikhwanStudents.reduce((a, s) => a + s.izin, 0);
  const ikhwanAlpa = ikhwanStudents.reduce((a, s) => a + s.alpa, 0);
  const ikhwanRate = calculatePercentage(ikhwanHadir, ikhwanHadir + ikhwanSakit + ikhwanIzin + ikhwanAlpa);

  const akhwatHadir = akhwatStudents.reduce((a, s) => a + s.hadir, 0);
  const akhwatSakit = akhwatStudents.reduce((a, s) => a + s.sakit, 0);
  const akhwatIzin = akhwatStudents.reduce((a, s) => a + s.izin, 0);
  const akhwatAlpa = akhwatStudents.reduce((a, s) => a + s.alpa, 0);
  const akhwatRate = calculatePercentage(akhwatHadir, akhwatHadir + akhwatSakit + akhwatIzin + akhwatAlpa);

  statRows.push([
    'Kelompok Ikhwan (Putra)',
    ikhwanStudents.length,
    ikhwanHadir,
    ikhwanSakit,
    ikhwanIzin,
    ikhwanAlpa,
    `${ikhwanRate}%`,
    ikhwanRate >= 90 ? 'Tertib & Disiplin' : 'Perlu Pembinaan',
  ]);
  statRows.push([
    'Kelompok Akhwat (Putri)',
    akhwatStudents.length,
    akhwatHadir,
    akhwatSakit,
    akhwatIzin,
    akhwatAlpa,
    `${akhwatRate}%`,
    akhwatRate >= 90 ? 'Tertib & Disiplin' : 'Perlu Pembinaan',
  ]);

  statRows.push([]);
  statRows.push(['III. DISTRIBUSI PREDIKAT KEHADIRAN SISWA']);
  statRows.push(['Predikat Nilai', 'Rentang Persentase', 'Jumlah Siswa', 'Persentase Populasi']);

  const countA = summary.studentSummaries.filter((s) => s.percentage >= 95).length;
  const countB = summary.studentSummaries.filter((s) => s.percentage >= 85 && s.percentage < 95).length;
  const countC = summary.studentSummaries.filter((s) => s.percentage >= 75 && s.percentage < 85).length;
  const countD = summary.studentSummaries.filter((s) => s.percentage < 75).length;

  statRows.push(['Sangat Baik (A)', '95% s/d 100%', countA, `${calculatePercentage(countA, summary.totalStudents)}%`]);
  statRows.push(['Baik (B)', '85% s/d 94.9%', countB, `${calculatePercentage(countB, summary.totalStudents)}%`]);
  statRows.push(['Cukup (C)', '75% s/d 84.9%', countC, `${calculatePercentage(countC, summary.totalStudents)}%`]);
  statRows.push(['Perlu Perhatian (D)', '< 75%', countD, `${calculatePercentage(countD, summary.totalStudents)}%`]);

  const wsStat = XLSX.utils.aoa_to_sheet(statRows);
  wsStat['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 7 } },
    { s: { r: 15, c: 0 }, e: { r: 15, c: 3 } },
  ];
  wsStat['!cols'] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 22 },
  ];

  // Apply styling to Sheet 2 headers
  setCell(wsStat, 0, 0, statRows[0][0], { font: { bold: true, sz: 14, color: { rgb: '064E3B' } }, alignment: { horizontal: 'center' } });
  setCell(wsStat, 1, 0, statRows[1][0], { font: { bold: true, sz: 11, color: { rgb: '1E293B' } }, alignment: { horizontal: 'center' } });
  setCell(wsStat, 4, 0, statRows[4][0], { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '065F46' } } });
  setCell(wsStat, 10, 0, statRows[10][0], { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '0F766E' } } });
  setCell(wsStat, 15, 0, statRows[15][0], { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E293B' } } });

  XLSX.utils.book_append_sheet(wb, wsStat, 'Analisis & Statistik');

  // ==========================================
  // SHEET 3: PROFIL & REGULASI LEMBAGA
  // ==========================================
  const regRows: (string | number)[][] = [
    ['PROFIL LEMBAGA, LEGALITAS & KETENTUAN PRESENSI SEKOLAH'],
    [schoolProfile.schoolName.toUpperCase()],
    [],
    ['A. IDENTITAS SATUAN PENDIDIKAN'],
    ['Nama Lembaga Formal:', schoolProfile.schoolName],
    ['Nomor Pokok Sekolah Nasional (NPSN):', schoolProfile.npsn],
    ['Alamat Lengkap:', schoolProfile.address],
    ['Status Akreditasi:', 'Terakreditasi "A" (Unggul)'],
    ['Sistem Pembelajaran:', 'Terpisah Ruang Kelas Ikhwan (Putra) dan Akhwat (Putri)'],
    ['Tingkat Pendidikan:', 'Sekolah Menengah Atas (Kelas X, XI, XII)'],
    [],
    ['B. DAFTAR PEJABAT PENGESAHAN LAPORAN PRESENSI RESMI'],
    ['Jabatan Resmi', 'Nama Lengkap Pejabat', 'NIP / NUPTK', 'Status'],
    ['1. Kepala Sekolah', schoolProfile.principalName || '-', schoolProfile.principalNip || '-', 'Penanggung Jawab Utama'],
    ['2. Waka Bidang Kesiswaan', schoolProfile.kesiswaanName || 'Ust. Muhammad Salman, S.Pd.', schoolProfile.kesiswaanNip || '-', 'Verifikator Disiplin Siswa'],
    ['3. Wali Kelas / Koordinator Ikhwan', schoolProfile.walasIkhwanName || 'Ust. Abdullah Fatih, S.Pd.I', schoolProfile.walasIkhwanNip || '-', 'Koordinator Putra'],
    ['4. Wali Kelas / Koordinator Akhwat', schoolProfile.walasAkhwatName || 'Usth. Maryam Salsabila, S.Si.', schoolProfile.walasAkhwatNip || '-', 'Koordinator Putri'],
    [],
    ['C. KETENTUAN TATA TERTIB KEHADIRAN SISWA SEKOLAH'],
    ['1. Jam Kedatangan', 'Siswa wajib hadir di sekolah sebelum jam 07.15 WIB. Presensi dicatat setiap pagi.'],
    ['2. Ketentuan Sakit', 'Apabila sakit lebih dari 1 hari, wajib menyertakan dan mengunggah Surat Keterangan Dokter (SKD).'],
    ['3. Ketentuan Izin', 'Izin acara/keluarga wajib disertai bukti foto acara. Izin mendadak di sekolah menyertakan surat tertulis.'],
    ['4. Batas Maksimal Alpa', 'Alpa maksimal 3 hari per semester. Jika lebih, pihak sekolah akan memanggil orang tua / wali siswa.'],
    ['5. Syarat Ujian & Raport', 'Minimal persentase kehadiran 85% untuk memenuhi syarat mengikuti asesmen semester dan kenaikan kelas.'],
    [],
    ['Dokumen ini dihasilkan secara otomatis dan sah melalui Sistem Informasi SI-Hadir Sekolah.'],
  ];

  const wsReg = XLSX.utils.aoa_to_sheet(regRows);
  wsReg['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } },
    { s: { r: 18, c: 0 }, e: { r: 18, c: 3 } },
    { s: { r: 25, c: 0 }, e: { r: 25, c: 3 } },
  ];
  wsReg['!cols'] = [
    { wch: 34 },
    { wch: 36 },
    { wch: 22 },
    { wch: 24 },
  ];

  setCell(wsReg, 0, 0, regRows[0][0], { font: { bold: true, sz: 14, color: { rgb: '064E3B' } }, alignment: { horizontal: 'center' } });
  setCell(wsReg, 1, 0, regRows[1][0], { font: { bold: true, sz: 11, color: { rgb: '1E293B' } }, alignment: { horizontal: 'center' } });
  setCell(wsReg, 3, 0, regRows[3][0], { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '065F46' } } });
  setCell(wsReg, 11, 0, regRows[11][0], { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '0F766E' } } });
  setCell(wsReg, 18, 0, regRows[18][0], { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E293B' } } });

  XLSX.utils.book_append_sheet(wb, wsReg, 'Profil & Regulasi');

  // Generate filename: Laporan_Absensi_[Kategori]_[Kelas]_[Tanggal].xlsx
  const safeClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
  const safeCategory = category.toLowerCase();
  const todayStr = formatDateToISO(new Date());
  const filename = `Laporan_Absensi_${safeCategory}_${safeClassName}_${todayStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

