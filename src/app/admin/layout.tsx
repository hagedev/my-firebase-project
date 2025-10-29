'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getFirestore } from 'firebase/firestore';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useMemo(() => getFirestore(), []);

  const superAdminRoleRef = useMemoFirebase(() => 
    user ? doc(firestore, `roles_superadmin/${user.uid}`) : null
  , [firestore, user]);

  const { data: superAdminRole, isLoading: isRoleLoading } = useDoc(superAdminRoleRef);

  useEffect(() => {
    const isLoginPage = pathname === '/admin/login';

    // Wait until loading is complete before doing anything
    if (isUserLoading || (user && isRoleLoading)) {
      return;
    }

    // Scenario 1: User is logged in
    if (user) {
      // If user is a super admin and on the login page, redirect to dashboard
      if (superAdminRole && isLoginPage) {
        router.replace('/admin');
      }
      // If user is NOT a super admin and not on the login page, kick them out
      else if (!superAdminRole && !isLoginPage) {
        router.replace('/admin/login?error=unauthorized');
      }
    } 
    // Scenario 2: User is not logged in
    else {
      // If not logged in and trying to access a protected page, redirect to login
      if (!isLoginPage) {
        router.replace('/admin/login');
      }
    }
  }, [user, isUserLoading, superAdminRole, isRoleLoading, router, pathname]);

  // Show a loading screen for protected pages while we verify auth and role
  const isLoadingProtectedPage = (isUserLoading || (user && isRoleLoading)) && pathname !== '/admin/login';
  if (isLoadingProtectedPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // If on login page, always render children (the login form)
  // The useEffect will handle redirecting away if the user is already a logged-in admin.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // If on a protected page and user is a confirmed super admin, render the page
  if (user && superAdminRole) {
    return <>{children}</>;
  }
  
  // In all other cases (e.g., waiting for redirect, or a non-admin on a protected page),
  // return null to prevent content flashing.
  return null;
}
