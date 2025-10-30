'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, Timestamp, orderBy } from 'firebase/firestore';
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
  Calendar as CalendarIcon,
  DollarSign,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';


export default function CafeReportsPage() {
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // --- Date Range for Query ---
  const dateRange = useMemo(() => {
    if (!selectedDate) return { start: null, end: null };
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return {
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
    };
  }, [selectedDate]);


  // --- Data Fetching ---
  const ordersQuery = useMemoFirebase(
    () => {
        if (!firestore || !tenant || !dateRange.start || !dateRange.end) return null;
        return query(
            collection(firestore, `tenants/${tenant.id}/orders`),
            where('createdAt', '>=', dateRange.start),
            where('createdAt', '<=', dateRange.end),
            orderBy('createdAt', 'desc')
        );
    },
    [firestore, tenant, dateRange]
  );
  
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  const reportSummary = useMemo(() => {
    if (!orders) return { totalRevenue: 0, totalTransactions: 0 };
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalTransactions = orders.length;
    return { totalRevenue, totalTransactions };
  }, [orders]);

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
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-headline text-2xl md:text-3xl font-bold">Laporan Transaksi</h1>
            <p className="text-muted-foreground">Analisis penjualan dan transaksi kafe Anda.</p>
          </div>
          <div>
             <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className="w-[280px] justify-start text-left font-normal"
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    />
                </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Summary Cards */}
         <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isOrdersLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{formatRupiah(reportSummary.totalRevenue)}</div>}
                  <p className="text-xs text-muted-foreground">Total pendapatan pada tanggal yang dipilih</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                   {isOrdersLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{reportSummary.totalTransactions}</div>}
                  <p className="text-xs text-muted-foreground">Jumlah transaksi pada tanggal yang dipilih</p>
                </CardContent>
              </Card>
            </div>


        <Card>
          <CardHeader>
              <CardTitle>Detail Transaksi</CardTitle>
              <CardDescription>Daftar semua transaksi yang tercatat pada tanggal yang dipilih.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Meja</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                            {order.createdAt ? format(order.createdAt.toDate(), 'HH:mm:ss') : 'N/A'}
                        </TableCell>
                        <TableCell>Meja {order.tableNumber}</TableCell>
                        <TableCell>{formatRupiah(order.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={order.paymentVerified ? 'secondary' : 'default'}>
                            {order.paymentMethod.toUpperCase()} - {order.paymentVerified ? 'Lunas' : 'Belum'}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        Tidak ada transaksi pada tanggal yang dipilih.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
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
                <Link href={`/${slug}/admin/orders`}>
                  <ClipboardList />
                  Manajemen Pesanan
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <Link href={`/${slug}/admin/reports`}>
                  <FileText />
                  Laporan Transaksi
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
              Laporan Transaksi
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
