import { useState, useRef, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, Users, Package, ShieldCheck,
    Brush, Tag, Wallet, Store, Heart, MessageCircle,
    Truck, ChevronDown, LogOut, User, Menu, X,
    TrendingUp, Rss, Search, Bell, Home, Compass,
    ShoppingBag, ShoppingCart, Settings,
} from 'lucide-react';

// ── Navigation config ──────────────────────────────────────────
const NAV = {
    admin: [
        { label: 'Dashboard',   href: '/admin/dashboard',  icon: LayoutGrid },
        { label: 'Users',       href: '/admin/users',      icon: Users },
        { label: 'Orders',      href: '/admin/orders',     icon: Package },
        { label: 'Approvals',   href: '/admin/approvals',  icon: ShieldCheck },
    ],
    artist: [
        { label: 'Portfolio',   href: '/artist/portfolio', icon: Brush },
        { label: 'Art Feed',    href: '/feed',             icon: Rss },
        { label: 'My Listings', href: '/artist/listings',  icon: Tag },
        { label: 'Orders',      href: '/artist/orders',    icon: Package },
        { label: 'Earnings',    href: '/artist/earnings',  icon: Wallet },
    ],
    buyer: [
        { label: 'Home',        href: '/feed',             icon: Home },
        { label: 'Explore',     href: '/buyer/shop',       icon: Compass },
        { label: 'Cart',        href: '/buyer/cart',       icon: ShoppingCart },
        { label: 'Orders',      href: '/buyer/orders',     icon: ShoppingBag },
        { label: 'Wishlist',    href: '/buyer/wishlist',   icon: Heart },
        { label: 'Messages',    href: '/buyer/messages',   icon: MessageCircle },
    ],
    driver: [
        { label: 'Jobs',          href: '/driver/jobs',     icon: Truck },
        { label: 'My Deliveries', href: '/driver/my-jobs',  icon: Package },
        { label: 'Earnings',      href: '/driver/earnings', icon: Wallet },
    ],
};

const ROLE_META = {
    admin:  { label: 'Admin',  accent: 'from-red-500 to-rose-600',    badgeCls: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' },
    artist: { label: 'Artist', accent: 'from-violet-500 to-purple-600', badgeCls: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20' },
    buyer:  { label: 'Buyer',  accent: 'from-emerald-500 to-teal-600',  badgeCls: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' },
    driver: { label: 'Driver', accent: 'from-amber-500 to-orange-600',  badgeCls: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
};

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({ name, size = 'md', accent }) {
    const initial = name?.charAt(0).toUpperCase() ?? '?';
    const sizeMap = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-9 h-9 text-sm',
        lg: 'w-10 h-10 text-base',
    };
    return (
        <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${accent || 'from-sienna to-umber'} flex items-center justify-center text-white font-semibold font-sans flex-shrink-0 select-none ring-2 ring-white/10`}>
            {initial}
        </div>
    );
}

// ── Sidebar content ────────────────────────────────────────────
function SidebarContent({ user, role, meta, links, currentPath, onClose }) {
    return (
        <div className="flex h-full flex-col bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a]">
            {/* Logo */}
            <div className="flex h-16 flex-shrink-0 items-center gap-3 px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sienna to-amber-600 shadow-lg shadow-sienna/20">
                    <span className="text-lg leading-none">🎨</span>
                </div>
                <span className="font-display text-xl font-bold tracking-tight text-white">
                    Artisora
                </span>
                {onClose && (
                    <button
                        className="ml-auto rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                        onClick={onClose}
                        aria-label="Close sidebar"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Search bar */}
            <div className="px-4 pb-3 pt-1">
                <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3.5 py-2.5 ring-1 ring-white/10 transition-all focus-within:bg-white/10 focus-within:ring-white/20">
                    <Search size={14} className="text-white/30" />
                    <input
                        type="text"
                        placeholder="Search…"
                        className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                    />
                </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                    {meta.label} Menu
                </p>
                <ul className="space-y-0.5">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive =
                            currentPath === link.href ||
                            currentPath.startsWith(link.href + '/');
                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'bg-white/10 text-white shadow-sm'
                                            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                                    }`}
                                >
                                    {/* Active indicator line */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNav"
                                            className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b ${meta.accent}`}
                                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                    <Icon
                                        size={18}
                                        className={`flex-shrink-0 transition-colors ${
                                            isActive ? 'text-white' : 'text-white/40 group-hover:text-white/60'
                                        }`}
                                    />
                                    {link.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Settings link */}
            <div className="px-3 pb-2">
                <Link
                    href={route('profile.edit')}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
                >
                    <Settings size={18} />
                    Settings
                </Link>
            </div>

            {/* User card — links to own profile */}
            <div className="flex-shrink-0 border-t border-white/5 px-4 py-4">
                <Link
                    href={`/profile/${user?.id}`}
                    className="flex items-center gap-3 rounded-xl px-1 py-1 -mx-1 transition-colors hover:bg-white/5"
                >
                    <Avatar name={user?.name} size="md" accent={meta.accent} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                            {user?.name}
                        </p>
                        <span className={`mt-0.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badgeCls}`}>
                            {meta.label}
                        </span>
                    </div>
                </Link>
            </div>
        </div>
    );
}

// ── Main Layout ────────────────────────────────────────────────
export default function AppLayout({ title, children }) {
    const { auth } = usePage().props;
    const user        = auth.user;
    const role        = user?.role ?? 'buyer';
    const links       = NAV[role] ?? [];
    const meta        = ROLE_META[role];

    const [mobileOpen, setMobileOpen]     = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const handleLogout = () => router.post(route('logout'));

    return (
        <>
            <Head title={title ? `${title} — Artisora` : 'Artisora'} />

            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;400;500;600&display=swap"
            />

            <div className="flex h-screen overflow-hidden bg-canvas font-sans">

                {/* ── DESKTOP SIDEBAR ─────────────────────────────── */}
                <aside className="hidden md:flex w-sidebar flex-shrink-0 flex-col">
                    <SidebarContent
                        user={user}
                        role={role}
                        meta={meta}
                        links={links}
                        currentPath={currentPath}
                        onClose={null}
                    />
                </aside>

                {/* ── MOBILE SIDEBAR ──────────────────────────────── */}
                <AnimatePresence>
                    {mobileOpen && (
                        <>
                            <motion.div
                                key="backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                                onClick={() => setMobileOpen(false)}
                            />

                            <motion.div
                                key="drawer"
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="fixed inset-y-0 left-0 z-50 w-72 shadow-2xl md:hidden"
                            >
                                <SidebarContent
                                    user={user}
                                    role={role}
                                    meta={meta}
                                    links={links}
                                    currentPath={currentPath}
                                    onClose={() => setMobileOpen(false)}
                                />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── Main area ───────────────────────────────────── */}
                <div className="flex flex-1 flex-col overflow-hidden">

                    {/* ── Top Navbar ──────────────────────────────── */}
                    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">

                        {/* Left: hamburger + title */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setMobileOpen(true)}
                                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink md:hidden"
                                aria-label="Open menu"
                            >
                                <Menu size={20} />
                            </button>
                            {title && (
                                <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
                                    {title}
                                </h1>
                            )}
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-2">
                            {/* Notification bell */}
                            <button className="relative rounded-lg p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink">
                                <Bell size={18} />
                                {/* Notification dot */}
                                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
                            </button>

                            {/* Profile dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setDropdownOpen((v) => !v)}
                                    className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors ${
                                        dropdownOpen ? 'bg-canvas' : 'hover:bg-canvas'
                                    }`}
                                >
                                    <Avatar name={user?.name} size="sm" accent={meta.accent} />
                                    <div className="hidden text-left sm:block">
                                        <p className="text-sm font-medium leading-tight text-ink">
                                            {user?.name}
                                        </p>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: dropdownOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown size={14} className="text-ink-muted" />
                                    </motion.div>
                                </motion.button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                    {dropdownOpen && (
                                        <motion.div
                                            key="dropdown"
                                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                            transition={{ duration: 0.12, ease: 'easeOut' }}
                                            className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
                                        >
                                            {/* User info */}
                                            <div className="border-b border-border px-4 py-3">
                                                <p className="text-sm font-semibold text-ink">{user?.name}</p>
                                                <p className="mt-0.5 truncate text-xs text-ink-muted">{user?.email}</p>
                                                <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badgeCls}`}>
                                                    {meta.label}
                                                </span>
                                            </div>

                                            {/* Links */}
                                            <div className="py-1">
                                                <Link
                                                    href={route('profile.edit')}
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    <User size={14} className="text-ink-muted" />
                                                    Profile
                                                </Link>
                                                <Link
                                                    href={route('profile.edit')}
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    <Settings size={14} className="text-ink-muted" />
                                                    Settings
                                                </Link>
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-border py-1">
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
                                                >
                                                    <LogOut size={14} />
                                                    Sign out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="flex-1 overflow-y-auto">
                        <motion.div
                            key={currentPath}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="h-full p-5 md:p-8"
                        >
                            {children}
                        </motion.div>
                    </main>
                </div>
            </div>
        </>
    );
}