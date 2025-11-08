'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, Timestamp } from 'firebase/firestore';
import type { Tenant, User as AppUser, Order, Menu as MenuType } from '@/lib/types';
import {
  Loader2,
  LogOut,
  Settings,
  Store,
  DollarSign,
  ClipboardList,
  PlusCircle,
  BookOpen,
  ArrowRight,
  Utensils,
  Armchair,
  Info,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatRupiah } from '@/lib/utils';

function DashboardContent() {
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

  // --- Data Fetching for Stats ---
  const todayStart = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(start);
  }, []);

  const ordersQuery = useMemoFirebase(
    () => (firestore && tenant ? query(
        collection(firestore, `tenants/${tenant.id}/orders`),
        where('createdAt', '>=', todayStart)
      ) : null),
    [firestore, tenant, todayStart]
  );
  
  const menuQuery = useMemoFirebase(
      () => (firestore && tenant ? collection(firestore, `tenants/${tenant.id}/menus`) : null),
      [firestore, tenant]
  );

  const { data: todayOrders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);
  const { data: menuItems, isLoading: isMenuLoading } = useCollection<MenuType>(menuQuery);


  // --- Stats Calculation ---
  const stats = useMemo(() => {
    if (!todayOrders) return { totalOrders: 0, totalRevenue: 0, availableMenus: 0, unavailableMenus: 0 };
    const totalOrders = todayOrders.length;
    const totalRevenue = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const availableMenus = menuItems?.filter(item => item.available).length || 0;
    const unavailableMenus = (menuItems?.length || 0) - availableMenus;
    
    return {
      totalOrders,
      totalRevenue,
      availableMenus,
      unavailableMenus
    }
  }, [todayOrders, menuItems]);

  useEffect(() => {
    if (isUserLoading || !firestore) {
      return;
    }

    if (!user) {
      router.replace('/admin/cafe/login');
      return;
    }
    
    const verifyUserAndTenant = async () => {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          throw new Error('Profil user tidak ditemukan.');
        }

        const appUser = userDocSnap.data() as AppUser;

        if (appUser.role !== 'admin_kafe' || !appUser.tenantId) {
          throw new Error('Anda tidak memiliki hak akses sebagai admin kafe.');
        }
        
        const tenantDocRef = doc(firestore, 'tenants', appUser.tenantId);
        const tenantDocSnap = await getDoc(tenantDocRef);

        if (!tenantDocSnap.exists()) {
          throw new Error('Kafe yang Anda kelola tidak ditemukan.');
        }

        const tenantData = { id: tenantDocSnap.id, ...tenantDocSnap.data() } as Tenant;

        if (tenantData.slug !== slug) {
          // If slug is mismatched, redirect to the correct one.
          router.replace(`/${tenantData.slug}/admin`);
          // Don't continue rendering on the wrong slug page
          return;
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

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: 'Logout Berhasil',
        description: 'Anda telah keluar dari sesi admin.',
      });
      router.replace('/admin/cafe/login');
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        variant: 'destructive',
        title: 'Logout Gagal',
        description: 'Terjadi kesalahan saat mencoba keluar.',
      });
    }
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-center">Akses Ditolak</CardTitle>
          </CardHeader>
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
                <SidebarMenuButton asChild isActive>
                  <Link href={`/${slug}/admin`}>
                    <Info />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${slug}/admin/orders`}>
                    <ClipboardList />
                    <span>Pesanan</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${slug}/admin/reports`}>
                    <FileText />
                    <span>Laporan</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${slug}/admin/menu`}>
                    <Utensils />
                    <span>Menu</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={`/${slug}/admin/tables`}>
                      <Armchair />
                      <span>Meja</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
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
          </div>
           <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground hidden md:block">
              Login sebagai <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mb-8">
                 <h1 className="font-headline text-2xl font-semibold">Dashboard</h1>
                <p className="mt-1 text-lg text-muted-foreground">
                    Ringkasan untuk <span className="font-semibold text-primary">{tenant?.name}</span> hari ini.
                </p>
            </div>
            
            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pesanan (Hari Ini)</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isOrdersLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{stats.totalOrders}</div>}
                  <p className="text-xs text-muted-foreground">Jumlah pesanan yang masuk hari ini</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendapatan (Hari Ini)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isOrdersLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{formatRupiah(stats.totalRevenue)}</div>}
                  <p className="text-xs text-muted-foreground">Total pendapatan dari pesanan hari ini</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Menu Tersedia</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isMenuLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{stats.availableMenus}</div>}
                  <p className="text-xs text-muted-foreground">
                    {stats.unavailableMenus > 0 ? `${stats.unavailableMenus} menu tidak tersedia` : 'Semua menu tersedia'}
                  </p>
                </CardContent>
              </Card>
            </div>

             {/* Quick Actions */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight">Aksi Cepat</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Link href={`/${slug}/admin/menu`} passHref>
                    <Button variant="outline" size="lg" className="w-full justify-between h-auto py-4">
                        <div className='flex items-center gap-3'>
                            <PlusCircle className='text-primary'/>
                            <div className='text-left'>
                                <p className='font-semibold'>Tambah Menu Baru</p>
                                <p className='text-xs text-muted-foreground'>Buat item baru di daftar menu Anda.</p>
                            </div>
                        </div>
                        <ArrowRight />
                    </Button>
                  </Link>
                  <Link href={`/${slug}/admin/orders`} passHref>
                    <Button variant="outline" size="lg" className="w-full justify-between h-auto py-4">
                        <div className='flex items-center gap-3'>
                            <ClipboardList className='text-primary'/>
                            <div className='text-left'>
                                <p className='font-semibold'>Lihat Pesanan Masuk</p>
                                <p className='text-xs text-muted-foreground'>Kelola pesanan yang sedang berjalan.</p>
                            </div>
                        </div>
                        <ArrowRight />
                    </Button>
                  </Link>
              </div>
            </div>
        </main>
      </SidebarInset>
    </>
  );
}

export default function CafeAdminDashboardPage() {
    return (
        <SidebarProvider>
            <DashboardContent />
        </SidebarProvider>
    )
}
