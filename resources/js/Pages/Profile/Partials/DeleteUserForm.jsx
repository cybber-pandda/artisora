import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { TriangleAlert, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({ className = '' }) {
    const [confirming, setConfirming] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({ password: '' });

    const deleteUser = (e) => {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirming(false);
        clearErrors();
        reset();
    };

    return (
        <section className={className}>
            <header className="mb-6">
                <h3 className="font-display text-2xl font-semibold text-red-700">
                    Delete Account
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                </p>
            </header>

            {/* Warning notice */}
            <div className="mb-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <TriangleAlert size={16} className="mt-0.5 flex-shrink-0 text-red-500" />
                <p className="text-sm text-red-700">
                    Before deleting, please download any data you wish to retain.
                    All resources will be permanently removed.
                </p>
            </div>

            <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 shadow-xs transition-colors hover:bg-red-100"
            >
                <Trash2 size={15} />
                Delete My Account
            </button>

            {/* Confirmation modal */}
            <Modal show={confirming} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    {/* Modal header */}
                    <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                            <TriangleAlert size={18} className="text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-display text-xl font-semibold text-ink">
                                Are you absolutely sure?
                            </h3>
                            <p className="mt-1 text-sm text-ink-muted">
                                This will permanently delete your account and all of its data.
                                Enter your password to confirm.
                            </p>
                        </div>
                    </div>

                    {/* Password confirmation */}
                    <div className="mt-4">
                        <label
                            htmlFor="delete_password"
                            className="mb-1.5 block text-sm font-medium text-ink-soft"
                        >
                            Your Password
                        </label>
                        <input
                            id="delete_password"
                            type="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Enter your password"
                            className="block w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-ink-subtle shadow-xs transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                            autoFocus
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink-soft shadow-xs transition-colors hover:bg-canvas hover:text-ink"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-red-700 disabled:opacity-60"
                        >
                            <Trash2 size={14} />
                            {processing ? 'Deleting…' : 'Yes, Delete Account'}
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}