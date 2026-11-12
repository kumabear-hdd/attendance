import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  FolderPlus,
  ListPlus,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ClassCategory, ClassRoom, Student } from '../types/attendance';
import { ConfirmModal } from './ConfirmModal';

interface StudentManagerProps {
  students: Student[];
  classes: ClassRoom[];
  selectedClassId: string;
  onSelectClassId: (id: string) => void;
  onAddStudent: (student: Student) => void;
  onAddStudentsBatch: (students: Student[]) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onClearAllStudents: () => void;
  onAddClass: (newClass: ClassRoom) => void;
  onUpdateClass: (updatedClass: ClassRoom) => void;
  onDeleteClass: (classId: string) => void;
  onExportAllData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  classes,
  selectedClassId,
  onSelectClassId,
  onAddStudent,
  onAddStudentsBatch,
  onUpdateStudent,
  onDeleteStudent,
  onClearAllStudents,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // In-app Confirm Modal states (Menggantikan window.confirm yang sering diblokir iframe)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassRoom | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // In-app Notification / Toast state (Menggantikan window.alert)
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inline error states for forms
  const [singleFormError, setSingleFormError] = useState<string | null>(null);
  const [batchFormError, setBatchFormError] = useState<string | null>(null);
  const [classFormError, setClassFormError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  // Form states for Single Student
  const [formData, setFormData] = useState<{
    nis: string;
    nisn: string;
    name: string;
    gender: 'L' | 'P';
    classId: string;
  }>({
    nis: '',
    nisn: '',
    name: '',
    gender: 'L',
    classId: classes[0]?.id || '',
  });

  // Batch import form state
  const [batchClassId, setBatchClassId] = useState<string>(classes[0]?.id || '');
  const [batchText, setBatchText] = useState<string>('');
  const [batchGender, setBatchGender] = useState<'L' | 'P' | 'auto'>('auto');

  // New Class form state
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('X');
  const [newClassCategory, setNewClassCategory] = useState<ClassCategory>('Ikhwan');
  const [newClassTeacher, setNewClassTeacher] = useState('');

  const handleOpenAdd = () => {
    const defaultClass = classes.find((c) => c.id === selectedClassId) || classes[0];
    const defaultGender = defaultClass?.category === 'Akhwat' ? 'P' : 'L';
    setFormData({
      nis: '',
      nisn: '',
      name: '',
      gender: defaultGender,
      classId: defaultClass?.id || '',
    });
    setEditingStudent(null);
    setSingleFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormData({
      nis: student.nis,
      nisn: student.nisn,
      name: student.name,
      gender: student.gender,
      classId: student.classId,
    });
    setEditingStudent(student);
    setSingleFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSingleFormError('Nama siswa wajib diisi.');
      return;
    }

    const autoNis = formData.nis.trim() || String(Date.now()).slice(-4);

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        nis: autoNis,
        nisn: formData.nisn.trim() || '-',
        name: formData.name.trim(),
        gender: formData.gender,
        classId: formData.classId,
      });
      showToast(`Data siswa "${formData.name.trim()}" berhasil diperbarui.`);
    } else {
      const newStudent: Student = {
        id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nis: autoNis,
        nisn: formData.nisn.trim() || '-',
        name: formData.name.trim(),
        gender: formData.gender,
        classId: formData.classId,
      };
      onAddStudent(newStudent);
      showToast(`Siswa "${newStudent.name}" berhasil ditambahkan.`);
    }
    setIsAddModalOpen(false);
  };

  // Submit batch student list
  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) {
      setBatchFormError('Silakan masukkan daftar nama siswa terlebih dahulu.');
      return;
    }

    const targetClass = classes.find((c) => c.id === batchClassId);
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const generatedStudents: Student[] = [];
    let startNis = 1001 + students.length;

    lines.forEach((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      const name = parts[0];
      const customNis = parts[1] || String(startNis++);
      let gender: 'L' | 'P' = 'L';

      if (parts[2]) {
        const g = parts[2].toUpperCase();
        if (g.startsWith('P') || g === 'AKHWAT' || g === 'WANITA' || g === 'PEREMPUAN') {
          gender = 'P';
        } else {
          gender = 'L';
        }
      } else if (batchGender === 'auto') {
        gender = targetClass?.category === 'Akhwat' ? 'P' : 'L';
      } else {
        gender = batchGender;
      }

      generatedStudents.push({
        id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nis: customNis,
        nisn: '-',
        name,
        gender,
        classId: batchClassId,
      });
    });

    onAddStudentsBatch(generatedStudents);
    setIsBatchModalOpen(false);
    setBatchText('');
    setBatchFormError(null);
    showToast(`Berhasil menambahkan ${generatedStudents.length} siswa ke kelas ${targetClass?.name || 'tujuan'}!`);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setClassFormError('Nama kelas wajib diisi.');
      return;
    }

    const newClass: ClassRoom = {
      id: `c_${Date.now()}`,
      name: newClassName.trim(),
      grade: newClassGrade,
      category: newClassCategory,
      homeroomTeacher: newClassTeacher.trim() || undefined,
    };

    onAddClass(newClass);
    setNewClassName('');
    setNewClassTeacher('');
    setClassFormError(null);
    showToast(`Kelas "${newClass.name}" berhasil dibuat.`);
  };

  // Filter students based on selection (all, ikhwan, akhwat, grade_*, or classId)
  const filteredStudents = students.filter((s) => {
    const studentClass = classes.find((c) => c.id === s.classId);

    let matchClass = true;
    if (selectedClassId === 'all') {
      matchClass = true;
    } else if (selectedClassId === 'ikhwan') {
      matchClass = studentClass?.category === 'Ikhwan' || s.gender === 'L';
    } else if (selectedClassId === 'akhwat') {
      matchClass = studentClass?.category === 'Akhwat' || s.gender === 'P';
    } else if (selectedClassId.startsWith('grade_')) {
      const g = selectedClassId.replace('grade_', '').toUpperCase();
      const cg = studentClass?.grade.toUpperCase() || '';
      matchClass =
        cg === g ||
        (g === 'X' && cg === '10') ||
        (g === 'XI' && cg === '11') ||
        (g === 'XII' && cg === '12') ||
        (g === '10' && cg === 'X') ||
        (g === '11' && cg === 'XI') ||
        (g === '12' && cg === 'XII');
    } else {
      matchClass = s.classId === selectedClassId;
    }

    const term = searchTerm.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(term) ||
      s.nis.includes(term) ||
      s.nisn.includes(term);

    return matchClass && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback Banner */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold border ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-700'
                : 'bg-rose-800 text-white border-rose-700'
            }`}
          >
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-300" />
            )}
            <span>{feedbackToast.message}</span>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <Users className="w-3.5 h-3.5" />
                Data Siswa & Manajemen Kelas
              </span>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                12 Ruangan X, XI, XII (Ikhwan & Akhwat)
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              Buku Induk Siswa Sekolah
            </h2>
            <p className="text-xs text-slate-500">
              Input data siswa Anda sendiri (satu per satu atau masal), tentukan kelas siswa, hapus siswa tertentu, atau kosongkan seluruh data untuk memulai dari nol.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Siswa</span>
            </button>

            <button
              onClick={() => {
                setBatchFormError(null);
                setIsBatchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-300 cursor-pointer"
              title="Salin dan tempel daftar nama siswa sekaligus"
            >
              <ListPlus className="w-4 h-4 text-emerald-600" />
              <span>Input Siswa Masal</span>
            </button>

            <button
              onClick={() => {
                setClassFormError(null);
                setIsClassModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200 cursor-pointer"
              title="Tambah atau atur kelas Ikhwan dan Akhwat"
            >
              <FolderPlus className="w-4 h-4 text-slate-600" />
              <span>Kelola Kelas ({classes.length})</span>
            </button>

            {/* Tombol Kosongkan Data (Aktif & membuka modal konfirmasi langsung) */}
            {students.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-300 cursor-pointer shadow-2xs"
                title="Kosongkan seluruh data siswa untuk mulai baru dari nol"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Kosongkan Data ({students.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Cakupan Siswa:</span>
            <select
              value={selectedClassId}
              onChange={(e) => onSelectClassId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Seluruh Siswa Sekolah ({students.length} Siswa)</option>
              <optgroup label="Pilih Per Tingkat:">
                <option value="grade_X">
                  Tingkat X ({students.filter((s) => {
                    const cl = classes.find((c) => c.id === s.classId);
                    return cl?.grade === 'X' || cl?.grade === '10';
                  }).length} Siswa)
                </option>
                <option value="grade_XI">
                  Tingkat XI ({students.filter((s) => {
                    const cl = classes.find((c) => c.id === s.classId);
                    return cl?.grade === 'XI' || cl?.grade === '11';
                  }).length} Siswa)
                </option>
                <option value="grade_XII">
                  Tingkat XII ({students.filter((s) => {
                    const cl = classes.find((c) => c.id === s.classId);
                    return cl?.grade === 'XII' || cl?.grade === '12';
                  }).length} Siswa)
                </option>
              </optgroup>
              <optgroup label="Pilih Per Kategori:">
                <option value="ikhwan">
                  Semua Ikhwan / Putra ({students.filter((s) => {
                    const cl = classes.find((c) => c.id === s.classId);
                    return cl?.category === 'Ikhwan' || s.gender === 'L';
                  }).length} Siswa)
                </option>
                <option value="akhwat">
                  Semua Akhwat / Putri ({students.filter((s) => {
                    const cl = classes.find((c) => c.id === s.classId);
                    return cl?.category === 'Akhwat' || s.gender === 'P';
                  }).length} Siswa)
                </option>
              </optgroup>
              <optgroup label="Pilih Per Ruangan:">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category}) - {students.filter((s) => s.classId === c.id).length} Siswa
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Class Overview Cards (Ikhwan vs Akhwat) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ikhwan Overview */}
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-indigo-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Kelompok Kelas Ikhwan (Putra)
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              {students.filter((s) => {
                const cl = classes.find((c) => c.id === s.classId);
                return cl?.category === 'Ikhwan' || s.gender === 'L';
              }).length} Siswa
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {classes
              .filter((c) => c.category === 'Ikhwan')
              .map((c) => (
                <span
                  key={c.id}
                  onClick={() => onSelectClassId(c.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer transition ${
                    selectedClassId === c.id
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {c.name} ({students.filter((s) => s.classId === c.id).length})
                </span>
              ))}
          </div>
        </div>

        {/* Akhwat Overview */}
        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-rose-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              Kelompok Kelas Akhwat (Putri)
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
              {students.filter((s) => {
                const cl = classes.find((c) => c.id === s.classId);
                return cl?.category === 'Akhwat' || s.gender === 'P';
              }).length} Siswi
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {classes
              .filter((c) => c.category === 'Akhwat')
              .map((c) => (
                <span
                  key={c.id}
                  onClick={() => onSelectClassId(c.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer transition ${
                    selectedClassId === c.id
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {c.name} ({students.filter((s) => s.classId === c.id).length})
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Students Table or Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
              <UserPlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Belum Ada Data Siswa
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Data lama telah dikosongkan. Anda sekarang dapat mulai mengisi data siswa sekolah Anda sendiri, baik satu per satu atau menyalin daftar nama sekaligus.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={handleOpenAdd}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer"
              >
                + Tambah Siswa Pertama
              </button>
              <button
                onClick={() => {
                  setBatchFormError(null);
                  setIsBatchModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-300 cursor-pointer"
              >
                Input Masal (Copy-Paste)
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">NIS</th>
                  <th className="py-3 px-4 w-32">NISN</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3 w-24 text-center">Kategori</th>
                  <th className="py-3 px-4 w-44">Ruangan Kelas</th>
                  <th className="py-3 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada siswa ditemukan pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const studentClass = classes.find((c) => c.id === s.classId);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {s.nis}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {s.nisn}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {s.name}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.gender === 'L'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-pink-50 text-pink-700 border border-pink-200'
                            }`}
                          >
                            {s.gender === 'L' ? 'Ikhwan (L)' : 'Akhwat (P)'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">
                              {studentClass?.name || 'Belum Ditentukan'}
                            </span>
                            {studentClass && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  studentClass.category === 'Ikhwan'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {studentClass.category}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Edit Siswa / Ganti Kelas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Tombol Hapus Siswa (Membuka ConfirmModal) */}
                            <button
                              type="button"
                              onClick={() => setStudentToDelete(s)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title={`Hapus siswa ${s.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Menampilkan {filteredStudents.length} dari total {students.length} siswa sekolah.</span>
          <span className="text-[11px] text-slate-400">Presensi Harian Seluruh Siswa Sekolah</span>
        </div>
      </div>

      {/* Modal: Single Student (Add / Edit) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingStudent ? 'Edit Data & Kelas Siswa' : 'Tambah Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Isi data identitas siswa dan tentukan penempatan kelas Ikhwan atau Akhwat.
            </p>

            {singleFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{singleFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStudent} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (singleFormError) setSingleFormError(null);
                  }}
                  placeholder="Contoh: Muhammad Fatih"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nomor Induk Siswa (NIS)
                  </label>
                  <input
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Otomatis jika kosong"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    NISN (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="00xxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Tentukan Kelas & Jenis Kelamin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Penempatan Ruangan Kelas *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => {
                      const newCid = e.target.value;
                      const c = classes.find((cl) => cl.id === newCid);
                      setFormData({
                        ...formData,
                        classId: newCid,
                        gender: c?.category === 'Akhwat' ? 'P' : 'L',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kategori Siswa
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="L">Ikhwan (Laki-laki)</option>
                    <option value="P">Akhwat (Perempuan)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Quick Import */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Input Siswa Masal (Salin-Tempel Daftar Nama)
                </h3>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{batchFormError}</span>
              </div>
            )}

            <form onSubmit={handleBatchSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Pilih Kelas Tujuan:
                  </label>
                  <select
                    value={batchClassId}
                    onChange={(e) => setBatchClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kategori Kelamin:
                  </label>
                  <select
                    value={batchGender}
                    onChange={(e) => setBatchGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="auto">Sesuaikan Tipe Kelas Otomatis</option>
                    <option value="L">Semua Ikhwan (Laki-laki)</option>
                    <option value="P">Semua Akhwat (Perempuan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tempelkan Daftar Nama Siswa (Satu nama per baris):
                </label>
                <textarea
                  rows={8}
                  value={batchText}
                  onChange={(e) => {
                    setBatchText(e.target.value);
                    if (batchFormError) setBatchFormError(null);
                  }}
                  placeholder={`Contoh:\nAhmad Fauzan\nAbdullah Fatih\nBima Perkasa\n\nAtau dengan format (Nama, NIS):\nAhmad Fauzan, 2401\nAbdullah Fatih, 2402`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono text-xs leading-relaxed"
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sistem otomatis memberikan NIS berurutan jika tidak dituliskan.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  Tambahkan Semua Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kelola Kelas Ikhwan & Akhwat */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Kelola Ruangan Kelas Sekolah (12 Ruangan X, XI, XII)
                </h3>
              </div>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Existing Classes */}
            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Ruangan Kelas yang Terdaftar ({classes.length} Ruangan):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            c.category === 'Ikhwan'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {c.grade ? `Tingkat ${c.grade}` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {students.filter((s) => s.classId === c.id).length} Siswa
                        </span>
                      </div>
                    </div>
                    {classes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setClassToDelete(c)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title={`Hapus kelas ${c.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form to Add New Class */}
            {classFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{classFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3 text-xs">
              <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                Tambah Ruangan Kelas Baru:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tingkat Kelas *
                  </label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    <option value="X">Tingkat X</option>
                    <option value="XI">Tingkat XI</option>
                    <option value="XII">Tingkat XII</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Kelas *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: X Ikhwan 3"
                    value={newClassName}
                    onChange={(e) => {
                      setNewClassName(e.target.value);
                      if (classFormError) setClassFormError(null);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Kategori Kelas *
                  </label>
                  <select
                    value={newClassCategory}
                    onChange={(e) => setNewClassCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    <option value="Ikhwan">Ikhwan (Putra)</option>
                    <option value="Akhwat">Akhwat (Putri)</option>
                    <option value="Umum">Umum / Campuran</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Wali Kelas / Pengampu (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd."
                  value={newClassTeacher}
                  onChange={(e) => setNewClassTeacher(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  + Simpan Kelas Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Modal Konfirmasi Hapus Siswa Individual */}
      <ConfirmModal
        isOpen={studentToDelete !== null}
        title="Hapus Data Siswa Ini?"
        message={
          studentToDelete ? (
            <div>
              <p>
                Apakah Anda yakin ingin menghapus data siswa{' '}
                <strong className="text-slate-900 font-bold">{studentToDelete.name}</strong>{' '}
                (NIS: <span className="font-mono font-semibold">{studentToDelete.nis}</span>)?
              </p>
              <p className="text-[11px] text-rose-600 mt-2 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                ⚠️ Catatan: Riwayat presensi harian siswa ini juga akan otomatis terhapus dari sistem.
              </p>
            </div>
          ) : ''
        }
        confirmText="Ya, Hapus Siswa"
        cancelText="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (studentToDelete) {
            onDeleteStudent(studentToDelete.id);
            showToast(`Data siswa "${studentToDelete.name}" berhasil dihapus.`);
            setStudentToDelete(null);
          }
        }}
        onClose={() => setStudentToDelete(null)}
      />

      {/* 2. Modal Konfirmasi Kosongkan Seluruh Data Siswa & Presensi */}
      <ConfirmModal
        isOpen={isClearAllModalOpen}
        title="Kosongkan Seluruh Data Siswa & Presensi?"
        message={
          <div className="space-y-2">
            <p>
              Aksi ini akan menghapus bersih seluruh data{' '}
              <strong className="text-rose-700 font-bold">{students.length} siswa</strong>{' '}
              beserta seluruh riwayat presensi harian yang tersimpan.
            </p>
            <p className="text-slate-600">
              Struktur 12 ruangan kelas (Tingkat X, XI, XII untuk Ikhwan & Akhwat) akan tetap tersimpan sehingga Anda dapat langsung memasukkan data siswa baru.
            </p>
            <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              ⚠️ Tindakan ini permanen. Pastikan Anda telah mengunduh backup atau laporan Excel jika diperlukan.
            </p>
          </div>
        }
        confirmText="Ya, Kosongkan Seluruh Data"
        cancelText="Batal"
        isDestructive={true}
        onConfirm={() => {
          onClearAllStudents();
          showToast('Seluruh data siswa dan catatan presensi berhasil dikosongkan.');
          setIsClearAllModalOpen(false);
        }}
        onClose={() => setIsClearAllModalOpen(false)}
      />

      {/* 3. Modal Konfirmasi Hapus Kelas */}
      <ConfirmModal
        isOpen={classToDelete !== null}
        title="Hapus Ruangan Kelas?"
        message={
          classToDelete ? (
            <div>
              <p>
                Apakah Anda yakin ingin menghapus kelas{' '}
                <strong className="text-slate-900 font-bold">{classToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-amber-800 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Siswa di dalam kelas ini akan perlu ditentukan penempatan kelasnya kembali.
              </p>
            </div>
          ) : ''
        }
        confirmText="Ya, Hapus Kelas"
        cancelText="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (classToDelete) {
            onDeleteClass(classToDelete.id);
            showToast(`Kelas "${classToDelete.name}" berhasil dihapus.`);
            setClassToDelete(null);
          }
        }}
        onClose={() => setClassToDelete(null)}
      />
    </div>
  );
};
