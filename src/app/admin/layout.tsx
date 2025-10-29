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
        const superAdminSnapshot = await getDocs(superAdminCollectionRef);
        const superAdminRef = doc(superAdminCollectionRef, user.uid);

        if (superAdminSnapshot.empty) {
          // KASUS: Generate Super Admin Pertama Kali (alur "Is data user null? -> Yes")
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
          // Langsung arahkan ke dasbor setelah pembuatan.
          router.replace('/admin/dashboard'); 
          return; // Selesai. setIsVerifying tidak perlu diubah karena akan unmount.
        }
        
        // KASUS: Super admin sudah ada. Verifikasi apakah pengguna saat ini adalah super admin.
        const superAdminDoc = await getDoc(superAdminRef);

        if (superAdminDoc.exists()) {
          // KASUS: Pengguna adalah Super Admin.
          if (pathname === '/admin/login') {
            router.replace('/admin/dashboard');
          } else {
            setIsVerifying(false);
          }
        } else {
          // KASUS: Pengguna BUKAN Super Admin.
           const userRef = doc(firestore, `users/${user.uid}`);
           const userSnap = await getDoc(userRef);

           let errorMessage = "Akun Anda tidak memiliki hak akses super admin.";
           if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
               const tenantRef = doc(firestore, 'tenants', userSnap.data().tenantId);
               const tenantSnap = await getDoc(tenantRef);
               if (tenantSnap.exists()) {
                  // Alur "Is Admin Cafe? -> Yes"
                  router.replace(`/${tenantSnap.data().slug}/admin/dashboard`);
                  return;
               }
           }
            
            // Alur "Is Admin Cafe? -> No"
            toast({
              variant: "destructive",
              title: "Akses Ditolak",
              description: errorMessage,
            });
            await auth.signOut();
            router.replace('/admin/login');
        }
      } catch (error) {
        console.error("Verification failed:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'roles_superadmin',
            operation: 'list'
        }));
        toast({
          variant: "destructive",
          title: "Error Verifikasi",
          description: "Gagal memverifikasi peran pengguna karena masalah izin atau koneksi."
        });
        await auth.signOut();
        router.replace('/admin/login');
      } finally {
        // Hanya set isVerifying ke false jika tidak ada pengalihan yang terjadi.
        // Jika ada pengalihan, komponen akan unmount.
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
