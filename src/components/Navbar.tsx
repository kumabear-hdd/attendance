import React from 'react';
import {
  CalendarDays,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { ClassRoom, SchoolProfile } from '../types/attendance';

export type ActiveTab = 'presensi' | 'rekap' | 'ekspor' | 'siswa';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  schoolProfile: SchoolProfile;
  classes: ClassRoom[];
  selectedScope: string;
  onSelectScope: (scope: string) => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  schoolProfile,
  classes,
  selectedScope,
  onSelectScope,
  onOpenSettings,
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 no-print">
      {/* Top Banner */}
      <div className="border-b border-slate-800 bg-slate-950/60 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Presensi Harian Seluruh Siswa Sekolah (Bukan Per-Mapel)
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-300 font-medium">
              {schoolProfile.schoolName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              TP {schoolProfile.academicYear}
            </span>
            <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-semibold">
              Semester {schoolProfile.semester}
            </span>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition"
              title="Pengaturan Profil Sekolah"
              aria-label="Pengaturan Sekolah"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pengaturan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-950/30">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  SI-Hadir
                  <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded">
                    Ikhwan & Akhwat (X, XI, XII)
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Presensi Sekolah Harian & Rekapitulasi Berbasis Excel
                </p>
              </div>
            </div>

            {/* Mobile Scope Selector */}
            <div className="md:hidden">
              <select
                value={selectedScope}
                onChange={(e) => onSelectScope(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Pilih Cakupan Siswa"
              >
                <option value="all">Seluruh Sekolah</option>
                <option value="ikhwan">Semua Ikhwan</option>
                <option value="akhwat">Semua Akhwat</option>
                <optgroup label="Tingkat Kelas:">
                  <option value="grade_X">Tingkat X</option>
                  <option value="grade_XI">Tingkat XI</option>
                  <option value="grade_XII">Tingkat XII</option>
                </optgroup>
                <optgroup label="Per Ruangan:">
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Navigation Controls & Scope Selector */}
          <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 overflow-hidden">
            <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 max-w-full overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => setActiveTab('presensi')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'presensi'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span>Input Presensi</span>
              </button>

              <button
                onClick={() => setActiveTab('rekap')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'rekap'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span>Rekapitulasi</span>
              </button>

              <button
                onClick={() => setActiveTab('ekspor')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'ekspor'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span>Ekspor Excel</span>
              </button>

              <button
                onClick={() => setActiveTab('siswa')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'siswa'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Master Siswa & Kelas</span>
              </button>
            </nav>

            {/* Desktop Scope Selector */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs">
              <span className="text-slate-400 font-medium">Cakupan:</span>
              <select
                value={selectedScope}
                onChange={(e) => onSelectScope(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white font-semibold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Pilih Cakupan Siswa"
              >
                <option value="all">Seluruh Siswa Sekolah</option>
                <option value="ikhwan">Semua Kelas Ikhwan (Putra)</option>
                <option value="akhwat">Semua Kelas Akhwat (Putri)</option>
                <optgroup label="Per Tingkat:">
                  <option value="grade_X">Tingkat X (Semua Ruangan)</option>
                  <option value="grade_XI">Tingkat XI (Semua Ruangan)</option>
                  <option value="grade_XII">Tingkat XII (Semua Ruangan)</option>
                </optgroup>
                <optgroup label="Ruangan Tingkat X:">
                  {classes.filter((c) => c.grade === 'X' || c.grade === '10').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Ruangan Tingkat XI:">
                  {classes.filter((c) => c.grade === 'XI' || c.grade === '11').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Ruangan Tingkat XII:">
                  {classes.filter((c) => c.grade === 'XII' || c.grade === '12').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
