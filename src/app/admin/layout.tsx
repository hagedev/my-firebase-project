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
    if (isUserLoading) {
      return; 
    }

    const checkUserRole = async () => {
      // Untuk sementara, kita langsung arahkan ke register jika belum di sana
      if (pathname !== '/admin/register' && !user) {
        router.replace('/admin/register');
        setIsVerifying(false);
        return;
      }
      
      // Jika pengguna sudah login, kita coba verifikasi
      if(user) {
        const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
        const superAdminDoc = await getDoc(superAdminRef).catch(err => {
           errorEmitter.emit('permission-error', new FirestorePermissionError({ path: superAdminRef.path, operation: 'get' }));
           return null;
        });

        if (superAdminDoc?.exists()) {
             if (pathname === '/admin/login' || pathname === '/admin/register') {
                router.replace('/admin/dashboard');
             }
             setIsVerifying(false);
             return;
        }

        // Logika untuk membuat superadmin setelah register & login
        const superAdminCollectionRef = collection(firestore, 'roles_superadmin');
        const superAdminSnapshot = await getDocs(superAdminCollectionRef).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: superAdminCollectionRef.path,
                operation: 'list',
            }));
            return null;
        });

        if (superAdminSnapshot && superAdminSnapshot.empty) {
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
            return;
        }
      }

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

  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  return null;
}
