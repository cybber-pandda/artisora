import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { Users, Package, ShieldCheck, TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard({ stats }) {
    const cards = [
        { label: 'Total Users',     value: stats?.totalUsers     ?? 0, icon: Users,       color: 'text-sky-400',     bg: 'bg-sky-500/10' },
        { label: 'Pending Drivers', value: stats?.pendingDrivers ?? 0, icon: ShieldCheck,  color: 'text-amber-400',   bg: 'bg-amber-500/10', href: '/admin/approvals' },
        { label: 'Active Listings', value: stats?.activeListings ?? 0, icon: TrendingUp,   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Orders Today',    value: stats?.ordersToday    ?? 0, icon: Package,      color: 'text-violet-400',  bg: 'bg-violet-500/10' },
    ];

    return (
        <AppLayout title="Dashboard">
            <div className="max-w-5xl space-y-8">
                <div>
                    <h2 className="font-display text-4xl font-semibold text-ink">Admin Dashboard</h2>
                    <p className="mt-1 text-base text-ink-muted">Manage users, orders, and platform settings.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {cards.map((card, i) => {
                        const Icon = card.icon;
                        const inner = (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07, duration: 0.3 }}
                                className={`rounded-xl border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-md ${card.href ? 'cursor-pointer' : ''}`}
                            >
                                <div className={`mb-3 inline-flex rounded-lg p-2 ${card.bg}`}>
                                    <Icon size={20} className={card.color} />
                                </div>
                                <p className="font-display text-3xl font-semibold text-ink">{card.value}</p>
                                <div className="mt-1 flex items-center justify-between">
                                    <p className="text-xs text-ink-muted">{card.label}</p>
                                    {card.href && (
                                        <ArrowRight size={14} className="text-ink-muted" />
                                    )}
                                </div>
                            </motion.div>
                        );

                        return card.href
                            ? <Link key={card.label} href={card.href}>{inner}</Link>
                            : <div key={card.label}>{inner}</div>;
                    })}
                </div>

                {/* Quick action: pending approvals */}
                {(stats?.pendingDrivers ?? 0) > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.3 }}
                        className="rounded-xl border border-amber-200/30 bg-amber-500/5 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                                    <ShieldCheck size={20} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-ink">
                                        {stats.pendingDrivers} driver{stats.pendingDrivers > 1 ? 's' : ''} awaiting approval
                                    </p>
                                    <p className="text-xs text-ink-muted">
                                        Review and verify pending driver applications
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/admin/approvals"
                                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600"
                            >
                                Review <ArrowRight size={14} />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </div>
        </AppLayout>
    );
}