import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export default function NotificationToast({ toasts, removeToast }: ToastContainerProps) {
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />;
      case 'info':
        return <Info className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      case 'warning':
        return 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
      case 'error':
        return 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
      case 'info':
        return 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
    }
  };

  return (
    <div id="toast-container" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-slate-950/85 backdrop-blur-md border ${getBorderColor(
              toast.type
            )} transition-all duration-300`}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-grow text-sm font-sans text-slate-200">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
