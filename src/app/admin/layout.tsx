'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminSidebar } from './components/sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    const checkAdminStatus = async () => {
      if (!user) {
        if (pathname !== '/admin/login' && pathname !== '/admin/register') {
          router.replace('/admin/login');
        } else {
          setIsVerifying(false);
        }
        return;
      }

      const superAdminRef = doc(firestore, `roles_superadmin/${user.uid}`);
      const superAdminSnap = await getDoc(superAdminRef);

      if (superAdminSnap.exists()) {
        // User is a super admin
        if (pathname === '/admin/login' || pathname === '/admin/register') {
          router.replace('/admin');
        } else {
          setIsVerifying(false);
        }
      } else {
        // Not a superadmin, check for tenant admin role
        const userRef = doc(firestore, `users/${user.uid}`);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.role === 'admin_kafe') {
            const tenantRef = doc(firestore, `tenants/${userData.tenantId}`);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
              const tenantSlug = tenantSnap.data().slug;
              router.replace(`/${tenantSlug}/admin/dashboard`);
              return;
            }
          }
        }
        
        // If not super admin or tenant admin, deny access
        await auth.signOut(); // using auth from useAuth()
        router.replace('/admin/login');
        setIsVerifying(false);

      }
    };

    checkAdminStatus();
  }, [user, isUserLoading, router, pathname, firestore]);

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return <>{children}</>;
  }

  return <AdminSidebar>{children}</AdminSidebar>;
}
