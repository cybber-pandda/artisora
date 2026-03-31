import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';

/**
 * ImageLightbox — full-screen image viewer overlay.
 */
export default function ImageLightbox({ src, alt = 'Image', onClose }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!src) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
            >
                <X size={20} />
            </button>

            <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
                draggable={false}
            />
        </motion.div>
    );
}

/**
 * ExpandableImage — a clickable thumbnail that opens full-screen.
 */
export function ExpandableImage({ src, alt = 'Image', className = '' }) {
    const [open, setOpen] = useState(false);

    if (!src) return null;

    return (
        <>
            <div className={`relative cursor-pointer group ${className}`} onClick={() => setOpen(true)}>
                <img src={src} alt={alt} className="h-full w-full rounded-xl object-cover" />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors">
                    <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
            </div>
            <AnimatePresence>
                {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
            </AnimatePresence>
        </>
    );
}
