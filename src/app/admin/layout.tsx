'use client';

import { ReactNode, useEffect } from 'react';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Jangan lakukan apapun jika status user masih loading
    if (isUserLoading) {
      return;
    }

    // Jika loading selesai dan user TIDAK ADA,
    // dan dia mencoba akses halaman selain login, tendang ke login.
    if (!user && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
    
    // Jika loading selesai dan user ADA, tapi dia masih di halaman login,
    // (ini terjadi setelah redirect dari login sukses), arahkan ke dashboard.
    // Pengecekan peran sudah terjadi di halaman login, jadi kita bisa asumsikan
    // user yang ada di sini adalah user yang sah.
    if (user && pathname === '/admin/login') {
        router.replace('/admin');
    }

  }, [user, isUserLoading, pathname, router]);

  // Selama loading, tampilkan layar loading agar tidak ada kedipan UI
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Jika tidak loading, tampilkan konten.
  // Logika di useEffect akan menangani redirect jika tidak sah.
  return <>{children}</>;
}
