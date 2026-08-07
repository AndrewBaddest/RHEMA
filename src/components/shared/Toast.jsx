import { useEffect } from 'react';
import { useUIStore } from '../../lib/store';
import { useShallow } from 'zustand/react/shallow';

export default function Toast() {
  // Use useShallow to prevent unnecessary re-renders
  const { toast, clearToast } = useUIStore(
    useShallow((state) => ({
      toast: state.toast,
      clearToast: state.clearToast,
    }))
  );

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        clearToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, clearToast]);

  if (!toast.visible) return null;

  const typeClasses = {
    success: 'border-success',
    error: 'border-error',
    info: 'border-primary',
  };

  return (
    <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#333] text-white px-6 py-3 rounded-lg border ${typeClasses[toast.type] || 'border-primary'} z-[999] max-w-[90%] text-sm shadow-lg transition-opacity duration-300 opacity-100`}>
      {toast.message}
    </div>
  );
}