'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
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

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user object is loaded
    }

    const checkAdminStatus = async () => {
      // Allow unauthenticated users to access login and register pages
      const isPublicPage =
        pathname === '/admin/login' || pathname === '/admin/register';

      if (!user) {
        if (isPublicPage) {
          setIsVerifying(false); // On a public page, no need to verify further
        } else {
          router.replace('/admin/login'); // Redirect to login if not on a public page
        }
        return;
      }

      // User is authenticated, check their role
      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === 'superadmin') {
        // User is a super admin
        if (isPublicPage) {
          router.replace('/admin/dashboard'); // Redirect from login/register to dashboard
        } else {
          setIsVerifying(false); // Allow access to protected pages
        }
      } else {
        // User is not a super admin, check if they are a cafe admin
        if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
            const tenantRef = doc(firestore, `tenants/${userSnap.data().tenantId}`);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
                // Redirect cafe admin to their own dashboard
                router.replace(`/${tenantSnap.data().slug}/admin`);
                return; // Important to return here to stop further execution
            }
        }

        // If not a super admin or a valid cafe admin, sign them out and redirect to login
        await auth.signOut();
        router.replace('/admin/login');
      }
    };

    checkAdminStatus();
  }, [user, isUserLoading, router, pathname, firestore, auth]);

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If on login/register page, just render the children without the sidebar
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return <>{children}</>;
  }

  // For protected admin pages, render with the sidebar
  return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
}
