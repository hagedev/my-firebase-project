'use client';

import { useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Shield, Store, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }
    if (!user) {
      router.replace('/admin/login?error=unauthorized');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        toast({
            title: 'Logout Berhasil',
            description: 'Anda telah keluar dari sesi super admin.',
        });
    } catch (error) {
        console.error("Logout error:", error)
        toast({
            variant: 'destructive',
            title: 'Logout Gagal',
            description: 'Terjadi kesalahan saat mencoba keluar.',
        });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            <h2 className="font-headline text-lg">Super Admin</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/cafe-management">
                  <Store />
                  Manajemen Kafe
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild>
                <Link href="/admin/user-management">
                    <Users />
                    Manajemen User
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2">
            <LogOut />
            <span>Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-2">
             <SidebarTrigger className="md:hidden" />
             <h1 className="font-headline text-xl font-semibold">
              Dashboard
            </h1>
          </div>
          <p className="hidden md:block text-sm text-muted-foreground">{user.email}</p>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Selamat Datang!</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Anda telah berhasil login sebagai super admin!</p>
              <p className="text-sm text-muted-foreground mt-2">Gunakan menu di sidebar untuk mulai mengelola kafe.</p>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
