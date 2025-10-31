'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Tenant, User as AppUser } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { getValidImageUrl } from '@/lib/utils';

import {
  Loader2,
  LogOut,
  Settings,
  Store,
  Save,
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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const settingsSchema = z.object({
  name: z.string().min(3, 'Nama kafe minimal 3 karakter.'),
  tokenHarian: z.string().length(4, 'Token harus 4 digit angka.'),
  address: z.string().optional(),
  ownerName: z.string().optional(),
  phoneNumber: z.string().optional(),
  receiptMessage: z.string().optional(),
  logoUrl: z.string().url({ message: 'URL tidak valid' }).or(z.literal('')).optional(),
  qrisImageUrl: z.string().url({ message: 'URL tidak valid' }).or(z.literal('')).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') 
      .replace(/\s+/g, '-') 
      .replace(/-+/g, '-'); 
};

export default function CafeSettingsPage() {
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

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      tokenHarian: '',
      logoUrl: '',
      qrisImageUrl: '',
      address: '',
      ownerName: '',
      phoneNumber: '',
      receiptMessage: '',
    },
  });

  const watchedLogoUrl = form.watch('logoUrl');
  const watchedQrisUrl = form.watch('qrisImageUrl');
  
  const validLogoUrl = getValidImageUrl(watchedLogoUrl);
  const validQrisUrl = getValidImageUrl(watchedQrisUrl);


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
        form.reset({
          name: tenantData.name,
          tokenHarian: tenantData.tokenHarian || '',
          logoUrl: tenantData.logoUrl || '',
          qrisImageUrl: tenantData.qrisImageUrl || '',
          address: tenantData.address || '',
          ownerName: tenantData.ownerName || '',
          phoneNumber: tenantData.phoneNumber || '',
          receiptMessage: tenantData.receiptMessage || '',
        });

      } catch (e: any) {
        console.error("Verification error:", e);
        setError(e.message || 'Terjadi kesalahan saat verifikasi.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyUserAndTenant();

  }, [user, isUserLoading, firestore, slug, router, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    if (!firestore || !tenant) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal menyimpan data.' });
      return;
    }

    const tenantDocRef = doc(firestore, 'tenants', tenant.id);
    const newSlug = createSlug(data.name);

    try {
      await updateDoc(tenantDocRef, {
        name: data.name,
        slug: newSlug,
        tokenHarian: data.tokenHarian,
        address: data.address,
        ownerName: data.ownerName,
        phoneNumber: data.phoneNumber,
        receiptMessage: data.receiptMessage,
        logoUrl: data.logoUrl,
        qrisImageUrl: data.qrisImageUrl,
      });

      toast({
        title: 'Berhasil!',
        description: 'Profil kafe Anda telah diperbarui.',
      });

      if (newSlug !== slug) {
        router.replace(`/${newSlug}/admin/settings`);
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: error.message || 'Terjadi kesalahan pada server.',
      });
    }
  };


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

  const pageContent = () => {
    if (isLoading || isUserLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Memuat data...</p>
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Informasi Umum & Gambar</CardTitle>
                            <CardDescription>
                                Perbarui detail kontak, informasi umum, dan gambar untuk kafe Anda.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Kafe</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Contoh: Kopi Kenangan" {...field} />
                                        </FormControl>
                                        <FormDescription>Perubahan nama akan otomatis mengubah URL kafe Anda.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="tokenHarian"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Token Harian</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Contoh: 1234" maxLength={4} {...field} />
                                        </FormControl>
                                        <FormDescription>4 digit angka untuk verifikasi pesanan pelanggan.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ownerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Pemilik</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nomor Handphone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="081234567890" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alamat Kafe</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Jl. Sudirman No. 123, Jakarta" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="receiptMessage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pesan Pada Struk</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Terima kasih telah berkunjung!" {...field} />
                                        </FormControl>
                                        <FormDescription>Pesan ini akan tercetak di bagian bawah struk pelanggan.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="logoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL Logo Kafe</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Buka Google Photos, klik kanan pada gambar, lalu pilih "Copy Image Address".
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {validLogoUrl && (
                                <div className="mt-4">
                                <FormLabel>Preview Logo</FormLabel>
                                <div className="mt-2 p-4 border rounded-md flex justify-center items-center">
                                    <Image 
                                        src={validLogoUrl} 
                                        alt="Preview Logo" 
                                        width={150} 
                                        height={150}
                                        className="rounded-md object-contain"
                                    />
                                </div>
                                </div>
                            )}

                             <FormField
                                control={form.control}
                                name="qrisImageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL Gambar QRIS</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Buka Google Photos, klik kanan pada gambar, lalu pilih "Copy Image Address".
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             {validQrisUrl && (
                                <div className="mt-4">
                                <FormLabel>Preview QRIS</FormLabel>
                                <div className="mt-2 p-4 border rounded-md flex justify-center items-center">
                                    <Image 
                                        src={validQrisUrl} 
                                        alt="Preview QRIS" 
                                        width={250} 
                                        height={250}
                                        className="rounded-md object-contain"
                                    />
                                </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Simpan Perubahan
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </main>
    )
  }
  
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
              <SidebarMenuButton asChild isActive>
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
              Settings
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
