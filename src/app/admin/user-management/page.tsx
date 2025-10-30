'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { PlusCircle, Loader2, MoreHorizontal, Users, Shield, Store, LogOut } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { User as AppUser, Tenant } from '@/lib/types';
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
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AddUserDialog } from './_components/add-user-dialog';
import { EditUserDialog } from './_components/edit-user-dialog';
import { DeleteUserDialog } from './_components/delete-user-dialog';

export default function UserManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users'), where('role', '==', 'admin_kafe')) : null),
    [firestore]
  );
  const tenantsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants') : null),
    [firestore]
  );
  
  const { data: adminUsers, isLoading: isUsersLoading } = useCollection<AppUser>(usersQuery);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection<Tenant>(tenantsCollectionRef);

  useEffect(() => {
    if (isUserLoading) return;
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

  const handleEditClick = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
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
              <SidebarMenuButton asChild isActive>
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
                Manajemen User
              </h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} disabled={isTenantsLoading || !tenants || tenants.length === 0}>
              <PlusCircle />
              <span>Tambah User</span>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Card>
              <CardHeader>
                <CardTitle>Daftar User Admin Kafe</CardTitle>
                <CardDescription>Berikut adalah daftar semua user dengan peran sebagai admin kafe.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Kafe yang Dikelola</TableHead>
                        <TableHead>Peran</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isUsersLoading ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">
                            <div className="flex justify-center items-center p-4">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Memuat data user...</span>
                            </div>
                            </TableCell>
                        </TableRow>
                        ) : adminUsers && adminUsers.length > 0 ? (
                        adminUsers.map((appUser) => (
                            <TableRow key={appUser.id}>
                            <TableCell className="font-medium">{appUser.email}</TableCell>
                            <TableCell>
                                {appUser.tenantName || 'Tidak ada'}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{appUser.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                               <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Buka menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEditClick(appUser)}>
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                      onClick={() => handleDeleteClick(appUser)}
                                    >
                                      Hapus
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">
                            Belum ada user admin kafe yang ditambahkan.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
              </CardContent>
          </Card>
        </main>
        
        <AddUserDialog 
          isOpen={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen} 
          tenants={tenants || []} 
        />
        
        {selectedUser && tenants && (
          <>
            <EditUserDialog
              isOpen={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              user={selectedUser}
              tenants={tenants}
            />
            <DeleteUserDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              user={selectedUser}
            />
          </>
        )}

      </SidebarInset>
    </SidebarProvider>
  );
}
