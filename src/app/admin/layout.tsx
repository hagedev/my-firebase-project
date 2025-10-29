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
  
  // Tampilkan children secara langsung. 
  // Halaman dashboard (children) akan menangani UI loading-nya sendiri.
  // Logika useEffect di atas akan menangani redirect jika diperlukan.
  return <>{children}</>;
}
