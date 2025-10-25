'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
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
      
      const superAdminRef = doc(firestore, `roles_superadmin/${user.uid}`);
      const superAdminSnap = await getDoc(superAdminRef);

      if (superAdminSnap.exists()) {
        if (pathname === `/${tenantSlug}/admin/login`) {
          router.replace(`/${tenantSlug}/admin/dashboard`);
        } else {
          setIsVerifying(false);
        }
      } else {
        // Not a superadmin, check for tenant admin role
        const userRef = doc(firestore, `users/${user.uid}`);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const tenantRef = doc(firestore, `tenants/${userData.tenantId}`);
          const tenantSnap = await getDoc(tenantRef);
          
          if (tenantSnap.exists() && tenantSnap.data().slug === tenantSlug && userData.role === 'admin_kafe') {
            // Is a tenant admin for this tenant
             if (pathname === `/${tenantSlug}/admin/login`) {
                router.replace(`/${tenantSlug}/admin/dashboard`);
             } else {
                setIsVerifying(false);
             }
             return;
          }
        }
        
        // If not super admin or correct tenant admin, logout and redirect
        await user.getIdToken(true); // force refresh token
        router.replace(`/${tenantSlug}/admin/login`);
        setIsVerifying(false);
      }
    };

    checkAdminStatus();
  }, [user, isUserLoading, router, pathname, firestore, tenantSlug]);

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
