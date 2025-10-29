'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp } from 'firebase/firestore';
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
      return; 
    }

    const checkUserRole = async () => {
      // Jika tidak ada user, arahkan ke halaman registrasi jika belum di sana.
      // Ini adalah gerbang utama untuk super admin pertama.
      if (!user) {
        if (pathname !== '/admin/register') {
          router.replace('/admin/register');
        } else {
          setIsVerifying(false);
        }
        return;
      }
      
      // User sudah login. Sekarang kita verifikasi perannya.

      // 1. Cek apakah user adalah super admin.
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminSnap = await getDoc(superAdminRef);

      if (superAdminSnap.exists()) {
        // Dia adalah super admin. Arahkan ke dasbor jika masih di halaman register.
        if (pathname === '/admin/register') {
          router.replace('/admin/dashboard');
        } else {
          setIsVerifying(false);
        }
        return;
      }

      // Dokumen super admin tidak ditemukan. Cek apakah ini harusnya jadi super admin pertama.
      try {
        const superAdminCollectionRef = collection(firestore, 'roles_superadmin');
        const superAdminCollection = await getDocs(superAdminCollectionRef);
        const isFirstSuperAdmin = superAdminCollection.empty;

        if (isFirstSuperAdmin) {
           // Ini adalah super admin pertama! Buat dokumennya.
           // Ini hanya akan berhasil jika aturan keamanan mengizinkannya.
           await setDoc(superAdminRef, {
             userId: user.uid,
             email: user.email,
             role: 'superadmin',
             assignedAt: serverTimestamp(),
           });
           
           toast({ title: "Akun Super Admin Dibuat", description: "Anda sekarang adalah super admin pertama." });
           router.replace('/admin/dashboard');
           return;
        }
      } catch (error: any) {
        console.error("Gagal memeriksa atau membuat super admin:", error);
        toast({
            variant: "destructive",
            title: "Error Verifikasi Peran",
            description: "Gagal membuat atau memverifikasi peran super admin. Periksa aturan keamanan Firestore Anda."
        });
        // Jika gagal, logout untuk mencegah loop.
        await auth.signOut();
        router.replace('/admin/register');
        return;
      }

      // 2. Jika bukan super admin, cek apakah dia admin kafe.
      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
        const tenantRef = doc(firestore, `tenants/${userSnap.data().tenantId}`);
        const tenantSnap = await getDoc(tenantRef);
        if (tenantSnap.exists()) {
            router.replace(`/${tenantSnap.data().slug}/admin`);
        } else {
            // Tenant tidak valid, logout.
            toast({ variant: "destructive", title: "Tenant Tidak Ditemukan" });
            await auth.signOut();
            router.replace('/admin/login'); // Arahkan ke login umum jika ada
        }
        return;
      }

      // 3. Jika tidak punya peran sama sekali, logout.
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki peran yang valid." });
      await auth.signOut();
      router.replace('/admin/register');
    };

    checkUserRole();
  }, [user, isUserLoading, router, pathname, firestore, auth, toast]);

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Jika di halaman registrasi, tampilkan saja halamannya.
  if (pathname === '/admin/register') {
     return <>{children}</>;
  }

  // Jika sudah melewati verifikasi dan bukan di halaman publik, tampilkan sidebar.
  // Pengecekan 'user' di sini untuk memastikan sidebar tidak render sesaat sebelum redirect.
  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  // Fallback untuk kasus transisi.
  return <>{children}</>;
}
