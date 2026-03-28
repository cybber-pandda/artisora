import AppLayout from '@/Layouts/AppLayout';

export default function Portfolio() {
    return (
        <AppLayout title="My Portfolio">
            <div className="max-w-4xl">
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', color: '#1C1917', fontWeight: 600 }}>
                    My Portfolio
                </h2>
                <p style={{ color: '#7C5C3E', marginTop: 6, fontFamily: 'DM Sans, sans-serif' }}>
                    Manage your artwork listings and showcase your work.
                </p>
                <div className="mt-8 p-8 rounded-xl border-2 border-dashed border-stone-300 text-center">
                    <p style={{ fontSize: '2rem' }}>🖼️</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#7C5C3E', marginTop: 8 }}>Upload your first artwork to get started.</p>
                </div>
            </div>
        </AppLayout>
    );
}