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
      const isPublicPage =
        pathname === '/admin/login' || pathname === '/admin/register';

      if (!user) {
        if (isPublicPage) {
          setIsVerifying(false);
        } else {
          router.replace('/admin/login');
        }
        return;
      }

      // User is authenticated, check their role from the 'users' collection
      const userRef = doc(firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // CHECK 1: Is the user a superadmin?
        if (userData.role === 'superadmin') {
          if (isPublicPage) {
            router.replace('/admin/dashboard'); // Redirect from login/register to dashboard
          } else {
            setIsVerifying(false); // Allow access to protected pages
          }
          return; // Super admin verification successful
        }
        
        // CHECK 2: Is the user a cafe admin? (And trying to access super admin pages)
        if (userData.role === 'admin_kafe') {
            const tenantRef = doc(firestore, `tenants/${userData.tenantId}`);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
                // This user is a valid cafe admin, but is in the wrong part of the site.
                // Redirect them to their own tenant dashboard.
                router.replace(`/${tenantSnap.data().slug}/admin`);
            } else {
                // Cafe admin with an invalid tenantId, sign them out.
                await auth.signOut();
                router.replace('/admin/login');
            }
            return; // Stop further execution
        }
      } 
        
      // If user document doesn't exist, or role is not recognized, they are not authorized.
      await auth.signOut();
      router.replace('/admin/login');
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
