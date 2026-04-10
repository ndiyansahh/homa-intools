'use client';

import { useEffect, useState } from 'react';
import { useToast, Toast, ToastType } from '@/lib/toast';

const CONFIG: Record<ToastType, { bar: string; icon: React.ReactNode }> = {
  success: {
    bar: 'bg-emerald-500',
    icon: (
      <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    bar: 'bg-red-500',
    icon: (
      <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    bar: 'bg-amber-400',
    icon: (
      <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    bar: 'bg-blue-500',
    icon: (
      <svg className="w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = CONFIG[toast.type];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`relative flex items-start gap-3 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-200 ease-out ${
        visible && !leaving
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4'
      }`}
    >
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar}`} />

      <div className="flex items-start gap-3 pl-4 pr-3 py-3.5 w-full">
        {cfg.icon}
        <p className="text-sm text-gray-800 leading-snug flex-1 min-w-0">{toast.message}</p>
        <button
          onClick={handleDismiss}
          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 mt-0.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.22 2.22a.75.75 0 011.06 0L8 6.94l4.72-4.72a.75.75 0 111.06 1.06L9.06 8l4.72 4.72a.75.75 0 11-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 01-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar} opacity-30`}
          style={{
            animation: `shrink ${toast.duration}ms linear forwards`,
            width: '100%',
          }}
        />
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
