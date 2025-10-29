'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getFirestore } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = getFirestore();

  const superAdminRoleRef = useMemoFirebase(() => 
    user ? doc(firestore, `roles_superadmin/${user.uid}`) : null
  , [firestore, user]);

  const { data: superAdminRole, isLoading: isRoleLoading } = useDoc(superAdminRoleRef);

  useEffect(() => {
    // Jika masih dalam proses loading, jangan lakukan apa-apa
    if (isUserLoading || isRoleLoading) {
      return;
    }

    // Jika pengguna tidak login dan tidak berada di halaman login, arahkan ke login
    if (!user && pathname !== '/admin/login') {
      router.replace('/admin/login');
      return;
    }

    // Jika pengguna sudah login
    if (user) {
      // Jika sudah login dan mencoba akses halaman login, arahkan ke dashboard
      if (pathname === '/admin/login') {
        router.replace('/admin');
        return;
      }
      
      // Jika pengguna bukan super admin, tendang keluar
      if (!superAdminRole) {
        router.replace('/admin/login?error=unauthorized');
      }
    }
  }, [user, isUserLoading, superAdminRole, isRoleLoading, router, pathname]);

  // Tampilkan layar loading selama otentikasi atau pengecekan peran
  if ((isUserLoading || (user && isRoleLoading)) && pathname !== '/admin/login') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Jika sudah diverifikasi sebagai super admin, atau jika berada di halaman login, tampilkan konten
  if ((user && superAdminRole) || pathname === '/admin/login') {
    return <>{children}</>;
  }


  // Fallback untuk kasus lain, meskipun idealnya tidak akan pernah sampai sini
  return null;
}
