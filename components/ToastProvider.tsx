'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MdCheckCircle, MdError, MdInfo, MdClose } from 'react-icons/md';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastConfig = {
  success: { icon: MdCheckCircle, color: 'var(--sl-green)', bg: 'var(--sl-green-dim)', border: 'hsla(150, 100%, 50%, 0.25)' },
  error:   { icon: MdError,       color: 'var(--sl-red)',   bg: 'var(--sl-red-dim)',   border: 'hsla(0, 100%, 60%, 0.25)' },
  info:    { icon: MdInfo,        color: 'var(--sl-blue)',  bg: 'var(--sl-blue-dim)',  border: 'hsla(190, 100%, 50%, 0.25)' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="sync">
          {toasts.map((toast) => {
            const cfg = toastConfig[toast.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.92 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => dismiss(toast.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  minWidth: '280px',
                  maxWidth: '400px',
                  background: 'var(--sl-bg-sub)',
                  border: `1px solid ${cfg.border}`,
                  borderLeft: `3px solid ${cfg.color}`,
                  borderRadius: '12px',
                  backdropFilter: 'blur(20px)',
                  boxShadow: 'var(--sl-shadow-md)',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  userSelect: 'none',
                }}
              >
                <Icon style={{ color: cfg.color, fontSize: '1.25rem', flexShrink: 0 }} />
                <span style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--sl-text-main)',
                  lineHeight: 1.4,
                }}>
                  {toast.message}
                </span>
                <MdClose
                  style={{ color: 'var(--sl-text-ghost)', fontSize: '1rem', flexShrink: 0, opacity: 0.6 }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
