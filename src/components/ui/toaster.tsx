'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'info' }: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(360px,90vw)] flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-xl border p-3 shadow-lg backdrop-blur-sm ${
              item.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : item.variant === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {item.variant === 'error' ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.description && <p className="mt-0.5 text-xs">{item.description}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="pointer-events-auto rounded px-1 text-xs opacity-70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}
