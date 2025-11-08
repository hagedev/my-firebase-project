'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collection, updateDoc } from 'firebase/firestore';
import type { Tenant, User as AppUser, Table as TableType } from '@/lib/types';
import {
  Loader2,
  LogOut,
  Settings,
  Store,
  Utensils,
  Armchair,
  PlusCircle,
  MoreHorizontal,
  QrCode,
  Copy,
  Info,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  useSidebar,
} from '@/components/ui/sidebar';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AddTableDialog } from './_components/add-table-dialog';
import { DeleteTableDialog } from './_components/delete-table-dialog';

function TablePageContent() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { isMobile } = useSidebar();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null);

  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');


  // --- Data Fetching ---
  const tablesCollectionRef = useMemoFirebase(
    () => (firestore && tenant ? collection(firestore, `tenants/${tenant.id}/tables`) : null),
    [firestore, tenant]
  );
  
  const { data: tables, isLoading: isTablesLoading } = useCollection<TableType>(tablesCollectionRef);
  
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
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: 'Logout Berhasil' });
      router.replace('/admin/cafe/login');
    } catch (error) {
      console.error("Logout error:", error)
      toast({ variant: 'destructive', title: 'Logout Gagal' });
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: 'available' | 'occupied') => {
    if (!firestore || !tenant) return;
    try {
        const tableDocRef = doc(firestore, `tenants/${tenant.id}/tables`, tableId);
        await updateDoc(tableDocRef, { status: newStatus });
        toast({
            title: 'Status Meja Diperbarui',
            description: `Status meja telah diubah menjadi ${newStatus === 'occupied' ? 'Ditempati' : 'Tersedia'}.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui',
            description: error.message,
        });
    }
  };

  const handleDeleteClick = (table: TableType) => {
    setSelectedTable(table);
    setIsDeleteDialogOpen(true);
  };
  
  const handleGenerateQR = (table: TableType) => {
    const orderUrl = `${window.location.origin}/${slug}/order/${table.id}`;
    setQrCodeUrl(orderUrl);
    setSelectedTable(table);
    setIsQrDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCodeUrl);
    toast({
      title: "URL disalin!",
      description: "URL pemesanan untuk meja ini telah disalin ke clipboard.",
    });
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
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="flex items-center justify-between mb-6">
             <div className="hidden md:block">
                <h1 className="font-headline text-2xl font-semibold">
                    Manajemen Meja
                </h1>
                <p className="text-muted-foreground">Berikut adalah daftar meja yang tersedia di kafe Anda.</p>
             </div>
            <Button onClick={() => setIsAddTableDialogOpen(true)} className="w-full md:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Meja
            </Button>
          </div>
          <Card>
              <CardContent className="pt-6">
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomor Meja</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ubah Status (Ditempati)</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isTablesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : tables && tables.length > 0 ? (
                       tables.sort((a, b) => a.tableNumber - b.tableNumber).map((table) => (
                        <TableRow key={table.id}>
                            <TableCell className="font-medium">{table.tableNumber}</TableCell>
                            <TableCell>
                                <Badge variant={table.status === 'available' ? 'secondary' : 'default'}>
                                {table.status === 'available' ? 'Tersedia' : 'Terisi'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                               <Switch
                                  checked={table.status === 'occupied'}
                                  onCheckedChange={(checked) => 
                                    handleStatusChange(table.id, checked ? 'occupied' : 'available')
                                  }
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
                                  <DropdownMenuItem onClick={() => handleGenerateQR(table)}>
                                    <QrCode className="mr-2 h-4 w-4" />
                                    <span>Generate QR Code</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                    onClick={() => handleDeleteClick(table)}
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
                          <TableCell colSpan={4} className="text-center h-24">
                            Belum ada meja yang ditambahkan.
                          </TableCell>
                      </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
          </Card>
        </main>
        
        <AddTableDialog 
            isOpen={isAddTableDialogOpen}
            onOpenChange={setIsAddTableDialogOpen}
            tenantId={tenant?.id || ''}
        />
        {selectedTable && (
            <DeleteTableDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                table={selectedTable}
            />
        )}
        <AlertDialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>URL QR Code untuk Meja {selectedTable?.tableNumber}</AlertDialogTitle>
              <AlertDialogDescription>
                Salin URL di bawah ini dan gunakan generator QR code untuk membuat kode QR yang bisa dipindai pelanggan di meja.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center space-x-2">
              <Input value={qrCodeUrl} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Salin URL</span>
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsQrDialogOpen(false)}>Tutup</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };
  
  return (
    <>
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
               <SidebarMenuButton asChild href={`/${slug}/admin`}>
                  <Link href={`/${slug}/admin`}>
                      <Info />
                      <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/orders`}>
                <Link href={`/${slug}/admin/orders`}>
                    <ClipboardList />
                    <span>Pesanan</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/reports`}>
                <Link href={`/${slug}/admin/reports`}>
                    <FileText />
                    <span>Laporan</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/menu`}>
                <Link href={`/${slug}/admin/menu`}>
                    <Utensils />
                    <span>Menu</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild href={`/${slug}/admin/tables`} isActive>
                  <Link href={`/${slug}/admin/tables`}>
                      <Armchair />
                      <span>Meja</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/settings`}>
                <Link href={`/${slug}/admin/settings`}>
                    <Settings />
                    <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        {!isMobile && (
        <SidebarFooter>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2">
            <LogOut />
            <span>Logout</span>
          </Button>
        </SidebarFooter>
        )}
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="font-headline text-xl font-semibold md:hidden">
              Manajemen Meja
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
    </>
  );
}


export default function CafeTableManagementPage() {
  return (
    <SidebarProvider>
      <TablePageContent />
    </SidebarProvider>
  )
}
