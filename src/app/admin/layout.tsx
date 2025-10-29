'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { SuperAdminSidebar } from './components/sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);
  const [role, setRole] = useState<'superadmin' | 'admin_kafe' | 'unknown' | null>(null);

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    const checkUserRole = async () => {
      const isPublicPage = pathname === '/admin/login' || pathname === '/admin/register';

      if (!user) {
        if (!isPublicPage) {
          router.replace('/admin/login');
        } else {
          setIsVerifying(false);
        }
        return;
      }

      // 1. Check for Super Admin role first
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminSnap = await getDoc(superAdminRef);

      if (superAdminSnap.exists()) {
        setRole('superadmin');
        if (isPublicPage) {
          router.replace('/admin/dashboard');
        } else {
          setIsVerifying(false);
        }
        return;
      }
      
      // Handle first-time super admin creation
      try {
        const superAdminCollection = await getDoc(doc(firestore, 'roles_superadmin', '_collection_marker_'));
        const isFirstSuperAdmin = !superAdminCollection.exists();

        if (isFirstSuperAdmin) {
           await setDoc(superAdminRef, {
             userId: user.uid,
             email: user.email,
             role: 'superadmin',
             assignedAt: serverTimestamp(),
           });
           setRole('superadmin');
           router.replace('/admin/dashboard');
           return;
        }
      } catch (error) {
        // This might fail if rules are not set up yet, which is fine during initial registration
      }


      // 2. If not Super Admin, check for Cafe Admin role
      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
        setRole('admin_kafe');
        const tenantRef = doc(firestore, `tenants/${userSnap.data().tenantId}`);
        const tenantSnap = await getDoc(tenantRef);
        if (tenantSnap.exists()) {
            router.replace(`/${tenantSnap.data().slug}/admin`);
        } else {
            // Invalid tenant, logout
            await auth.signOut();
            router.replace('/admin/login');
        }
        return;
      }

      // 3. If no role found, deny access
      setRole('unknown');
      await auth.signOut();
      router.replace('/admin/login');
    };

    checkUserRole();
  }, [user, isUserLoading, router, pathname, firestore, auth]);

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const isPublicPage = pathname === '/admin/login' || pathname === '/admin/register';
  
  if(isPublicPage || role !== 'superadmin'){
     return <>{children}</>;
  }

  return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
}
