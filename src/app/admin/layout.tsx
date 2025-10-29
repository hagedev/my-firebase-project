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
    if (isUserLoading) {
      return; // Tunggu sampai status auth selesai dimuat.
    }

    const checkUserRole = async () => {
      // Jika tidak ada user, arahkan ke login, kecuali sudah di sana.
      if (!user) {
        if (pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
        setIsVerifying(false);
        return;
      }
      
      // Ada user, sekarang verifikasi perannya.
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const userRef = doc(firestore, 'users', user.uid);

      try {
        const [superAdminDoc, userDoc] = await Promise.all([
            getDoc(superAdminRef),
            getDoc(userRef)
        ]);

        if (superAdminDoc.exists()) {
          // KASUS 1: Pengguna adalah Super Admin.
          if (pathname === '/admin/login') {
            router.replace('/admin/dashboard');
          } else {
            setIsVerifying(false);
          }
        } else if (userDoc.exists() && userDoc.data().role === 'admin_kafe') {
            // KASUS 2: Pengguna adalah Admin Kafe, bukan Super Admin.
            const tenantRef = doc(firestore, 'tenants', userDoc.data().tenantId);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
                router.replace(`/${tenantSnap.data().slug}/admin/dashboard`);
            } else {
                 throw new Error("Data tenant untuk admin kafe tidak ditemukan.");
            }
        } else {
            // KASUS 3: Pengguna bukan Super Admin & bukan Admin Kafe.
            // Ini adalah alur untuk GENERATE SUPER ADMIN PERTAMA.
            const superAdminData = {
                userId: user.uid,
                email: user.email,
                role: 'superadmin',
                assignedAt: serverTimestamp(),
            };

            // Coba buat dokumen. Aturan keamanan akan mengizinkan jika ini yang pertama.
            await setDoc(superAdminRef, superAdminData);

            toast({
                title: "Selamat Datang, Super Admin!",
                description: "Akun Anda telah berhasil dibuat sebagai super admin pertama.",
            });
            router.replace('/admin/dashboard'); // Langsung arahkan ke dasbor.
        }
      } catch (error: any) {
         // Tangkap error jika setDoc gagal (misal, koleksi tidak kosong, aturan menolak)
         // atau getDoc gagal karena alasan lain.
         console.error("Gagal memverifikasi atau membuat peran super admin:", error);

         if (error.code === 'permission-denied') {
             toast({
                variant: "destructive",
                title: "Akses Ditolak",
                description: "Anda bukan super admin dan sistem sudah memiliki super admin.",
             });
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: superAdminRef.path,
                operation: 'create', // Operasi yang paling mungkin gagal
             }));
         } else {
             toast({
                variant: "destructive",
                title: "Error Verifikasi",
                description: error.message || "Gagal memverifikasi peran pengguna."
             });
         }
         await auth.signOut();
         router.replace('/admin/login');
      } finally {
        // Jangan set false di sini jika ada redirect, karena komponen akan unmount.
        // Set false hanya pada jalur yang tidak ada redirect.
        if (pathname !== '/admin/login') {
           setIsVerifying(false);
        }
      }
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
  
  // Jika sudah tidak memverifikasi dan path adalah login, render children (halaman login)
  if (pathname === '/admin/login') {
     return <>{children}</>;
  }

  // Jika sudah tidak memverifikasi dan ada user, render sidebar
  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  // Fallback jika tidak ada kondisi yang cocok (misal: !user tapi path bukan login)
  return null;
}
