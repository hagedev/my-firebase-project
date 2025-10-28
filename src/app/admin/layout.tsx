'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminSidebar } from './components/sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Wait until Firebase Auth has determined the user's state
    if (isUserLoading) {
      return;
    }

    const checkAdminStatus = async () => {
      // If no user is logged in...
      if (!user) {
        // If they are trying to access a protected page, redirect to login
        if (pathname !== '/admin/login' && pathname !== '/admin/register') {
          router.replace('/admin/login');
        } else {
          // If they are on login/register, verification is done
          setIsVerifying(false);
        }
        return;
      }

      // If a user is logged in, check their role
      const superAdminRef = doc(firestore, `roles_superadmin/${user.uid}`);
      try {
        const superAdminSnap = await getDoc(superAdminRef);

        if (superAdminSnap.exists()) {
          // User IS a super admin
          // If they are on the login page, redirect them to the dashboard
          if (pathname === '/admin/login' || pathname === '/admin/register') {
            router.replace('/admin');
          } else {
            // Otherwise, they are allowed, so verification is done
            setIsVerifying(false);
          }
        } else {
          // User is NOT a super admin. Check if they are a tenant admin.
          const userRef = doc(firestore, `users/${user.uid}`);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists() && userSnap.data().role === 'admin_kafe') {
            // This user is a tenant admin and doesn't belong in the super admin section.
            // Redirect them to their own tenant dashboard.
            const tenantRef = doc(firestore, `tenants/${userSnap.data().tenantId}`);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
              const tenantSlug = tenantSnap.data().slug;
              router.replace(`/${tenantSlug}/admin/dashboard`);
              // Don't stop verifying, let the redirect complete
              return; 
            }
          }
          
          // If not a super admin or a known tenant admin, they have no access here.
          // Sign them out and redirect to the login page.
          await auth.signOut();
          router.replace('/admin/login');
        }
      } catch (error) {
        console.error("Error verifying admin status:", error);
        // On error (e.g. permission denied), sign out and redirect
        await auth.signOut();
        router.replace('/admin/login');
      } finally {
         // This might be reached before redirect completes, so we only stop verifying if not redirected
         if(pathname.startsWith('/admin')) {
            setIsVerifying(false);
         }
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
  
  // If we are on login or register, don't show the sidebar
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return <>{children}</>;
  }

  // For all other super admin pages, show the sidebar
  return <AdminSidebar>{children}</AdminSidebar>;
}
