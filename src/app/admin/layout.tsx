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

  useEffect(() => {
    // Jangan lakukan apa-apa jika data user atau role masih loading
    if (isUserLoading || (user && isRoleLoading)) {
      return;
    }

    const isLoginPage = pathname === '/admin/login';

    // Jika user tidak login
    if (!user) {
      if (!isLoginPage) {
        router.replace('/admin/login');
      }
      return;
    }

    // Jika user sudah login
    // Cek apakah user adalah super admin
    const isSuperAdmin = !!superAdminRole;

    if (isSuperAdmin) {
      // Jika super admin ada di halaman login, redirect ke dashboard
      if (isLoginPage) {
        router.replace('/admin');
      }
    } else {
      // Jika bukan super admin dan tidak di halaman login, redirect ke login
      // Ini juga menangani kasus di mana user login dengan akun non-admin
      if (!isLoginPage) {
        router.replace('/admin/login?error=unauthorized');
      }
    }

  }, [user, isUserLoading, superAdminRole, isRoleLoading, router, pathname]);

  const isLoadingProtectedPage = (isUserLoading || (user && isRoleLoading)) && pathname !== '/admin/login';

  // Tampilkan loading screen jika sedang memeriksa di halaman terproteksi
  if (isLoadingProtectedPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Jika sudah selesai loading dan user adalah super admin, atau jika kita di halaman login
  // tampilkan kontennya. Logika useEffect akan menangani redirect jika perlu.
  const isSuperAdmin = user && superAdminRole;
  if ((isSuperAdmin && !isUserLoading && !isRoleLoading) || pathname === '/admin/login') {
     return <>{children}</>;
  }

  // Untuk kasus lain (misalnya user bukan super admin di halaman terproteksi sebelum redirect),
  // jangan render apa-apa untuk mencegah 'flash of content'.
  return null;
}
