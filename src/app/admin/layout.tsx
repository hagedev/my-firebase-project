'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getFirestore } from 'firebase/firestore';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useMemo(() => getFirestore(), []);

  const superAdminRoleRef = useMemoFirebase(() => 
    user ? doc(firestore, `roles_superadmin/${user.uid}`) : null
  , [firestore, user]);

  const { data: superAdminRole, isLoading: isRoleLoading } = useDoc(superAdminRoleRef);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // 1. Jangan lakukan apa pun jika data user atau data role masih loading.
    // Ini adalah kunci utama untuk mencegah race condition.
    if (isUserLoading || (user && isRoleLoading)) {
      return;
    }

    // 2. Jika loading selesai dan user tidak ada
    if (!user) {
      // Jika mencoba akses halaman admin selain login, redirect ke login.
      if (!isLoginPage) {
        router.replace('/admin/login');
      }
      // Jika sudah di halaman login, biarkan saja.
      return;
    }

    // 3. Jika loading selesai dan user ada
    const isSuperAdmin = !!superAdminRole;

    if (isSuperAdmin) {
      // Jika super admin ada di halaman login, redirect ke dashboard.
      if (isLoginPage) {
        router.replace('/admin');
      }
    } else {
      // Jika user login tapi bukan super admin, tendang ke login dengan pesan error.
      if (!isLoginPage) {
        router.replace('/admin/login?error=unauthorized');
      }
    }

  }, [user, isUserLoading, superAdminRole, isRoleLoading, router, pathname, isLoginPage]);

  // Tampilkan loading screen jika sedang memeriksa di halaman terproteksi
  const isCheckingAccess = (isUserLoading || (user && isRoleLoading)) && !isLoginPage;
  if (isCheckingAccess) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Tampilkan konten jika:
  // 1. Berada di halaman login (dan tidak sedang diredirect)
  // 2. Pengguna adalah super admin yang sudah diverifikasi
  const isSuperAdmin = user && superAdminRole;
  if (isLoginPage || isSuperAdmin) {
     return <>{children}</>;
  }

  // Untuk semua kasus lain (mis. sebelum redirect terjadi), jangan render apa-apa.
  return null;
}
