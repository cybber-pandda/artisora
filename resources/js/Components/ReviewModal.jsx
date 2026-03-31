import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Camera, X, Loader2, MessageSquare, MapPin, Truck, Send, ZoomIn,
} from 'lucide-react';
import ImageLightbox from '@/Components/ImageLightbox';

function StarRating({ value, onChange, size = 28 }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(n)}
                    className="transition-transform hover:scale-110"
                >
                    <Star
                        size={size}
                        className={`transition-colors ${
                            n <= (hover || value)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-none text-stone-300'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

/**
 * ReviewModal
 *
 * Props:
 *   order      : the order object
 *   onClose()  : dismiss the modal
 *   isMeetup   : boolean — show meetup experience section
 */
export default function ReviewModal({ order, onClose, isMeetup = false, isDelivery = false }) {
    const [rating, setRating]       = useState(0);
    const [comment, setComment]     = useState('');
    const [photo, setPhoto]         = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const [meetupRating, setMeetupRating]   = useState(0);
    const [meetupComment, setMeetupComment] = useState('');

    const [deliveryRating, setDeliveryRating]   = useState(0);
    const [deliveryComment, setDeliveryComment] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [photoExpanded, setPhotoExpanded] = useState(false);
    const fileRef = useRef(null);

    const handlePhoto = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = () => {
        if (rating === 0) return;
        setSubmitting(true);

        const formData = new FormData();
        formData.append('rating', rating);
        if (comment.trim()) formData.append('comment', comment.trim());
        if (photo) formData.append('photo', photo);
        if (isMeetup && meetupRating > 0) {
            formData.append('meetup_experience_rating', meetupRating);
        }
        if (isMeetup && meetupComment.trim()) {
            formData.append('meetup_experience_comment', meetupComment.trim());
        }
        if (isDelivery && deliveryRating > 0) {
            formData.append('delivery_experience_rating', deliveryRating);
        }
        if (isDelivery && deliveryComment.trim()) {
            formData.append('delivery_experience_comment', deliveryComment.trim());
        }

        const routeName = isDelivery
            ? 'buyer.orders.delivery-received'
            : 'buyer.orders.meetup-received';

        router.post(route(routeName, order.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setSubmitting(false);
                onClose();
            },
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink">
                            Order Received! 🎉
                        </h3>
                        <p className="text-xs text-ink-muted">
                            Leave a review for Order #{order.id}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5">

                    {/* ── Section 1: Product Review ────────────────── */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Product Review
                        </p>

                        {/* Star rating */}
                        <div className="flex flex-col items-center gap-2 py-2">
                            <p className="text-sm font-medium text-ink">How's the artwork?</p>
                            <StarRating value={rating} onChange={setRating} />
                            <p className="text-xs text-ink-muted">
                                {rating === 0 && 'Tap a star to rate'}
                                {rating === 1 && 'Poor'}
                                {rating === 2 && 'Fair'}
                                {rating === 3 && 'Good'}
                                {rating === 4 && 'Very Good'}
                                {rating === 5 && 'Excellent!'}
                            </p>
                        </div>

                        {/* Comment */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted mb-1.5">
                                <MessageSquare size={12} /> Your Review
                                <span className="font-normal text-ink-subtle">(optional)</span>
                            </label>
                            <textarea
                                rows={3}
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Share your thoughts about this artwork…"
                                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none resize-none focus:border-sienna focus:ring-2 focus:ring-sienna/20"
                            />
                        </div>

                        {/* Photo */}
                        <div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhoto}
                                className="hidden"
                            />
                            {photoPreview ? (
                                <>
                                    <div className="relative group">
                                        <img
                                            src={photoPreview}
                                            alt="Review photo"
                                            className="h-32 w-full rounded-xl object-cover border border-border cursor-pointer"
                                            onClick={() => setPhotoExpanded(true)}
                                        />
                                        <div
                                            className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer"
                                            onClick={() => setPhotoExpanded(true)}
                                        >
                                            <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                                            className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {photoExpanded && <ImageLightbox src={photoPreview} alt="Review photo" onClose={() => setPhotoExpanded(false)} />}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm text-ink-muted hover:border-sienna/40 hover:text-sienna transition-colors"
                                >
                                    <Camera size={16} /> Add a photo of the artwork
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Section 2: Meetup Experience (optional) ──── */}
                    {isMeetup && (
                        <div className="space-y-3 border-t border-border pt-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                <MapPin size={11} className="inline -mt-0.5" /> Meetup Experience
                                <span className="font-normal normal-case tracking-normal text-ink-subtle ml-1">(optional)</span>
                            </p>
                            <div className="flex flex-col items-center gap-2 py-1">
                                <p className="text-sm font-medium text-ink">How was the meetup?</p>
                                <StarRating value={meetupRating} onChange={setMeetupRating} size={24} />
                                <p className="text-xs text-ink-muted">
                                    {meetupRating === 0 && 'Skip or tap to rate'}
                                    {meetupRating >= 1 && meetupRating <= 2 && 'Could be better'}
                                    {meetupRating === 3 && 'It was okay'}
                                    {meetupRating >= 4 && 'Great experience!'}
                                </p>
                            </div>
                            <textarea
                                rows={2}
                                value={meetupComment}
                                onChange={e => setMeetupComment(e.target.value)}
                                placeholder="Was the artist on time? Was the spot easy to find?"
                                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none resize-none focus:border-sienna focus:ring-2 focus:ring-sienna/20"
                            />
                        </div>
                    )}

                    {/* ── Section 2b: Delivery Experience (optional) ──── */}
                    {isDelivery && (
                        <div className="space-y-3 border-t border-border pt-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                                <Truck size={11} className="inline -mt-0.5" /> Delivery Experience
                                <span className="font-normal normal-case tracking-normal text-ink-subtle ml-1">(optional)</span>
                            </p>
                            <div className="flex flex-col items-center gap-2 py-1">
                                <p className="text-sm font-medium text-ink">How was the delivery?</p>
                                <StarRating value={deliveryRating} onChange={setDeliveryRating} size={24} />
                                <p className="text-xs text-ink-muted">
                                    {deliveryRating === 0 && 'Skip or tap to rate'}
                                    {deliveryRating >= 1 && deliveryRating <= 2 && 'Could be better'}
                                    {deliveryRating === 3 && 'It was okay'}
                                    {deliveryRating >= 4 && 'Great experience!'}
                                </p>
                            </div>
                            <textarea
                                rows={2}
                                value={deliveryComment}
                                onChange={e => setDeliveryComment(e.target.value)}
                                placeholder="Was the driver on time? Was the artwork handled carefully?"
                                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none resize-none focus:border-sienna focus:ring-2 focus:ring-sienna/20"
                            />
                        </div>
                    )}

                    {/* ── Actions ──────────────────────────────────── */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-border bg-canvas py-2.5 text-sm font-semibold text-ink-muted hover:bg-stone-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={rating === 0 || submitting}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {submitting
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Send size={14} />}
                            {submitting ? 'Submitting…' : 'Submit Review'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
