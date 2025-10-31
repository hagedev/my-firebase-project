'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collection, updateDoc } from 'firebase/firestore';
import type { Tenant, User as AppUser, Menu as MenuType, Category } from '@/lib/types';
import {
  Loader2,
  LogOut,
  Settings,
  Store,
  Utensils,
  PlusCircle,
  MoreHorizontal,
  Armchair,
  Info,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import { AddMenuDialog } from './_components/add-menu-dialog';

export default function CafeMenuManagementPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMenuDialogOpen, setIsAddMenuDialogOpen] = useState(false);

  // --- Data Fetching ---
  const menusCollectionRef = useMemoFirebase(
    () => (firestore && tenant ? collection(firestore, `tenants/${tenant.id}/menus`) : null),
    [firestore, tenant]
  );
  
  const { data: menuItems, isLoading: isMenuLoading } = useCollection<MenuType>(menusCollectionRef);

  // --- User and Tenant Verification ---
  useEffect(() => {
    if (isUserLoading || !firestore) return;
    if (!user) {
      router.replace('/admin/cafe/login');
      return;
    }
    
    const verifyUserAndTenant = async () => {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) throw new Error('Profil user tidak ditemukan.');
        
        const appUser = userDocSnap.data() as AppUser;
        if (appUser.role !== 'admin_kafe' || !appUser.tenantId) {
          throw new Error('Anda tidak memiliki hak akses sebagai admin kafe.');
        }
        
        const tenantDocRef = doc(firestore, 'tenants', appUser.tenantId);
        const tenantDocSnap = await getDoc(tenantDocRef);

        if (!tenantDocSnap.exists()) throw new Error('Kafe yang Anda kelola tidak ditemukan.');
        
        const tenantData = { id: tenantDocSnap.id, ...tenantDocSnap.data() } as Tenant;
        if (tenantData.slug !== slug) {
          throw new Error('Anda tidak berwenang mengakses halaman ini.');
        }

        setTenant(tenantData);
      } catch (e: any) {
        console.error("Verification error:", e);
        setError(e.message || 'Terjadi kesalahan saat verifikasi.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyUserAndTenant();
  }, [user, isUserLoading, firestore, slug, router]);

  // --- Handlers ---
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logout Berhasil' });
      router.replace('/admin/cafe/login');
    } catch (error) {
      console.error("Logout error:", error)
      toast({ variant: 'destructive', title: 'Logout Gagal' });
    }
  };

  const handleAvailabilityChange = async (menuId: string, available: boolean) => {
    if (!firestore || !tenant) return;
    try {
        const menuDocRef = doc(firestore, `tenants/${tenant.id}/menus`, menuId);
        await updateDoc(menuDocRef, { available });
        toast({
            title: 'Ketersediaan Diperbarui',
            description: `Menu sekarang ${available ? 'tersedia' : 'tidak tersedia'}.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui',
            description: error.message,
        });
    }
  };

  // --- Page Content Rendering ---
  const pageContent = () => {
    if (isLoading || isUserLoading) {
      return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
  
    if (error) {
       return (
        <div className="flex h-screen w-full items-center justify-center p-4">
          <Card className="max-w-md w-full border-destructive">
            <CardHeader><CardTitle className="text-destructive text-center">Akses Ditolak</CardTitle></CardHeader>
            <CardContent>
              <p className="text-center text-destructive">{error}</p>
              <Button onClick={() => router.push('/admin/cafe/login')} className="mt-4 w-full" variant="destructive">
                Kembali ke Halaman Login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-headline text-2xl md:text-3xl font-bold">Manajemen Menu</h1>
              <p className="text-muted-foreground">Tambah, edit, atau hapus item menu untuk kafe Anda.</p>
            </div>
            <Button onClick={() => setIsAddMenuDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Menu
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Menu</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Ketersediaan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isMenuLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : menuItems && menuItems.length > 0 ? (
                      menuItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell><Badge variant="secondary">{item.category || 'N/A'}</Badge></TableCell>
                          <TableCell>{formatRupiah(item.price)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={item.available}
                              onCheckedChange={(checked) => handleAvailabilityChange(item.id, checked)}
                            />
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
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">Hapus</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Belum ada menu yang ditambahkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <AddMenuDialog
            isOpen={isAddMenuDialogOpen}
            onOpenChange={setIsAddMenuDialogOpen}
            tenantId={tenant?.id || ''}
        />
      </>
    );
  };
  
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Store className="size-6 text-primary" />
            <h2 className="font-headline text-lg">{tenant?.name || 'Admin Kafe'}</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
               <SidebarMenuButton asChild>
                    <Link href={`/${slug}/admin`}>
                        <Info />
                        Dashboard
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${slug}/admin/orders`}>
                  <ClipboardList />
                  Manajemen Pesanan
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${slug}/admin/reports`}>
                  <FileText />
                  Laporan Transaksi
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <Link href={`/${slug}/admin/menu`}>
                  <Utensils />
                  Manajemen Menu
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild>
                    <Link href={`/${slug}/admin/tables`}>
                        <Armchair />
                        Manajemen Meja
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${slug}/admin/settings`}>
                  <Settings />
                  Setting Profil Kafe
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
              Manajemen Menu
            </h1>
          </div>
           <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground hidden md:block">
              Login sebagai <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
          </div>
        </header>
        {pageContent()}
      </SidebarInset>
    </SidebarProvider>
  );
}
