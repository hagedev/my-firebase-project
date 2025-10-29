'use client';

import { useUser, useFirestore, useAuth, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, getDocs, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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
      // Jika tidak ada pengguna yang login, arahkan ke halaman login, kecuali mereka sudah di sana.
      if (!user) {
        if (pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
        setIsVerifying(false);
        return;
      }
      
      // Pengguna sudah login. Sekarang kita verifikasi perannya.
      const superAdminCollectionRef = collection(firestore, 'roles_superadmin');
      
      try {
        const superAdminRef = doc(superAdminCollectionRef, user.uid);
        const superAdminDoc = await getDoc(superAdminRef);

        if (superAdminDoc.exists()) {
          // KASUS: Pengguna adalah Super Admin.
          if (pathname === '/admin/login') {
            router.replace('/admin/dashboard');
          } else {
            setIsVerifying(false);
          }
          return;
        }

        // KASUS: Dokumen Super Admin tidak ditemukan. Cek apakah ini harusnya jadi super admin pertama.
        const superAdminSnapshot = await getDocs(superAdminCollectionRef);
        if (superAdminSnapshot.empty) {
          // KASUS: Generate Super Admin Pertama Kali
          const superAdminData = {
            userId: user.uid,
            email: user.email,
            role: 'superadmin',
            assignedAt: serverTimestamp(),
          };
          await setDoc(superAdminRef, superAdminData);
          toast({
            title: "Selamat Datang, Super Admin!",
            description: "Akun Anda telah berhasil dibuat sebagai super admin pertama.",
          });
          router.replace('/admin/dashboard'); // Langsung arahkan ke dasbor
          return;
        }

        // KASUS: Pengguna BUKAN Super Admin, dan super admin sudah ada.
        // Cek apakah dia Admin Kafe? Admin Kafe tidak seharusnya login lewat sini.
        const userRef = doc(firestore, `users/${user.uid}`);
        const userSnap = await getDoc(userRef);

        let errorMessage = "Akun Anda tidak memiliki hak akses super admin.";
        if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
            errorMessage = "Ini adalah halaman login Super Admin. Silakan login melalui halaman admin kafe Anda.";
        }

        toast({
          variant: "destructive",
          title: "Akses Ditolak",
          description: errorMessage,
        });
        await auth.signOut();
        router.replace('/admin/login'); // Tetap di halaman login super admin

      } catch (error) {
        // Menangkap error dari getDoc atau getDocs
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'roles_superadmin',
            operation: 'list' // atau 'get', tergantung operasi yang gagal
        }));
        toast({
          variant: "destructive",
          title: "Error Verifikasi",
          description: "Gagal memverifikasi peran pengguna karena masalah izin."
        });
        await auth.signOut();
        router.replace('/admin/login');
      } finally {
        setIsVerifying(false);
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
  
  if (pathname === '/admin/login') {
     return <>{children}</>;
  }

  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  return null;
}
