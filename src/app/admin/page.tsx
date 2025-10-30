'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Halaman ini sekarang hanya berfungsi sebagai pengalih (redirector)
export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    // Selalu alihkan dari /admin ke /admin/cafe-management
    router.replace('/admin/cafe-management');
  }, [router]);

  // Tampilkan loading state atau null selagi redirect terjadi
  return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
}