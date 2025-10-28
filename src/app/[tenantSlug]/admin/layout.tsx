'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { TenantAdminSidebar } from './components/sidebar';

export default function TenantAdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isVerifying, setIsVerifying] = useState(true);
  
  const tenantSlug = params.tenantSlug as string;

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    const checkAdminStatus = async () => {
      if (!user) {
        if (pathname !== `/${tenantSlug}/admin/login`) {
          router.replace(`/${tenantSlug}/admin/login`);
        } else {
          setIsVerifying(false);
        }
        return;
      }
      
      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.role === 'admin_kafe') {
          const tenantRef = doc(firestore, `tenants/${userData.tenantId}`);
          const tenantSnap = await getDoc(tenantRef);
          
          if (tenantSnap.exists() && tenantSnap.data().slug === tenantSlug) {
            if (pathname === `/${tenantSlug}/admin/login`) {
                router.replace(`/${tenantSlug}/admin/dashboard`);
            } else {
                setIsVerifying(false);
            }
            return;
          }
        }
      }
        
      await auth.signOut();
      router.replace(`/${tenantSlug}/admin/login`);
      setIsVerifying(false);
    };

    checkAdminStatus();
  }, [user, isUserLoading, router, pathname, firestore, tenantSlug, auth]);

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (pathname === `/${tenantSlug}/admin/login`) {
    return <>{children}</>;
  }

  return <TenantAdminSidebar>{children}</TenantAdminSidebar>;
}
