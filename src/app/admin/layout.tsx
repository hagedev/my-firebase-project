'use client';

import { useUser, useFirestore, useAuth, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const { toast } = useToast();

  useEffect(() => {
    // PENTING: Jangan lakukan apa pun sampai Firebase Auth selesai memuat status pengguna.
    if (isUserLoading) {
      return; 
    }

    const checkUserRole = async () => {
      // Jika tidak ada pengguna yang login, arahkan ke halaman registrasi
      if (!user) {
        if (pathname !== '/admin/register') {
          router.replace('/admin/register');
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

      // Jika dokumen super admin sudah ada, pengguna terverifikasi.
      if (superAdminDoc?.exists()) {
           if (pathname === '/admin/login' || pathname === '/admin/register') {
              router.replace('/admin/dashboard');
           }
           setIsVerifying(false);
           return;
      }

      // Jika dokumen belum ada, ini adalah login pertama setelah registrasi.
      // Kita coba buat dokumen super admin untuk pengguna ini.
      // Aturan keamanan yang baru akan mengizinkan operasi ini.
      const superAdminData = {
          userId: user.uid,
          email: user.email,
          role: 'superadmin',
          assignedAt: serverTimestamp(),
      };
      
      setDoc(superAdminRef, superAdminData)
        .then(() => {
            toast({ title: "Akun Super Admin Dibuat", description: "Anda sekarang adalah super admin pertama." });
            router.replace('/admin/dashboard');
        })
        .catch(() => {
            // Jika ini gagal, berarti ada masalah dengan aturan keamanan.
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: superAdminRef.path,
                operation: 'create',
                requestResourceData: superAdminData
            }));
            // Keluar dan kembali ke halaman registrasi jika pembuatan gagal.
            auth.signOut();
            router.replace('/admin/register');
        })
        .finally(() => {
            setIsVerifying(false);
        });
    };

    checkUserRole();
  }, [user, isUserLoading, router, pathname, firestore, auth, toast]);

  if (isVerifying || isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (pathname === '/admin/register' || pathname === '/admin/login') {
     return <>{children}</>;
  }

  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  return null;
}
