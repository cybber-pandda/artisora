import { useEffect, useRef } from 'react';
import { X, Smartphone, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

/**
 * ARQRModal
 *
 * Shown on desktop — renders a QR code the user can scan with their phone
 * to open the same product page in a mobile browser where AR is available.
 *
 * Props:
 *   open        {boolean}
 *   onClose     {() => void}
 *   url         {string}   — full URL to encode (usually window.location.href)
 *   productTitle {string}
 */
export default function ARQRModal({ open, onClose, url, productTitle }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!open || !canvasRef.current || !url) return;

        QRCode.toCanvas(canvasRef.current, url, {
            width: 220,
            margin: 2,
            color: {
                dark:  '#1a1a1a',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
        }).catch(console.error);
    }, [open, url]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 16 }}
                        animate={{ scale: 1,    opacity: 1, y: 0 }}
                        exit={{ scale: 0.92,    opacity: 0, y: 16 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface p-8 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-ink-muted transition-colors hover:bg-border hover:text-ink"
                        >
                            <X size={16} />
                        </button>

                        {/* Icon + heading */}
                        <div className="mb-6 flex flex-col items-center gap-3 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sienna/10">
                                <QrCode size={28} className="text-sienna" />
                            </div>
                            <div>
                                <h2 className="font-display text-xl font-bold text-ink">View on Your Wall</h2>
                                <p className="mt-1 text-sm text-ink-muted">
                                    Scan with your phone to preview<br />
                                    <span className="font-medium text-ink">{productTitle}</span> in AR
                                </p>
                            </div>
                        </div>

                        {/* QR Code canvas */}
                        <div className="flex justify-center">
                            <div className="rounded-2xl border-4 border-border bg-white p-2 shadow-inner">
                                <canvas ref={canvasRef} className="block rounded-lg" />
                            </div>
                        </div>

                        {/* Instruction steps */}
                        <div className="mt-6 space-y-2">
                            {[
                                { step: '1', text: 'Open your phone\'s camera app' },
                                { step: '2', text: 'Point it at the QR code above' },
                                { step: '3', text: 'Tap "View on Your Wall" in mobile browser' },
                            ].map(({ step, text }) => (
                                <div key={step} className="flex items-start gap-3">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sienna text-xs font-bold text-white">
                                        {step}
                                    </span>
                                    <p className="text-sm text-ink-soft">{text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Supported devices note */}
                        <div className="mt-5 flex items-center gap-2 rounded-xl bg-canvas px-4 py-3">
                            <Smartphone size={14} className="flex-shrink-0 text-ink-muted" />
                            <p className="text-xs text-ink-muted">
                                Works on iOS 12+ (Safari) and Android 8+ (Chrome)
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
