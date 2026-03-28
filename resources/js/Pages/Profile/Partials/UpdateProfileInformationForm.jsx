import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { User, Mail, ShieldCheck } from 'lucide-react';

export default function UpdateProfileInformationForm({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    const ROLE_META = {
        admin:  { label: 'Admin',  cls: 'bg-red-100 text-red-700' },
        artist: { label: 'Artist', cls: 'bg-blue-100 text-blue-700' },
        buyer:  { label: 'Buyer',  cls: 'bg-emerald-100 text-emerald-700' },
        driver: { label: 'Driver', cls: 'bg-amber-100 text-amber-800' },
    };
    const roleMeta = ROLE_META[user.role] ?? { label: user.role, cls: 'bg-gray-100 text-gray-700' };

    return (
        <section className={className}>
            <header className="mb-6">
                <h3 className="font-display text-2xl font-semibold text-ink">
                    Profile Information
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                    Update your display name and email address.
                </p>
            </header>

            {/* Role badge — read only */}
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-canvas px-4 py-3">
                <ShieldCheck size={16} className="text-ink-muted flex-shrink-0" />
                <div>
                    <p className="text-xs text-ink-muted">Account type</p>
                    <span className={`mt-0.5 inline-block rounded px-2 py-0.5 text-xs font-semibold ${roleMeta.cls}`}>
                        {roleMeta.label}
                    </span>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {/* Name */}
                <div>
                    <label
                        htmlFor="name"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                    >
                        <User size={14} className="text-ink-muted" />
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoFocus
                        autoComplete="name"
                        className="block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                    />
                    <InputError message={errors.name} className="mt-1.5" />
                </div>

                {/* Email */}
                <div>
                    <label
                        htmlFor="email"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                    >
                        <Mail size={14} className="text-ink-muted" />
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                        className="block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20"
                    />
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                {/* Email verification notice */}
                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-800">
                            Your email address is unverified.{' '}
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="font-medium underline underline-offset-2 hover:text-amber-900"
                            >
                                Resend verification email.
                            </Link>
                        </p>
                        {status === 'verification-link-sent' && (
                            <p className="mt-1.5 text-sm font-medium text-emerald-700">
                                Verification link sent to your email.
                            </p>
                        )}
                    </div>
                )}

                {/* Save */}
                <div className="flex items-center gap-4 pt-1">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-md bg-sienna px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-60"
                    >
                        {processing ? 'Saving…' : 'Save Changes'}
                    </button>
                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-medium text-emerald-600">
                            ✓ Saved successfully
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}