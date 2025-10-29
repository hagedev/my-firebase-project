'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
      if (!user) {
        if (pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
        setIsVerifying(false);
        return;
      }
      
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);

      try {
        const superAdminDoc = await getDoc(superAdminRef);

        if (superAdminDoc.exists()) {
          // User is a Super Admin.
          if (pathname === '/admin/login') {
            router.replace('/admin/dashboard');
          } else {
            setIsVerifying(false);
          }
        } else {
            // User is not a Super Admin, deny access.
             toast({
                variant: "destructive",
                title: "Akses Ditolak",
                description: "Anda tidak memiliki hak akses sebagai super admin.",
             });
             await auth.signOut();
             router.replace('/admin/login');
        }
      } catch (error: any) {
         console.error("Gagal memverifikasi peran super admin:", error);
         toast({
            variant: "destructive",
            title: "Error Verifikasi",
            description: "Gagal memverifikasi peran pengguna."
         });
         await auth.signOut();
         router.replace('/admin/login');
      } finally {
        if (pathname !== '/admin/login') {
           setIsVerifying(false);
        }
      }
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
  
  if (pathname === '/admin/login') {
     return <>{children}</>;
  }

  if (user && !isVerifying) {
    return <SuperAdminSidebar>{children}</SuperAdminSidebar>;
  }

  return null;
}
