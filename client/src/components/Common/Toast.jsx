import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colors = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    warning: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    info: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
};

const Toast = ({ id, type = 'info', title, message, onClose, duration = 5000 }) => {
    const Icon = icons[type];

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, id, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`relative w-full max-w-sm glass ${colors[type]} p-4 flex items-start gap-3`}
        >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                {title && (
                    <p className="font-semibold text-white mb-0.5">{title}</p>
                )}
                <p className="text-sm opacity-80">{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress bar */}
            {duration > 0 && (
                <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-2xl"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: duration / 1000, ease: 'linear' }}
                />
            )}
        </motion.div>
    );
};

export const ToastContainer = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-24 right-6 z-50 flex flex-col gap-3">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <Toast key={toast.id} {...toast} onClose={onClose} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
