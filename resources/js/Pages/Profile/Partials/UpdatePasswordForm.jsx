import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }
                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    const fieldClass =
        'block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-sienna focus:outline-none focus:ring-2 focus:ring-sienna/20';

    return (
        <section className={className}>
            <header className="mb-6">
                <h3 className="font-display text-2xl font-semibold text-ink">
                    Update Password
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                    Use a long, random password to keep your account secure.
                </p>
            </header>

            <form onSubmit={updatePassword} className="space-y-5">
                {/* Current password */}
                <div>
                    <label
                        htmlFor="current_password"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                    >
                        <Lock size={14} className="text-ink-muted" />
                        Current Password
                    </label>
                    <input
                        id="current_password"
                        type="password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        autoComplete="current-password"
                        className={fieldClass}
                    />
                    <InputError message={errors.current_password} className="mt-1.5" />
                </div>

                {/* New password */}
                <div>
                    <label
                        htmlFor="password"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                    >
                        <KeyRound size={14} className="text-ink-muted" />
                        New Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        autoComplete="new-password"
                        className={fieldClass}
                    />
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                {/* Confirm password */}
                <div>
                    <label
                        htmlFor="password_confirmation"
                        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft"
                    >
                        <ShieldCheck size={14} className="text-ink-muted" />
                        Confirm New Password
                    </label>
                    <input
                        id="password_confirmation"
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        autoComplete="new-password"
                        className={fieldClass}
                    />
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>

                {/* Save */}
                <div className="flex items-center gap-4 pt-1">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-md bg-sienna px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-sienna-600 disabled:opacity-60"
                    >
                        {processing ? 'Saving…' : 'Update Password'}
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
                            ✓ Password updated
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}