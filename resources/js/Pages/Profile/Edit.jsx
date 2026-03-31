import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdateMeetupLocationForm from './Partials/UpdateMeetupLocationForm';
import UpdatePickupLocationForm from './Partials/UpdatePickupLocationForm';

export default function Edit({ mustVerifyEmail, status, isArtist, meetupLocation, pickupLocation }) {
    return (
        <AppLayout title="My Profile">
            <Head title="Profile" />

            <div className="mx-auto max-w-3xl space-y-6">
                {/* Page heading */}
                <div>
                    <h2 className="font-display text-4xl font-semibold text-ink">
                        My Profile
                    </h2>
                    <p className="mt-1 text-base text-ink-muted">
                        Manage your personal information, password, and account settings.
                    </p>
                </div>

                {/* Profile Information */}
                <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </div>

                {/* Meet-up Location — artists only */}
                {isArtist && (
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
                        <UpdateMeetupLocationForm meetupLocation={meetupLocation} />
                    </div>
                )}

                {/* Pickup Location — artists only */}
                {isArtist && (
                    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
                        <UpdatePickupLocationForm pickupLocation={pickupLocation} />
                    </div>
                )}

                {/* Update Password */}
                <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
                    <UpdatePasswordForm />
                </div>

                {/* Delete Account */}
                <div className="rounded-xl border border-red-100 bg-surface p-6 shadow-xs">
                    <DeleteUserForm />
                </div>
            </div>
        </AppLayout>
    );
}