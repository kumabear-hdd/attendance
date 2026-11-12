import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Stethoscope,
  Upload,
  X,
} from 'lucide-react';
import { LeaveEvidenceType, Student } from '../types/attendance';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  status: 'Sakit' | 'Izin';
  consecutiveSickDays: number;
  initialData?: {
    attachmentType?: 'skd' | LeaveEvidenceType;
    attachmentData?: string;
    attachmentName?: string;
    leaveType?: 'acara' | 'mendadak';
    note?: string;
  };
  onSave: (data: {
    attachmentType: 'skd' | LeaveEvidenceType;
    attachmentData?: string;
    attachmentName?: string;
    leaveType?: 'acara' | 'mendadak';
    note: string;
  }) => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  isOpen,
  onClose,
  student,
  status,
  consecutiveSickDays,
  initialData,
  onSave,
}) => {
  const [leaveType, setLeaveType] = useState<'acara' | 'mendadak'>(
    initialData?.leaveType || 'acara'
  );
  const [note, setNote] = useState<string>(initialData?.note || '');
  const [fileData, setFileData] = useState<string | undefined>(
    initialData?.attachmentData
  );
  const [fileName, setFileName] = useState<string | undefined>(
    initialData?.attachmentName
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isSick = status === 'Sakit';
  const isMandatorySKD = isSick && consecutiveSickDays >= 2;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5MB.');
      return;
    }
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData(event.target?.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleRemoveFile = () => {
    setFileData(undefined);
    setFileName(undefined);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSick) {
      onSave({
        attachmentType: 'skd',
        attachmentData: fileData,
        attachmentName: fileName,
        note: note.trim() || (fileData ? 'Surat SKD Dokter Terlampir' : (isMandatorySKD ? 'Sakit > 1 Hari (SKD Belum Diunggah)' : 'Sakit')),
      });
    } else {
      // Izin
      const attType: LeaveEvidenceType =
        leaveType === 'acara' ? 'foto_acara' : 'surat_tertulis';

      onSave({
        attachmentType: attType,
        attachmentData: fileData,
        attachmentName: fileName,
        leaveType,
        note:
          note.trim() ||
          (leaveType === 'acara'
            ? 'Izin Acara (Foto Bukti Terlampir)'
            : 'Izin Mendadak di Sekolah (Surat Tertulis Terlampir)'),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            {isSick ? (
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isSick
                  ? 'Lampiran Surat Keterangan Dokter (SKD)'
                  : 'Lampiran Bukti Izin Siswa'}
              </h3>
              <p className="text-xs text-slate-500">
                Siswa: <span className="font-bold text-slate-800">{student.name}</span> ({student.nis})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Rules Banner */}
          {isSick ? (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                isMandatorySKD
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Ketentuan Sakit Sekolah:</p>
                <p className="text-[11px] mt-0.5">
                  {consecutiveSickDays >= 2 ? (
                    <span className="font-semibold text-rose-700">
                      Siswa telah sakit selama {consecutiveSickDays} hari berturut-turut. Sesuai tata tertib sekolah, <strong>WAJIB mengupload foto Surat SKD (Surat Keterangan Dokter)</strong> resmi.
                    </span>
                  ) : (
                    <span>
                      Jika sakit berlanjut lebih dari 1 hari, wajib melampirkan Surat Keterangan Dokter (SKD). Anda dapat melampirkan SKD sekarang jika sudah ada.
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border bg-blue-50 border-blue-200 text-blue-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="font-bold">Ketentuan Izin Sekolah:</p>
                <p className="text-[11px] mt-0.5">
                  Wajib mengunggah <strong>foto bukti di acara</strong> (izin terencana seperti acara keluarga/lomba), ATAU <strong>surat izin tertulis</strong> jika izin mendadak saat siswa masih berada di sekolah.
                </p>
              </div>
            </div>
          )}

          {/* Leave Type Selector (Only for Izin) */}
          {!isSick && (
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Kategori Bukti Izin *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveType('acara')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    leaveType === 'acara'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    Foto Bukti di Acara
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Untuk izin acara keluarga, walimah, atau perlombaan luar sekolah.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveType('mendadak')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    leaveType === 'mendadak'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Surat Tertulis
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Izin mendadak di sekolah (surat dispensasi piket / surat tertulis).
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isSick
                ? 'Upload Foto / Dokumen Surat SKD Dokter'
                : leaveType === 'acara'
                ? 'Upload Foto Bukti di Acara'
                : 'Upload Foto Surat Izin Tertulis'}
              {isMandatorySKD && <span className="text-rose-600"> *</span>}
            </label>

            {fileData ? (
              <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 line-clamp-1">
                        {fileName || 'Dokumen Terlampir'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        File berhasil diunggah
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-rose-500 hover:text-rose-700 text-xs font-semibold"
                  >
                    Ganti
                  </button>
                </div>

                {/* Image preview */}
                {fileData.startsWith('data:image') && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-slate-900/5 flex items-center justify-center">
                    <img
                      src={fileData}
                      alt="Pratinjau Bukti"
                      className="max-h-48 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700">
                  Klik untuk Memilih File atau Foto Bukti
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Mendukung format JPG, PNG, atau dokumen foto (Maks. 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {uploadError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {uploadError}
              </p>
            )}
          </div>

          {/* Description / Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Keterangan Alasan Tambahan:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isSick
                  ? 'Contoh: Demam berdarah, dirawat di RS Permata'
                  : leaveType === 'acara'
                  ? 'Contoh: Menghadiri pernikahan kakak kandung di Bandung'
                  : 'Contoh: Izin pulang jam 10.00 karena urusan darurat keluarga'
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
              Simpan Bukti
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
