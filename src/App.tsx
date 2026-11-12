import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveTab,
  Navbar,
} from './components/Navbar';
import { DailyAttendance } from './components/DailyAttendance';
import { AttendanceSummary } from './components/AttendanceSummary';
import { ExcelExportPanel } from './components/ExcelExportPanel';
import { StudentManager } from './components/StudentManager';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { ShareModal } from './components/ShareModal';
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
import { BookOpen, ShieldCheck, Wifi } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('presensi');
  const [data, setData] = useState<StorageData>(() => loadStoredData());
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<string>(() => formatDateToISO(new Date()));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Room / Multi-Device Sync state
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) return r.trim().toLowerCase();
    }
    return 'mustaqbal';
  });

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [serverVersion, setServerVersion] = useState<number>(1);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const serverVersionRef = useRef<number>(1);
  const isSavingRef = useRef<boolean>(false);
  const dataRef = useRef<StorageData>(data);
  dataRef.current = data;

  // Sync state to local storage whenever data changes
  useEffect(() => {
    saveStoredData(data);
  }, [data]);

  // Push updates to server
  const pushToServer = useCallback(
    async (newData: StorageData) => {
      isSavingRef.current = true;
      setSyncStatus('syncing');
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomId, data: newData }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && typeof json.version === 'number') {
            serverVersionRef.current = json.version;
            setServerVersion(json.version);
            setLastSyncTime(new Date());
            setSyncStatus('synced');
          }
        } else {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.warn('[Sync] Offline or failed to push to server:', err);
        setSyncStatus('offline');
      } finally {
        setTimeout(() => {
          isSavingRef.current = false;
        }, 500);
      }
    },
    [roomId]
  );

  // Fetch full data from server on initial load or room change
  const fetchFromServer = useCallback(
    async (targetRoom: string) => {
      setSyncStatus('syncing');
      try {
        const res = await fetch(`/api/data?room=${encodeURIComponent(targetRoom)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setData(json.data);
            saveStoredData(json.data);
            serverVersionRef.current = json.version;
            setServerVersion(json.version);
            setLastSyncTime(new Date());
            setSyncStatus('synced');
            return;
          }
        }
        setSyncStatus('offline');
      } catch (err) {
        console.warn('[Sync] Failed to fetch room data from server, using local cache:', err);
        setSyncStatus('offline');
      }
    },
    []
  );

  // Initial fetch on mount & room change
  useEffect(() => {
    fetchFromServer(roomId);
  }, [roomId, fetchFromServer]);

  // Periodic polling for real-time multi-device sync
  useEffect(() => {
    let isCancelled = false;

    const checkSync = async () => {
      if (isSavingRef.current || isCancelled) return;
      try {
        const currentVer = serverVersionRef.current;
        const res = await fetch(`/api/sync?room=${encodeURIComponent(roomId)}&version=${currentVer}`);
        if (!res.ok) {
          setSyncStatus('offline');
          return;
        }
        const json = await res.json();
        if (isCancelled) return;

        if (json.hasUpdate && json.data) {
          setData(json.data);
          saveStoredData(json.data);
          serverVersionRef.current = json.version;
          setServerVersion(json.version);
          setLastSyncTime(new Date());
          setSyncStatus('synced');
        } else if (json.version) {
          serverVersionRef.current = json.version;
          setServerVersion(json.version);
          setSyncStatus('synced');
        }
      } catch (err) {
        if (!isCancelled) {
          setSyncStatus('offline');
        }
      }
    };

    // Poll every 2.5 seconds
    const interval = setInterval(checkSync, 2500);

    // Also sync on window focus / visibility change (e.g., user returns to tab on phone)
    const handleFocus = () => {
      checkSync();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [roomId]);

  // Handler for changing room ID and updating URL query
  const handleChangeRoom = (newRoom: string) => {
    const cleaned = newRoom.trim().toLowerCase();
    setRoomId(cleaned);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', cleaned);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Helper to commit and sync updates
  const updateDataAndSync = (updater: (prev: StorageData) => StorageData) => {
    setData((prev) => {
      const next = updater(prev);
      pushToServer(next);
      return next;
    });
  };

  // Save new / updated records from daily attendance
  const handleSaveRecords = (newRecords: AttendanceRecord[]) => {
    updateDataAndSync((prev) => {
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
    updateDataAndSync((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
  };

  const handleAddStudentsBatch = (newStudents: Student[]) => {
    updateDataAndSync((prev) => ({
      ...prev,
      students: [...prev.students, ...newStudents],
    }));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    updateDataAndSync((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)),
    }));
  };

  const handleDeleteStudent = (studentId: string) => {
    updateDataAndSync((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
      records: prev.records.filter((r) => r.studentId !== studentId),
    }));
  };

  const handleClearAllStudents = () => {
    const clean = clearAllStudentData(data.classes, data.schoolProfile);
    setData(clean);
    pushToServer(clean);
    setSelectedScope('all');
  };

  // Class management handlers
  const handleAddClass = (newClass: ClassRoom) => {
    updateDataAndSync((prev) => ({
      ...prev,
      classes: [...prev.classes, newClass],
    }));
  };

  const handleUpdateClass = (updatedClass: ClassRoom) => {
    updateDataAndSync((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === updatedClass.id ? updatedClass : c)),
    }));
  };

  const handleDeleteClass = (classId: string) => {
    updateDataAndSync((prev) => ({
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
    pushToServer(initial);
    setSelectedScope('all');
  };

  const handleUpdateSchoolProfile = (updatedProfile: SchoolProfile) => {
    updateDataAndSync((prev) => ({
      ...prev,
      schoolProfile: updatedProfile,
    }));
  };

  const handleExportAllData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SI_Hadir_${data.schoolProfile.schoolName.replace(/\s+/g, '_')}_${formatDateToISO(new Date())}.json`);
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
          pushToServer(parsed);
          alert('Data berhasil diimpor dan disinkronkan ke server!');
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
        onOpenShare={() => setIsShareModalOpen(true)}
        syncStatus={syncStatus}
        serverVersion={serverVersion}
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

      {/* Share & Multi-Device Real-Time Sync Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomId={roomId}
        onChangeRoom={handleChangeRoom}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        serverVersion={serverVersion}
        onForceSync={() => fetchFromServer(roomId)}
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
            <span>{data.schoolProfile.schoolName} (Tingkat X, XI, XII - Ikhwan & Akhwat)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              SheetJS XLSX Engine
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-indigo-300 font-medium">
              <Wifi className="w-3 h-3 text-emerald-400" />
              Multi-Device Real-Time Sync
            </span>
            <span className="text-slate-600">•</span>
            <span>4 Pejabat Pengesahan (Kepsek, Kesiswaan, Walas Ikhwan, Walas Akhwat)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
