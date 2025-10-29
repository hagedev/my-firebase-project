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
    if (user && pathname === '/admin/login') {
        router.replace('/admin');
    }

  }, [user, isUserLoading, pathname, router]);
  
  // Selama auth state masih loading, tampilkan UI loading untuk mencegah flash
  // konten yang tidak seharusnya dilihat.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  // Tampilkan children (halaman login atau dashboard) setelah loading selesai.
  // Logika useEffect di atas sudah menangani pengalihan jika diperlukan.
  return <>{children}</>;
}
