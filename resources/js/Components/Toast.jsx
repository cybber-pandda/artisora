import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

// ── Toast Context ────────────────────────────────────────────────
const ToastContext = createContext(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 2000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            {/* Toast container — fixed bottom-center */}
            <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md ${
                                toast.type === 'success'
                                    ? 'bg-emerald-600/90 text-white'
                                    : 'bg-red-600/90 text-white'
                            }`}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle size={16} className="flex-shrink-0" />
                            ) : (
                                <AlertCircle size={16} className="flex-shrink-0" />
                            )}
                            <span>{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ml-1 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
                            >
                                <X size={13} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
