import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Laptop,
  QrCode,
  RefreshCw,
  Share2,
  Smartphone,
  Users,
  Wifi,
  X,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  currentDate: string;
  onChangeRoom: (newRoomId: string) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncTime: Date | null;
  serverVersion: number;
  onForceSync: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
  currentDate,
  onChangeRoom,
  syncStatus,
  lastSyncTime,
  serverVersion,
  onForceSync,
}) => {
  const [copied, setCopied] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState(roomId);
  const [isEditingRoom, setIsEditingRoom] = useState(false);

  // Generate the full shareable URL with room and date
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(currentDate)}`;
  };

  const shareUrl = getShareUrl();

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  const handleApplyCustomRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customRoomInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleaned) {
      onChangeRoom(cleaned);
      setIsEditingRoom(false);
    }
  };

  if (!isOpen) return null;

  // Simple clean SVG QR code simulation or QR generator for mobile scanning
  // Encode URL as standard QR visual or direct quick-scan helper
  const qrImageApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    shareUrl
  )}&bgcolor=ffffff&color=0f172a&margin=1`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bagikan Tautan & Sinkronisasi Multi-Device
              </h3>
              <p className="text-xs text-slate-500">
                Akses dan edit absensi bersamaan di 2 atau lebih perangkat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Sync Status Banner */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {syncStatus === 'synced' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </>
              )}
              {syncStatus === 'syncing' && (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 animate-spin"></span>
              )}
              {syncStatus === 'offline' && (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              )}
            </span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>
                  {syncStatus === 'synced' && 'Sinkronisasi Multi-Device Aktif'}
                  {syncStatus === 'syncing' && 'Sedang Menyinkronkan...'}
                  {syncStatus === 'offline' && 'Mode Offline (Lokal)'}
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                  v{serverVersion}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {lastSyncTime
                  ? `Terakhir sinkron: ${lastSyncTime.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`
                  : 'Menghubungkan ke server...'}
              </div>
            </div>
          </div>

          <button
            onClick={onForceSync}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            title="Perbarui data sekarang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>

        {/* URL Sharing Card */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tautan Website Langsung (Shareable URL):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 select-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                ✓ Tautan berhasil disalin! Silakan kirimkan ke WhatsApp atau buka di perangkat kedua.
              </p>
            )}
          </div>

          {/* QR Code and Multi-Device Illustration */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0 text-center">
              <img
                src={qrImageApiUrl}
                alt="QR Code Akses Cepat"
                className="w-32 h-32 mx-auto rounded"
                onError={(e) => {
                  // Fallback if external image blocked
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1 mt-1">
                <QrCode className="w-3 h-3" />
                Scan via HP
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                Cara Kerja Kolaborasi Multi-Device:
              </h4>
              <ul className="space-y-1.5 text-[11px] leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">1.</span>
                  <span>
                    Buka tautan di atas pada <strong>Perangkat Kedua</strong> (HP rekan guru, laptop, atau tablet).
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">2.</span>
                  <span>
                    Semua editan pada perangkat kedua (misal: tambah siswa, centang sakit/izin, input keterangan SKD) akan langsung tersimpan di server.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">3.</span>
                  <span>
                    Perangkat utama otomatis menerima pembaruan secara <strong>real-time</strong> tanpa merusak sistem.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Device icons preview */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div className="text-[11px]">
                <div className="font-bold text-slate-900">Perangkat Utama</div>
                <div className="text-slate-500">Laptop / PC Ruang Guru</div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-[11px]">
                <div className="font-bold text-slate-900">Perangkat Kedua</div>
                <div className="text-slate-500">HP / Tablet Wali Kelas</div>
              </div>
            </div>
          </div>

          {/* Room Settings */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              <span>Kode Ruang Kerja: </span>
              <strong className="text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">
                {roomId}
              </strong>
            </div>

            {isEditingRoom ? (
              <form onSubmit={handleApplyCustomRoom} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  placeholder="nama-ruang"
                  className="px-2 py-1 border border-slate-300 rounded text-xs font-mono w-28"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-bold"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRoom(false)}
                  className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Batal
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingRoom(true)}
                className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
              >
                Ganti Ruang
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-white bg-slate-900 hover:bg-slate-800 rounded-xl font-bold text-xs transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
