import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Navbar,
} from './components/Navbar';
import { DailyAttendance } from './components/DailyAttendance';
import { AttendanceSummary } from './components/AttendanceSummary';
import { ExcelExportPanel } from './components/ExcelExportPanel';
import { StudentManager } from './components/StudentManager';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import {
  AttendanceRecord,
  ClassRoom,
  SchoolProfile,
  Student,
} from './types/attendance';
import {
  clearAllStudentData,
  loadStoredData,
  resetToInitialData,
  saveStoredData,
  StorageData,
} from './data/initialData';
import { formatDateToISO } from './utils/attendance';
import { BookOpen, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('presensi');
  const [data, setData] = useState<StorageData>(() => loadStoredData());
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<string>(() => formatDateToISO(new Date()));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync to localStorage on state changes
  useEffect(() => {
    saveStoredData(data);
  }, [data]);

  // Save new / updated records from daily attendance
  const handleSaveRecords = (newRecords: AttendanceRecord[]) => {
    setData((prev) => {
      const savedStudentIds = new Set(newRecords.map((r) => r.studentId));
      const remaining = prev.records.filter(
        (r) => !(r.date === currentDate && savedStudentIds.has(r.studentId))
      );
      return {
        ...prev,
        records: [...remaining, ...newRecords],
      };
    });
  };

  // Student management handlers
  const handleAddStudent = (newStudent: Student) => {
    setData((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
  };

  const handleAddStudentsBatch = (newStudents: Student[]) => {
    setData((prev) => ({
      ...prev,
      students: [...prev.students, ...newStudents],
    }));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setData((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)),
    }));
  };

  const handleDeleteStudent = (studentId: string) => {
    setData((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
      records: prev.records.filter((r) => r.studentId !== studentId),
    }));
  };

  const handleClearAllStudents = () => {
    const clean = clearAllStudentData(data.classes, data.schoolProfile);
    setData(clean);
    setSelectedScope('all');
  };

  // Class management handlers
  const handleAddClass = (newClass: ClassRoom) => {
    setData((prev) => ({
      ...prev,
      classes: [...prev.classes, newClass],
    }));
  };

  const handleUpdateClass = (updatedClass: ClassRoom) => {
    setData((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === updatedClass.id ? updatedClass : c)),
    }));
  };

  const handleDeleteClass = (classId: string) => {
    setData((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== classId),
      students: prev.students.filter((s) => s.classId !== classId),
      records: prev.records.filter((r) => r.classId !== classId),
    }));
    if (selectedScope === classId) {
      setSelectedScope('all');
    }
  };

  const handleResetSampleData = () => {
    const initial = resetToInitialData();
    setData(initial);
    setSelectedScope('all');
  };

  const handleUpdateSchoolProfile = (updatedProfile: SchoolProfile) => {
    setData((prev) => ({
      ...prev,
      schoolProfile: updatedProfile,
    }));
  };

  const handleExportAllData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SI_Hadir_Backup_${formatDateToISO(new Date())}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.students && parsed.classes && parsed.records && parsed.schoolProfile) {
          setData(parsed);
          alert('Data berhasil diimpor!');
        } else {
          alert('Format file JSON tidak sesuai struktur backup SI-Hadir.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        schoolProfile={data.schoolProfile}
        classes={data.classes}
        selectedScope={selectedScope}
        onSelectScope={setSelectedScope}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'presensi' && (
          <DailyAttendance
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            selectedScope={selectedScope}
            onSelectScope={setSelectedScope}
            classes={data.classes}
            students={data.students}
            records={data.records}
            onSaveRecords={handleSaveRecords}
            schoolProfile={data.schoolProfile}
            onNavigateToStudents={() => setActiveTab('siswa')}
          />
        )}

        {activeTab === 'rekap' && (
          <AttendanceSummary
            currentDate={currentDate}
            selectedScope={selectedScope}
            onSelectScope={setSelectedScope}
            classes={data.classes}
            students={data.students}
            records={data.records}
            schoolProfile={data.schoolProfile}
            onNavigateToExport={() => setActiveTab('ekspor')}
          />
        )}

        {activeTab === 'ekspor' && (
          <ExcelExportPanel
            currentDate={currentDate}
            selectedScope={selectedScope}
            onSelectScope={setSelectedScope}
            classes={data.classes}
            students={data.students}
            records={data.records}
            schoolProfile={data.schoolProfile}
            onUpdateSchoolProfile={handleUpdateSchoolProfile}
          />
        )}

        {activeTab === 'siswa' && (
          <StudentManager
            students={data.students}
            classes={data.classes}
            selectedClassId={selectedScope}
            onSelectClassId={setSelectedScope}
            onAddStudent={handleAddStudent}
            onAddStudentsBatch={handleAddStudentsBatch}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onClearAllStudents={handleClearAllStudents}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            onExportAllData={handleExportAllData}
            onImportData={handleImportData}
          />
        )}
      </main>

      {/* School Settings Modal (Termasuk 4 Penandatangan Laporan) */}
      <SchoolSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={data.schoolProfile}
        onSave={handleUpdateSchoolProfile}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 mt-12 border-t border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              SI-Hadir &copy; 2026
            </span>
            <span className="text-slate-600">|</span>
            <span>Sistem Informasi Manajemen Presensi Seluruh Siswa Sekolah (Tingkat X, XI, XII - Ikhwan & Akhwat)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              SheetJS XLSX Engine
            </span>
            <span className="text-slate-600">•</span>
            <span>4 Kategori Ekspor Excel: Harian, Mingguan, Bulanan, Semesteran</span>
            <span className="text-slate-600">•</span>
            <span>4 Pejabat Pengesahan (Kepsek, Kesiswaan, Walas Ikhwan, Walas Akhwat)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
