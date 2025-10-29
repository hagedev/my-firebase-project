'use client';

import { useUser, useFirestore, useAuth, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { SuperAdminSidebar } from './components/sidebar';
import { useToast } from '@/hooks/use-toast';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // PENTING: Jangan lakukan apa pun sampai Firebase Auth selesai memuat status pengguna.
    if (isUserLoading) {
      return; 
    }

    const checkUserRole = async () => {
      // Jika tidak ada pengguna yang login, arahkan ke halaman login
      // Kecuali jika mereka sudah berada di halaman register atau login.
      if (!user) {
        if (pathname !== '/admin/register' && pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
        setIsVerifying(false);
        return;
      }
      
      // Jika pengguna sudah login, kita coba verifikasi perannya
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminDoc = await getDoc(superAdminRef).catch(err => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: superAdminRef.path, operation: 'get' }));
         return null;
      });

      // Jika dokumen super admin ada, pengguna terverifikasi.
      if (superAdminDoc?.exists()) {
           if (pathname === '/admin/login' || pathname === '/admin/register') {
              router.replace('/admin/dashboard');
           } else {
             setIsVerifying(false);
           }
           return;
      }

      // Jika dokumen tidak ada, berarti pengguna ini bukan super admin.
      // Kita logout paksa dan arahkan ke halaman login admin.
      toast({
        variant: "destructive",
        title: "Akses Ditolak",
        description: "Akun Anda tidak memiliki hak akses super admin."
      })
      await auth.signOut();
      router.replace('/admin/login');
      setIsVerifying(false);
    };

    checkUserRole();
  }, [user, isUserLoading, router, pathname, firestore, auth, useToast]);

  if (isVerifying || isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Izinkan rendering halaman register atau login jika verifikasi selesai
  if (pathname === '/admin/register' || pathname === '/admin/login') {
     return <>{children}</>;
  }

  // Jika semua verifikasi lolos dan pengguna ada, tampilkan layout admin
  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  // Fallback, seharusnya tidak pernah tercapai
  return null;
}
