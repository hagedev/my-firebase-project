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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, useDayPicker } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatRupiah } from '@/lib/utils';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

function ReportsPageContent() {
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
  
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(new Date());


  // --- Date Range for Query ---
  const dateRange = useMemo(() => {
    if (filterMode === 'date' && selectedDate) {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      return {
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
      };
    }
    if (filterMode === 'month' && selectedMonth) {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
       return {
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
      };
    }
    // Fallback to a valid default to avoid null queries initially
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { 
        start: Timestamp.fromDate(start), 
        end: Timestamp.fromDate(end)
    };
  }, [selectedDate, selectedMonth, filterMode]);


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
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
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

    const DatePicker = () => (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className="w-full md:w-[280px] justify-start text-left font-normal"
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
    );

    const MonthPicker = () => (
       <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className="w-full md:w-[280px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedMonth ? format(selectedMonth, "MMMM yyyy", { locale: idLocale }) : <span>Pilih bulan</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedMonth}
            onSelect={(month) => {
              if (month) {
                const firstDay = startOfMonth(month);
                setSelectedMonth(firstDay);
                setSelectedDate(firstDay); // Sync date picker
              } else {
                setSelectedMonth(undefined);
                setSelectedDate(undefined);
              }
            }}
            initialFocus
            onMonthChange={setSelectedMonth} // For navigating months in the picker
            className="p-0"
            classNames={{
                caption_label: "flex items-center text-sm font-medium",
                head_row: 'flex',
                head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                day_selected:
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                day_today: 'bg-accent text-accent-foreground',
                day_outside: 'text-muted-foreground opacity-50',
                day_disabled: 'text-muted-foreground opacity-50',
                day_hidden: 'invisible',
                month: 'space-y-4',
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                caption: 'flex justify-center pt-1 relative items-center',
                nav: 'space-x-1 flex items-center',
                nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
            }}
             components={{
                Caption: ({ ...props }) => {
                    const { fromDate, toDate } = useDayPicker();

                    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newDate = new Date(props.displayMonth);
                        newDate.setMonth(parseInt(e.target.value, 10));
                        setSelectedMonth(startOfMonth(newDate));
                    };

                    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newDate = new Date(props.displayMonth);
                        newDate.setFullYear(parseInt(e.target.value, 10));
                        setSelectedMonth(startOfMonth(newDate));
                    };

                    const months = Array.from({ length: 12 }, (_, i) => ({
                        value: i,
                        label: format(new Date(0, i), 'MMMM', { locale: idLocale }),
                    }));

                    const years: number[] = [];
                    if (fromDate && toDate) {
                        const fromYear = fromDate.getFullYear();
                        const toYear = toDate.getFullYear();
                        for (let year = fromYear; year <= toYear; year++) {
                            years.push(year);
                        }
                    } else {
                        const currentYear = new Date().getFullYear();
                        for(let i = -5; i<=0; i++) years.push(currentYear + i)
                    }

                    return (
                        <div className="flex justify-center gap-2 p-2">
                           <select 
                                onChange={handleMonthChange}
                                value={props.displayMonth.getMonth()}
                                className="p-1 rounded-md border text-sm"
                            >
                                {months.map(month => (
                                    <option key={month.value} value={month.value}>{month.label}</option>
                                ))}
                            </select>
                            <select
                                onChange={handleYearChange}
                                value={props.displayMonth.getFullYear()}
                                className="p-1 rounded-md border text-sm"
                             >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    );
                },
            }}
          />
        </PopoverContent>
      </Popover>
    );

    return (
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <p className="text-muted-foreground hidden md:block">Analisis penjualan dan transaksi kafe Anda.</p>
          <div className="flex w-full md:w-auto flex-col md:flex-row md:items-center gap-4">
            <RadioGroup defaultValue="date" value={filterMode} onValueChange={(value: 'date' | 'month') => setFilterMode(value)} className="flex items-center">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="r-date" />
                <Label htmlFor="r-date">Per Tanggal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="r-month" />
                <Label htmlFor="r-month">Per Bulan</Label>
              </div>
            </RadioGroup>
            {filterMode === 'date' ? <DatePicker /> : <MonthPicker />}
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
                  <p className="text-xs text-muted-foreground">Total pendapatan pada periode yang dipilih</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                   {isOrdersLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{reportSummary.totalTransactions}</div>}
                  <p className="text-xs text-muted-foreground">Jumlah transaksi pada periode yang dipilih</p>
                </CardContent>
              </Card>
            </div>


        <Card>
          <CardHeader>
              <CardTitle>Detail Transaksi</CardTitle>
              <CardDescription>Daftar semua transaksi yang tercatat pada periode yang dipilih.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="border rounded-md overflow-x-auto">
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
                            {order.createdAt ? format(order.createdAt.toDate(), 'dd/MM/yy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>Meja {order.tableNumber}</TableCell>
                        <TableCell>{formatRupiah(order.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={order.paymentVerified ? 'secondary' : 'default'}>
                            {(order.paymentMethod || 'N/A').toUpperCase()} - {order.paymentVerified ? 'Lunas' : 'Belum'}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        Tidak ada transaksi pada periode yang dipilih.
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
                    <Info />
                    Dashboard
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/orders`}>
                <ClipboardList />
                Pesanan
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/reports`} isActive>
                <FileText />
                Laporan
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/menu`}>
                <Utensils />
                Menu
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild href={`/${slug}/admin/tables`}>
                    <Armchair />
                    Meja
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild href={`/${slug}/admin/settings`}>
                <Settings />
                Settings
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
    </>
  );
}

export default function CafeReportsPage() {
  return (
    <SidebarProvider>
      <ReportsPageContent />
    </SidebarProvider>
  )
}
