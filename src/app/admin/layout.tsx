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
    if (isUserLoading) {
      return; 
    }

    const checkUserRole = async () => {
      const superAdminCollectionRef = collection(firestore, 'roles_superadmin');
      
      const superAdminSnapshot = await getDocs(superAdminCollectionRef).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: superAdminCollectionRef.path,
          operation: 'list',
        }));
        return null;
      });

      if (superAdminSnapshot === null) {
        // Error telah dipancarkan, hentikan eksekusi lebih lanjut
        setIsVerifying(false);
        return;
      }

      const isSuperAdminExists = !superAdminSnapshot.empty;

      if (!user) {
        if (!isSuperAdminExists) {
          if (pathname !== '/admin/register') router.replace('/admin/register');
        } else {
          if (pathname !== '/admin/login' && pathname !== '/admin/register') router.replace('/admin/login');
        }
        setIsVerifying(false);
        return;
      }
      
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminDoc = await getDoc(superAdminRef).catch(err => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: superAdminRef.path, operation: 'get' }));
         return null;
      });

      if (superAdminDoc === null) {
        setIsVerifying(false);
        return;
      }

      if (superAdminDoc.exists()) {
        if (pathname === '/admin/login' || pathname === '/admin/register') {
          router.replace('/admin/dashboard');
        } else {
          setIsVerifying(false);
        }
        return;
      }

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
         return;
      }

      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'get' }));
        return null;
      });

      if (userSnap === null) {
        setIsVerifying(false);
        return;
      }

      if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
        const tenantRef = doc(firestore, `tenants/${userSnap.data().tenantId}`);
        const tenantSnap = await getDoc(tenantRef).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: tenantRef.path, operation: 'get' }));
            return null;
        });

        if (tenantSnap === null) {
            setIsVerifying(false);
            return;
        }

        if (tenantSnap.exists()) {
            router.replace(`/${tenantSnap.data().slug}/admin`);
        } else {
            toast({ variant: "destructive", title: "Tenant Tidak Ditemukan" });
            auth.signOut();
            router.replace('/admin/login');
        }
        return;
      }

      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki peran yang valid untuk area ini." });
      auth.signOut();
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
  
  if (pathname === '/admin/register' || pathname === '/admin/login') {
     return <>{children}</>;
  }

  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  return null;
}
