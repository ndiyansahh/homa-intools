'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Loader2 } from 'lucide-react';

interface Props {
  payoutId: string;
  payoutSlipId: string;
  onClose: () => void;
}

export default function PayoutPdfPreviewModal({ payoutId, payoutSlipId, onClose }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchPdf() {
      try {
        const res = await fetch(`/api/payouts/${payoutId}/pdf`);
        if (!res.ok) throw new Error('Failed to load PDF');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPdfUrl(url);
      } catch {
        setError('Gagal memuat preview. Coba lagi.');
      } finally {
        setLoading(false);
      }
    }
    fetchPdf();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [payoutId]);

  function handleDownload() {
    if (!pdfUrl) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `payout-slip-${payoutSlipId.replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-semibold text-gray-800">Preview Slip Pembayaran</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={!pdfUrl || downloading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Memuat preview...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full text-red-500">{error}</div>
          )}

          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-b-xl"
              title="Payout Slip Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
