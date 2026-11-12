import React, { useState } from 'react';
import { School, User, X } from 'lucide-react';
import { SchoolProfile } from '../types/attendance';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchoolProfile;
  onSave: (updated: SchoolProfile) => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [formData, setFormData] = useState<SchoolProfile>(profile);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Pengaturan Profil Sekolah & Kop Laporan
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Nama Sekolah / Madrasah *
            </label>
            <input
              type="text"
              required
              value={formData.schoolName}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                NPSN
              </label>
              <input
                type="text"
                value={formData.npsn}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tahun Ajaran
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="2026/2027"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Semester Aktif
              </label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Alamat Sekolah
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              4 Pejabat Penandatangan Lembar Pengesahan Laporan Excel & Cetak:
            </h4>
            <p className="text-[11px] text-slate-500">
              Sesuai standar administrasi presensi sekolah, laporan disahkan oleh 4 pihak: Kepala Sekolah, Kesiswaan, Walas Ikhwan, dan Walas Akhwat.
            </p>

            {/* 1. Kepala Sekolah */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-800 block mb-2">
                1. Kepala Sekolah (Pengesahan Utama)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Nama Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    NIP Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={formData.principalNip}
                    onChange={(e) => setFormData({ ...formData, principalNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Waka Kesiswaan */}
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <span className="text-[11px] font-bold text-indigo-900 block mb-2">
                2. Waka Kesiswaan / Penanggung Jawab Kesiswaan
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Nama Waka Kesiswaan
                  </label>
                  <input
                    type="text"
                    value={formData.kesiswaanName || ''}
                    onChange={(e) => setFormData({ ...formData, kesiswaanName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    NIP Waka Kesiswaan
                  </label>
                  <input
                    type="text"
                    value={formData.kesiswaanNip || ''}
                    onChange={(e) => setFormData({ ...formData, kesiswaanNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Wali Kelas / Koordinator Ikhwan */}
            <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100">
              <span className="text-[11px] font-bold text-sky-900 block mb-2">
                3. Wali Kelas / Koordinator Ikhwan (Putra)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Nama Walas Ikhwan
                  </label>
                  <input
                    type="text"
                    value={formData.walasIkhwanName || ''}
                    onChange={(e) => setFormData({ ...formData, walasIkhwanName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    NIP Walas Ikhwan
                  </label>
                  <input
                    type="text"
                    value={formData.walasIkhwanNip || ''}
                    onChange={(e) => setFormData({ ...formData, walasIkhwanNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4. Wali Kelas / Koordinator Akhwat */}
            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
              <span className="text-[11px] font-bold text-rose-900 block mb-2">
                4. Wali Kelas / Koordinator Akhwat (Putri)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Nama Walas Akhwat
                  </label>
                  <input
                    type="text"
                    value={formData.walasAkhwatName || ''}
                    onChange={(e) => setFormData({ ...formData, walasAkhwatName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    NIP Walas Akhwat
                  </label>
                  <input
                    type="text"
                    value={formData.walasAkhwatNip || ''}
                    onChange={(e) => setFormData({ ...formData, walasAkhwatNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition shadow-sm"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
