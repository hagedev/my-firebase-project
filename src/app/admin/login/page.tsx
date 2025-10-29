'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Halaman ini sekarang hanya berfungsi sebagai pengalih.
// Logika utama ada di /admin/register.
// Jika super admin sudah ada, pengguna akan diarahkan dari sini ke /admin/register.
export default function AdminLoginPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/register');
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <p>Mengarahkan...</p>
        </div>
    );
}
