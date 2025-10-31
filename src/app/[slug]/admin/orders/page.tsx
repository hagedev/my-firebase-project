'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import {
  doc,
  getDoc,
  collection,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  limit,
  getDocs,
  startAfter,
  endBefore,
  limitToLast,
  DocumentSnapshot,
} from 'firebase/firestore';
import type { Tenant, User as AppUser, Order } from '@/lib/types';
import {
  Loader2,
  LogOut,
  Settings,
  Store,
  Utensils,
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderDetailsDialog } from './_components/order-details-dialog';

const ORDERS_PER_PAGE = 20;

export default function CafeOrdersManagementPage() {
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
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // --- Pagination and Data State ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null);
  const [page, setPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);


  // --- Date Range for Today's Orders ---
  const { todayStart, todayEnd } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return {
      todayStart: Timestamp.fromDate(start),
      todayEnd: Timestamp.fromDate(end),
    };
  }, []);
  
  const fetchOrders = useCallback(async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
    if (!firestore || !tenant) return;

    setIsOrdersLoading(true);
    let q = query(
      collection(firestore, `tenants/${tenant.id}/orders`),
      where('createdAt', '>=', todayStart),
      where('createdAt', '<=', todayEnd),
      orderBy('createdAt', 'desc')
    );

    if (direction === 'next' && lastVisible) {
      q = query(q, startAfter(lastVisible), limit(ORDERS_PER_PAGE));
    } else if (direction === 'prev' && firstVisible) {
      q = query(q, endBefore(firstVisible), limitToLast(ORDERS_PER_PAGE));
    } else {
      q = query(q, limit(ORDERS_PER_PAGE));
    }
    
    try {
      const documentSnapshots = await getDocs(q);
      const newOrders = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

      if (newOrders.length === 0) {
        if(direction === 'next') setIsLastPage(true);
        if(direction === 'initial') setOrders([]);
        if(direction !== 'initial') toast({ title: "Tidak ada data lagi", description: direction === 'next' ? 'Anda sudah di halaman terakhir' : 'Kembali ke halaman pertama' });
      } else {
        setOrders(newOrders);
        setFirstVisible(documentSnapshots.docs[0]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        if(direction === 'next') setPage(p => p + 1);
        if(direction === 'prev') setPage(p => p - 1);
        if(direction === 'initial') setPage(1);

        // Check if it's the last page on a 'next' call
        if (direction === 'next' || direction === 'initial') {
            const nextQuery = query(collection(firestore, `tenants/${tenant.id}/orders`), orderBy('createdAt', 'desc'), startAfter(documentSnapshots.docs[documentSnapshots.docs.length - 1]), limit(1));
            const nextSnap = await getDocs(nextQuery);
            setIsLastPage(nextSnap.empty);
        } else {
             setIsLastPage(false);
        }
      }
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      toast({ variant: 'destructive', title: 'Gagal Memuat Pesanan', description: err.message });
      setOrders([]);
    } finally {
      setIsOrdersLoading(false);
    }
  }, [firestore, tenant, todayStart, todayEnd, lastVisible, firstVisible, toast]);

  // --- Initial Fetch & Refetch on Tenant Change ---
  useEffect(() => {
    if (tenant) {
      fetchOrders('initial');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]); // Only re-run when tenant is set


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

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    if (!firestore || !tenant) return;
    try {
        const orderDocRef = doc(firestore, `tenants/${tenant.id}/orders`, orderId);
        await updateDoc(orderDocRef, { status: newStatus });
        
        // Update local state to show immediate feedback
        setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status: newStatus} : o));

        toast({
            title: 'Status Pesanan Diperbarui',
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui Status',
            description: error.message,
        });
    }
  };
  
  const handlePaymentVerifiedChange = async (orderId: string, isVerified: boolean) => {
    if (!firestore || !tenant) return;
    try {
        const orderDocRef = doc(firestore, `tenants/${tenant.id}/orders`, orderId);
        await updateDoc(orderDocRef, { paymentVerified: isVerified });
        
        // Update local state
        setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, paymentVerified: isVerified} : o));

        toast({
            title: 'Status Pembayaran Diperbarui',
            description: `Pesanan ditandai sebagai ${isVerified ? 'Lunas' : 'Belum Lunas'}.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Gagal Memverifikasi',
            description: error.message,
        });
    }
  };

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsDialogOpen(true);
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
          <Card>
            <CardHeader>
                <CardTitle>Daftar Pesanan Hari Ini</CardTitle>
                <CardDescription>Pantau dan kelola semua pesanan yang masuk untuk hari ini. Klik baris untuk melihat detail.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meja</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Lunas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isOrdersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : orders && orders.length > 0 ? (
                      orders.map((order) => (
                        <TableRow key={order.id} onClick={() => handleRowClick(order)} className="cursor-pointer">
                          <TableCell className="font-medium">Meja {order.tableNumber}</TableCell>
                          <TableCell>{formatRupiah(order.totalAmount || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={'outline'}>
                              {(order.paymentMethod || 'N/A').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                             <Select
                                value={order.status}
                                onValueChange={(value: Order['status']) => handleStatusChange(order.id, value)}
                                >
                                <SelectTrigger className="w-full min-w-[160px]">
                                    <SelectValue placeholder="Ubah status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="received">Diterima</SelectItem>
                                    <SelectItem value="preparing">Disiapkan</SelectItem>
                                    <SelectItem value="ready">Siap Diambil</SelectItem>
                                    <SelectItem value="delivered">Selesai</SelectItem>
                                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                </SelectContent>
                                </Select>
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <Switch
                                    id={`payment-switch-${order.id}`}
                                    checked={order.paymentVerified}
                                    onCheckedChange={(isChecked) => handlePaymentVerifiedChange(order.id, isChecked)}
                                />
                                 <Label htmlFor={`payment-switch-${order.id}`} className="text-xs text-muted-foreground">
                                    {order.paymentVerified ? 'Lunas' : 'Belum Lunas'}
                                 </Label>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Belum ada pesanan yang masuk hari ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
               <div className="flex items-center justify-end space-x-2 py-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious 
                                    onClick={() => fetchOrders('prev')} 
                                    aria-disabled={page <= 1}
                                    className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                                />
                            </PaginationItem>
                             <PaginationItem>
                                <span className="p-2 text-sm font-medium">Halaman {page}</span>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext 
                                    onClick={() => fetchOrders('next')} 
                                    aria-disabled={isLastPage}
                                    className={isLastPage ? "pointer-events-none opacity-50" : undefined}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </CardContent>
          </Card>
        </main>
        
        <OrderDetailsDialog 
          isOpen={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          order={selectedOrder}
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
              <SidebarMenuButton asChild isActive>
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
              <SidebarMenuButton asChild>
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
              Manajemen Pesanan
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
