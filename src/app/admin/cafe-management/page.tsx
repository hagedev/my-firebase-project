'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AddCafeDialog } from './_components/add-cafe-dialog';
import type { Tenant } from '@/lib/types';
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
import { LogOut, Shield, Store } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CafeManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Memoize the collection reference
  const tenantsCollectionRef = useMemo(
    () => (firestore ? collection(firestore, 'tenants') : null),
    [firestore]
  );
  
  const { data: tenants, isLoading: isTenantsLoading } = useCollection<Tenant>(tenantsCollectionRef);

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
            <SidebarMenuButton asChild isActive>
              <Link href="/admin/cafe-management">
                <Store />
                Manajemen Kafe
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
            Manajemen Kafe
            </h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle />
            <span>Tambah Kafe</span>
        </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">
        <Card>
            <CardHeader>
            <CardTitle>Daftar Kafe</CardTitle>
            <CardDescription>Berikut adalah daftar semua kafe yang terdaftar dalam sistem.</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="border rounded-md">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nama Kafe</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isTenantsLoading ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center">
                        <div className="flex justify-center items-center p-4">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Memuat data kafe...</span>
                        </div>
                        </TableCell>
                    </TableRow>
                    ) : tenants && tenants.length > 0 ? (
                    tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{tenant.slug}</Badge>
                        </TableCell>
                        <TableCell>
                            {/* Actions like Edit, Delete will be here */}
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center">
                        Belum ada kafe yang ditambahkan.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            </CardContent>
        </Card>
        </main>
        <AddCafeDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </SidebarInset>
  </SidebarProvider>
  );
}
