'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useStorage } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Tenant, User as AppUser } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { getValidImageUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
  Upload,
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
import Link from 'next/link';

// Schema for the main settings form (excluding images)
const settingsSchema = z.object({
  name: z.string().min(3, 'Nama kafe minimal 3 karakter.'),
  tokenHarian: z.string().length(4, 'Token harus 4 digit angka.'),
  address: z.string().optional(),
  ownerName: z.string().optional(),
  phoneNumber: z.string().optional(),
  receiptMessage: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') 
      .replace(/\s+/g, '-') 
      .replace(/-+/g, '-'); 
};

// Image Upload Component
interface ImageUploadCardProps {
  title: string;
  description: string;
  currentImageUrl: string | null;
  onUploadComplete: (url: string) => Promise<void>;
  tenantId: string;
  storagePath: 'logos' | 'qris';
}

function ImageUploadCard({ title, description, currentImageUrl, onUploadComplete, tenantId, storagePath }: ImageUploadCardProps) {
  const storage = useStorage();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage || !tenantId) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ variant: 'destructive', title: 'Ukuran File Terlalu Besar', description: 'Ukuran file maksimal adalah 5MB.' });
      return;
    }
    
    setIsUploading(true);

    try {
      const fileRef = ref(storage, `tenants/${tenantId}/${storagePath}/${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await onUploadComplete(downloadURL);
      toast({ title: 'Upload Berhasil!', description: `${title} telah diperbarui.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };
  
  const validImageUrl = getValidImageUrl(currentImageUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validImageUrl ? (
           <div className="mt-2 p-4 border rounded-md flex justify-center items-center">
            <Image 
              src={validImageUrl} 
              alt={`Preview ${title}`}
              width={storagePath === 'logos' ? 150 : 250}
              height={storagePath === 'logos' ? 150 : 250}
              className="rounded-md object-contain"
            />
          </div>
        ) : (
          <div className="mt-2 p-4 border rounded-md flex justify-center items-center h-[150px] bg-muted/50">
            <p className="text-sm text-muted-foreground">Belum ada gambar</p>
          </div>
        )}
       
        <Button asChild variant="outline" className="w-full" disabled={isUploading}>
          <label htmlFor={`file-upload-${storagePath}`} className="cursor-pointer">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Ganti Gambar
              </>
            )}
            <input 
              id={`file-upload-${storagePath}`}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        </Button>
      </CardContent>
    </Card>
  );
}


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
      address: '',
      ownerName: '',
      phoneNumber: '',
      receiptMessage: '',
    },
  });

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
      // Only update text fields here. Image URLs are updated via onUploadComplete.
      await updateDoc(tenantDocRef, {
        name: data.name,
        slug: newSlug,
        tokenHarian: data.tokenHarian,
        address: data.address,
        ownerName: data.ownerName,
        phoneNumber: data.phoneNumber,
        receiptMessage: data.receiptMessage,
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

  const handleImageUploadComplete = useCallback(async (fieldName: 'logoUrl' | 'qrisImageUrl', url: string) => {
    if (!firestore || !tenant) return;
    const tenantDocRef = doc(firestore, 'tenants', tenant.id);
    try {
      await updateDoc(tenantDocRef, { [fieldName]: url });
      // Update local tenant state to reflect the new image URL for the preview
      setTenant(prev => prev ? { ...prev, [fieldName]: url } : null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan URL Gambar', description: error.message });
    }
  }, [firestore, tenant, toast]);

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
    if (isLoading || isUserLoading || !tenant) {
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
                            <CardTitle>Informasi Umum</CardTitle>
                            <CardDescription>
                                Perbarui detail kontak dan informasi umum untuk kafe Anda.
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
            
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <ImageUploadCard
                title="Logo Kafe"
                description="Upload logo untuk kafe Anda. Direkomendasikan rasio 1:1 (persegi)."
                currentImageUrl={tenant.logoUrl || null}
                onUploadComplete={(url) => handleImageUploadComplete('logoUrl', url)}
                tenantId={tenant.id}
                storagePath="logos"
              />
              <ImageUploadCard
                title="Gambar QRIS"
                description="Upload gambar kode QRIS untuk pembayaran."
                currentImageUrl={tenant.qrisImageUrl || null}
                onUploadComplete={(url) => handleImageUploadComplete('qrisImageUrl', url)}
                tenantId={tenant.id}
                storagePath="qris"
              />
            </div>
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
