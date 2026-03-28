import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Truck, Package, Ruler, Weight, Clock, CheckCircle,
    AlertCircle, MapPin, Navigation, ChevronRight,
} from 'lucide-react';

const STATUS_CONFIG = {
    pending_driver: { label: 'Pending Acceptance', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
    searching:      { label: 'Searching for Driver', color: 'bg-blue-100 text-blue-800 border-blue-200',   dot: 'bg-blue-500' },
    picked_up:      { label: 'Head to Pickup →',     color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
    in_transit:     { label: 'In Transit 🚐',          color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    delivered:      { label: 'Delivered ✓',           color: 'bg-stone-100 text-stone-600 border-stone-200', dot: 'bg-stone-400' },
};

function JobCard({ job }) {
    const status = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending_driver;
    const isPending   = job.type === 'private' && job.status === 'pending_driver';
    const isActive    = ['picked_up', 'in_transit'].includes(job.status);
    const isDelivered = job.status === 'delivered';

    const accept = () => router.post(route('driver.accept', job.id), {}, { preserveScroll: true });

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`overflow-hidden rounded-2xl border shadow-xs ${
                isPending ? 'border-amber-300' :
                isActive  ? 'border-sienna/30' : 'border-border'
            } bg-surface`}
        >
            <div className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xl">
                    🎨
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{job.artwork_title}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                        </span>
                        {job.type === 'private' && (
                            <span className="rounded-full bg-sienna/10 px-2.5 py-0.5 text-xs font-semibold text-sienna">
                                Private
                            </span>
                        )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
                        {job.dimensions && (
                            <span className="flex items-center gap-1">
                                <Ruler size={11} /> {job.dimensions}
                            </span>
                        )}
                        {job.weight && (
                            <span className="flex items-center gap-1">
                                <Weight size={11} /> {job.weight} kg
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock size={11} /> +{job.buffer_time}min buffer
                        </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                        <MapPin size={11} className="flex-shrink-0" />
                        From: <strong className="text-ink-soft">{job.artist_name}</strong>
                    </div>
                </div>
            </div>

            {!isDelivered && (
                <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                    Fragile artwork — handle with care. ETA includes {job.buffer_time}min packing buffer.
                </div>
            )}

            <div className="border-t border-border p-4 space-y-2">
                {/* Accept private job */}
                {isPending && (
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={accept}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                        <CheckCircle size={15} /> Accept Private Assignment
                    </motion.button>
                )}

                {/* View active delivery */}
                {(isActive || isDelivered) && (
                    <Link
                        href={route('driver.active-delivery', job.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sienna py-3 text-sm font-semibold text-white transition-colors hover:bg-sienna-600"
                    >
                        <Navigation size={15} />
                        {isActive ? 'View Delivery & Map' : 'View Delivery Details'}
                        <ChevronRight size={14} />
                    </Link>
                )}
            </div>
        </motion.div>
    );
}

export default function MyJobs({ jobs }) {
    const { flash } = usePage().props;

    const pending   = jobs.filter(j => j.status === 'pending_driver');
    const active    = jobs.filter(j => ['picked_up', 'in_transit'].includes(j.status));
    const completed = jobs.filter(j => j.status === 'delivered');

    return (
        <AppLayout title="My Jobs">
            <Head title="My Jobs — Artisora" />

            <div className="mx-auto max-w-3xl space-y-6">

                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="font-display text-4xl font-semibold text-ink">My Jobs</h2>
                        <p className="mt-1 text-base text-ink-muted">Your assigned and active artwork deliveries.</p>
                    </div>
                    <Link
                        href={route('driver.jobs')}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas transition-colors"
                    >
                        Browse More →
                    </Link>
                </div>

                {flash?.success && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                    >
                        <CheckCircle size={15} /> {flash.success}
                    </motion.div>
                )}

                {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
                        <Truck size={36} className="mb-4 text-ink-subtle" />
                        <p className="text-base font-semibold text-ink">No jobs yet</p>
                        <p className="mt-2 text-sm text-ink-muted">Claim a delivery from the marketplace or wait for a private assignment.</p>
                        <Link
                            href={route('driver.jobs')}
                            className="mt-4 rounded-xl bg-sienna px-5 py-2.5 text-sm font-semibold text-white hover:bg-sienna-600"
                        >
                            Browse Available Jobs
                        </Link>
                    </div>
                ) : (
                    <>
                        {active.length > 0 && (
                            <section className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-sienna">
                                    🚐 Active Deliveries ({active.length})
                                </p>
                                {active.map(job => <JobCard key={job.id} job={job} />)}
                            </section>
                        )}

                        {pending.length > 0 && (
                            <section className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                                    ⏳ Awaiting Acceptance ({pending.length})
                                </p>
                                {pending.map(job => <JobCard key={job.id} job={job} />)}
                            </section>
                        )}

                        {completed.length > 0 && (
                            <section className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                                    ✅ Completed ({completed.length})
                                </p>
                                {completed.map(job => <JobCard key={job.id} job={job} />)}
                            </section>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
