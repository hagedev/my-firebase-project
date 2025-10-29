'use client';

import { ReactNode, useEffect } from 'react';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Jangan lakukan apa-apa jika status user masih dimuat.
    // Ini mencegah keputusan prematur.
    if (isUserLoading) {
      return;
    }

    const isLoginPage = pathname === '/admin/login';

    // Kondisi 1: User TIDAK ADA, tapi mencoba akses halaman admin (bukan login)
    // Paksa kembali ke halaman login.
    if (!user && !isLoginPage) {
      router.replace('/admin/login');
    }

    // Kondisi 2: User SUDAH ADA, tapi masih berada di halaman login
    // (misalnya setelah berhasil login atau menekan tombol back)
    // Arahkan ke dashboard.
    if (user && isLoginPage) {
      router.replace('/admin');
    }

    // Untuk semua kasus lain (user ada dan di halaman admin, atau user tidak ada dan di halaman login),
    // tidak perlu dilakukan redirect. Biarkan komponen merender children.
    
  }, [user, isUserLoading, pathname, router]);

  // Logika Render:
  // 1. Jika masih loading, tampilkan UI loading untuk mencegah "flash" konten yang salah.
  // 2. Jika user tidak ada DAN kita tidak di halaman login, jangan render apa-apa (return null),
  //    karena useEffect di atas akan segera mengurus redirect. Ini mencegah dashboard muncul sesaat.
  // 3. Selain itu, tampilkan children (baik halaman login atau halaman dashboard yang sah).
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!user && pathname !== '/admin/login') {
    return null;
  }
  
  return <>{children}</>;
}
