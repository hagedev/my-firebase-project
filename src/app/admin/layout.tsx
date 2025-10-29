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
      // Periksa apakah ada super admin yang terdaftar
      const superAdminCollectionRef = collection(firestore, 'roles_superadmin');
      const superAdminSnapshot = await getDocs(superAdminCollectionRef);
      const isSuperAdminExists = !superAdminSnapshot.empty;

      // Jika tidak ada user yang login
      if (!user) {
        if (!isSuperAdminExists) {
          // Belum ada super admin, paksa ke halaman registrasi
          if (pathname !== '/admin/register') {
            router.replace('/admin/register');
          }
        } else {
          // Super admin sudah ada, paksa ke halaman login
          if (pathname !== '/admin/login' && pathname !== '/admin/register') {
             router.replace('/admin/login');
          }
        }
        setIsVerifying(false);
        return;
      }
      
      // User sudah login. Sekarang kita verifikasi perannya.
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminDoc = await getDoc(superAdminRef);

      if (superAdminDoc.exists()) {
        // Ini adalah super admin. Arahkan ke dasbor jika mereka ada di halaman login/register.
        if (pathname === '/admin/login' || pathname === '/admin/register') {
          router.replace('/admin/dashboard');
        } else {
          setIsVerifying(false);
        }
        return;
      }

      // Dokumen super admin tidak ditemukan. Cek apakah ini harusnya jadi super admin pertama.
      if (!isSuperAdminExists) {
         try {
           await setDoc(superAdminRef, {
             userId: user.uid,
             email: user.email,
             role: 'superadmin',
             assignedAt: serverTimestamp(),
           });
           
           toast({ title: "Akun Super Admin Dibuat", description: "Anda sekarang adalah super admin pertama." });
           router.replace('/admin/dashboard');
           return;
         } catch (error: any) {
            console.error("Gagal membuat super admin:", error);
            toast({
                variant: "destructive",
                title: "Error Pembuatan Peran",
                description: "Gagal membuat peran super admin. Periksa aturan keamanan."
            });
            await auth.signOut();
            router.replace('/admin/register');
            return;
         }
      }

      // Jika user yang login bukan super admin, cek apakah dia admin kafe.
      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
        const tenantRef = doc(firestore, `tenants/${userSnap.data().tenantId}`);
        const tenantSnap = await getDoc(tenantRef);
        if (tenantSnap.exists()) {
            router.replace(`/${tenantSnap.data().slug}/admin`);
        } else {
            toast({ variant: "destructive", title: "Tenant Tidak Ditemukan" });
            await auth.signOut();
            router.replace('/admin/login');
        }
        return;
      }

      // Jika tidak punya peran yang valid, logout.
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki peran yang valid untuk area ini." });
      await auth.signOut();
      router.replace(isSuperAdminExists ? '/admin/login' : '/admin/register');
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
  
  // Jika di halaman publik, tampilkan saja halamannya.
  if (pathname === '/admin/register' || pathname === '/admin/login') {
     return <>{children}</>;
  }

  // Jika sudah melewati verifikasi dan bukan di halaman publik, tampilkan sidebar.
  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  // Fallback untuk kasus transisi.
  return null;
}
