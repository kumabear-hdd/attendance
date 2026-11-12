import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePercentage,
  getDateRangeForPeriod,
  aggregateAttendance,
  getDatesBetween,
} from './attendance';
import { Student, AttendanceRecord } from '../types/attendance';

test('calculatePercentage computes rounded attendance percentage accurately', () => {
  assert.equal(calculatePercentage(10, 10), 100);
  assert.equal(calculatePercentage(0, 10), 0);
  assert.equal(calculatePercentage(0, 0), 0);
  assert.equal(calculatePercentage(19, 20), 95);
  // 17 / 23 = 73.913... -> 73.9%
  assert.equal(calculatePercentage(17, 23), 73.9);
});

test('getDateRangeForPeriod generates valid ISO ranges for daily, weekly, monthly, and semester', () => {
  const baseDate = '2026-11-11'; // Wednesday

  // Daily
  const daily = getDateRangeForPeriod('daily', baseDate);
  assert.equal(daily.startDate, '2026-11-11');
  assert.equal(daily.endDate, '2026-11-11');

  // Weekly (should span Monday to Saturday)
  const weekly = getDateRangeForPeriod('weekly', baseDate);
  assert.equal(weekly.startDate, '2026-11-09'); // Monday
  assert.equal(weekly.endDate, '2026-11-14'); // Saturday

  // Monthly
  const monthly = getDateRangeForPeriod('monthly', baseDate);
  assert.equal(monthly.startDate, '2026-11-01');
  assert.equal(monthly.endDate, '2026-11-30');

  // Semester (November -> Semester Ganjil: July to December)
  const semester = getDateRangeForPeriod('semester', baseDate);
  assert.equal(semester.startDate, '2026-07-01');
  assert.equal(semester.endDate, '2026-12-31');
});

test('getDatesBetween produces weekdays excluding Sundays', () => {
  // Monday 2026-11-09 to Wednesday 2026-11-11
  const dates = getDatesBetween('2026-11-09', '2026-11-11');
  assert.deepEqual(dates, ['2026-11-09', '2026-11-10', '2026-11-11']);
});

test('aggregateAttendance calculates aggregate figures and individual student attendance correctly', () => {
  const mockStudents: Student[] = [
    {
      id: 's1',
      nis: '1001',
      nisn: '0051110001',
      name: 'Aditya Pratama',
      gender: 'L',
      classId: 'c1',
    },
    {
      id: 's2',
      nis: '1002',
      nisn: '0051110002',
      name: 'Bella Safitri',
      gender: 'P',
      classId: 'c1',
    },
  ];

  const mockRecords: AttendanceRecord[] = [
    {
      id: 'r1',
      studentId: 's1',
      classId: 'c1',
      date: '2026-11-09',
      status: 'Hadir',
      recordedAt: '2026-11-09T07:30:00Z',
    },
    {
      id: 'r2',
      studentId: 's1',
      classId: 'c1',
      date: '2026-11-10',
      status: 'Hadir',
      recordedAt: '2026-11-10T07:30:00Z',
    },
    {
      id: 'r3',
      studentId: 's2',
      classId: 'c1',
      date: '2026-11-09',
      status: 'Sakit',
      note: 'Flu & Demam',
      recordedAt: '2026-11-09T07:30:00Z',
    },
    {
      id: 'r4',
      studentId: 's2',
      classId: 'c1',
      date: '2026-11-10',
      status: 'Hadir',
      recordedAt: '2026-11-10T07:30:00Z',
    },
  ];

  const summary = aggregateAttendance(mockStudents, mockRecords, '2026-11-09', '2026-11-10', 'daily');

  assert.equal(summary.totalStudents, 2);
  assert.equal(summary.totalHadir, 3);
  assert.equal(summary.totalSakit, 1);
  assert.equal(summary.totalIzin, 0);
  assert.equal(summary.totalAlpa, 0);

  // Overall attendance rate: 3 / 4 = 75%
  assert.equal(summary.overallAttendanceRate, 75);

  // Student 1: 2 hadir out of 2 = 100%
  const s1 = summary.studentSummaries.find((s) => s.student.id === 's1');
  assert.ok(s1);
  assert.equal(s1.hadir, 2);
  assert.equal(s1.percentage, 100);

  // Student 2: 1 hadir, 1 sakit = 50%
  const s2 = summary.studentSummaries.find((s) => s.student.id === 's2');
  assert.ok(s2);
  assert.equal(s2.hadir, 1);
  assert.equal(s2.sakit, 1);
  assert.equal(s2.percentage, 50);
});

test('buildSignatureSection creates 4 official signatories (Kepsek, Kesiswaan, Walas Ikhwan, Walas Akhwat)', async () => {
  const { buildSignatureSection } = await import('./attendance');
  const mockProfile = {
    schoolName: 'SMA IT Al-Hikmah',
    npsn: '12345678',
    address: 'Jl. Utama No. 1',
    academicYear: '2026/2027',
    semester: 'Ganjil' as const,
    principalName: 'Drs. H. Ahmad Fauzan, M.Pd.',
    principalNip: '19750815 200501 1 003',
    kesiswaanName: 'Ust. Muhammad Salman, S.Pd.',
    kesiswaanNip: '19820412 201001 1 008',
    walasIkhwanName: 'Ust. Abdullah Fatih, S.Pd.I',
    walasIkhwanNip: '19880920 201502 1 004',
    walasAkhwatName: 'Usth. Maryam Salsabila, S.Si.',
    walasAkhwatNip: '19900315 201603 2 006',
  };

  const sigs = buildSignatureSection(mockProfile);
  const textFlattened = sigs.flat().join(' ');

  assert.ok(textFlattened.includes('Kepala Sekolah'));
  assert.ok(textFlattened.includes('Waka Kesiswaan'));
  assert.ok(textFlattened.includes('Wali Kelas / Koordinator Ikhwan'));
  assert.ok(textFlattened.includes('Wali Kelas / Koordinator Akhwat'));
  assert.ok(textFlattened.includes('Drs. H. Ahmad Fauzan, M.Pd.'));
  assert.ok(textFlattened.includes('Ust. Muhammad Salman, S.Pd.'));
  assert.ok(textFlattened.includes('Ust. Abdullah Fatih, S.Pd.I'));
  assert.ok(textFlattened.includes('Usth. Maryam Salsabila, S.Si.'));
});

