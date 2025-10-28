'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { SuperAdminSidebar } from './components/sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      return; // Tunggu hingga status auth selesai dimuat
    }

    const checkAdminStatus = async () => {
      const isPublicPage =
        pathname === '/admin/login' || pathname === '/admin/register';

      if (!user) {
        if (isPublicPage) {
          setIsVerifying(false);
        } else {
          router.replace('/admin/login');
        }
        return;
      }

      // Pengguna sudah login, periksa dokumennya di Firestore
      const userRef = doc(firestore, `users/${user.uid}`);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (e) {
        console.error("Gagal memeriksa dokumen pengguna:", e);
        await auth.signOut();
        router.replace('/admin/login');
        return;
      }
      

      // JIKA DOKUMEN PENGGUNA TIDAK ADA: Ini mungkin login pertama super admin
      if (!userSnap.exists()) {
        try {
          const batch = writeBatch(firestore);

          // Buat dokumen pengguna
          batch.set(userRef, {
            id: user.uid,
            email: user.email,
            role: 'superadmin',
          });

          // Buat dokumen peran untuk validasi aturan keamanan
          const roleDocRef = doc(firestore, 'roles_superadmin', user.uid);
          batch.set(roleDocRef, {
            userId: user.uid,
            assignedAt: serverTimestamp(),
          });

          await batch.commit();

          // Ambil kembali snapshot pengguna setelah dibuat
          userSnap = await getDoc(userRef);
        } catch (e) {
          console.error("Gagal membuat dokumen super admin:", e);
          // Jika gagal (misalnya karena aturan menolak), logout pengguna
          await auth.signOut();
          router.replace('/admin/login');
          return;
        }
      }
      
      const userData = userSnap.data();

      // CHECK 1: Apakah pengguna superadmin?
      if (userData?.role === 'superadmin') {
        if (isPublicPage) {
          router.replace('/admin/dashboard'); // Arahkan dari login/register ke dasbor
        } else {
          setIsVerifying(false); // Izinkan akses ke halaman terproteksi
        }
        return;
      }
      
      // CHECK 2: Apakah pengguna admin kafe? (Dan mencoba akses halaman super admin)
      if (userData?.role === 'admin_kafe') {
          const tenantRef = doc(firestore, `tenants/${userData.tenantId}`);
          const tenantSnap = await getDoc(tenantRef);
          if (tenantSnap.exists()) {
              // Pengguna ini adalah admin kafe yang valid, tapi di area yang salah.
              // Arahkan mereka ke dasbor tenant mereka.
              router.replace(`/${tenantSnap.data().slug}/admin`);
          } else {
              // Admin kafe dengan tenantId tidak valid, logout.
              await auth.signOut();
              router.replace('/admin/login');
          }
          return;
      }
        
      // Jika dokumen pengguna tidak ada, atau peran tidak dikenali, mereka tidak diizinkan.
      await auth.signOut();
      router.replace('/admin/login');
    };

    checkAdminStatus();
  }, [user, isUserLoading, router, pathname, firestore, auth]);

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return <>{children}</>;
  }

  return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
}
