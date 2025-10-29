'use client';

import { useUser, useFirestore, useAuth, FirestorePermissionError, errorEmitter } from '@/firebase';
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
    // PENTING: Jangan lakukan apa pun sampai Firebase Auth selesai memuat status pengguna.
    // Ini mencegah 'auth: null' pada pembacaan Firestore awal.
    if (isUserLoading) {
      return; 
    }

    const checkUserRole = async () => {
      const superAdminCollectionRef = collection(firestore, 'roles_superadmin');
      
      // Langkah 1: Periksa apakah ada super admin di sistem.
      // Ini harus terjadi setelah isUserLoading false.
      const superAdminSnapshot = await getDocs(superAdminCollectionRef).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: superAdminCollectionRef.path,
          operation: 'list',
        }));
        return null;
      });

      if (superAdminSnapshot === null) {
        setIsVerifying(false); // Berhenti jika terjadi error
        return;
      }

      const isSuperAdminExists = !superAdminSnapshot.empty;

      // Langkah 2: Tangani pengguna yang belum login (user === null).
      if (!user) {
        if (!isSuperAdminExists && pathname !== '/admin/register') {
          // Jika tidak ada super admin & bukan di halaman register, arahkan ke register.
          router.replace('/admin/register');
        } else if (isSuperAdminExists && pathname !== '/admin/login') {
          // Jika super admin ada & bukan di halaman login, arahkan ke login.
          router.replace('/admin/login');
        }
        setIsVerifying(false);
        return;
      }
      
      // Langkah 3: Pengguna sudah login (user ada). Sekarang verifikasi perannya.
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminDoc = await getDoc(superAdminRef).catch(err => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: superAdminRef.path, operation: 'get' }));
         return null;
      });

      if (superAdminDoc === null) {
        setIsVerifying(false);
        return;
      }
      
      // Kasus A: Pengguna adalah SUPER ADMIN.
      if (superAdminDoc.exists()) {
        if (pathname === '/admin/login' || pathname === '/admin/register') {
          router.replace('/admin/dashboard');
        }
        setIsVerifying(false);
        return;
      }

      // Kasus B: Pengguna baru mendaftar untuk menjadi SUPER ADMIN PERTAMA.
      if (!isSuperAdminExists) {
         setDoc(superAdminRef, {
           userId: user.uid,
           email: user.email,
           role: 'superadmin',
           assignedAt: serverTimestamp(),
         }).then(() => {
            toast({ title: "Akun Super Admin Dibuat", description: "Anda sekarang adalah super admin pertama." });
            router.replace('/admin/dashboard');
         }).catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: superAdminRef.path,
              operation: 'create',
              requestResourceData: {
                userId: user.uid,
                email: user.email,
                role: 'superadmin',
              }
            }));
            auth.signOut();
            router.replace('/admin/register');
         });
         return; // Proses verifikasi berhenti di sini, akan dilanjutkan setelah redirect.
      }

      // Kasus C: Pengguna adalah ADMIN KAFE, bukan super admin.
      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
        return null;
      });

      if (userSnap?.exists() && userSnap.data().role === 'admin_kafe') {
        const tenantRef = doc(firestore, `tenants/${userSnap.data().tenantId}`);
        const tenantSnap = await getDoc(tenantRef).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: tenantRef.path, operation: 'get' }));
            return null;
        });

        if (tenantSnap?.exists()) {
            router.replace(`/${tenantSnap.data().slug}/admin`);
        } else {
            toast({ variant: "destructive", title: "Tenant Tidak Ditemukan" });
            auth.signOut();
            router.replace('/admin/login');
        }
        return; // Verifikasi selesai.
      }

      // Kasus D: Pengguna tidak punya peran yang valid.
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki peran yang valid untuk area ini." });
      auth.signOut();
      // Arahkan ke halaman yang sesuai tergantung apakah super admin sudah ada atau belum.
      router.replace(isSuperAdminExists ? '/admin/login' : '/admin/register');
      setIsVerifying(false);
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

  // Hanya tampilkan sidebar jika verifikasi selesai DAN pengguna terbukti ada (dan perannya valid)
  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  return null; // Tampilkan null atau layar loading lain jika verifikasi gagal atau pengguna keluar
}
