'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  FirestorePermissionError,
  errorEmitter,
  useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  MoreHorizontal,
  FileWarning,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const tenantSchema = z.object({
  nama: z.string().min(3, { message: 'Nama tenant minimal 3 karakter.' }),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

type Tenant = {
  id: string;
  nama: string;
  slug: string;
  tokenHarian: string;
  logoUrl: string;
  qrisImageUrl: string;
};

// Helper function to create a slug from a string
const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with a single one
};

// Helper function to generate a random daily token
const generateDailyToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function TenantsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const tenantsRef = collection(firestore, 'tenants');
  const tenantsQuery = useMemoFirebase(() => query(tenantsRef, orderBy('nama', 'asc')), [tenantsRef]);
  const { data: tenants, isLoading, error } = useCollection<Tenant>(tenantsQuery);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      nama: '',
    },
  });

  const handleDialogOpen = (tenant: Tenant | null) => {
    setSelectedTenant(tenant);
    form.reset(tenant ? { nama: tenant.nama } : { nama: '' });
    setIsFormOpen(true);
  };

  const handleAlertOpen = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsAlertOpen(true);
  };

  const onSubmit = async (data: TenantFormValues) => {
    setIsSubmitting(true);
    const slug = createSlug(data.nama);
    const logoPlaceholder = PlaceHolderImages.find(p => p.id === 'cafe-logo');
    const qrisPlaceholder = PlaceHolderImages.find(p => p.id === 'qris-code');

    const tenantData = {
        nama: data.nama,
        slug: slug,
        logoUrl: logoPlaceholder?.imageUrl || `https://placehold.co/100x100?text=${data.nama}`,
        qrisImageUrl: qrisPlaceholder?.imageUrl || 'https://placehold.co/400x400?text=QRIS',
        tokenHarian: generateDailyToken(),
        updatedAt: serverTimestamp(),
    };

    try {
      if (selectedTenant) {
        // Update existing tenant
        const docRef = doc(firestore, 'tenants', selectedTenant.id);
        await updateDoc(docRef, {
            nama: tenantData.nama,
            slug: tenantData.slug,
            updatedAt: tenantData.updatedAt
        });
        toast({ title: 'Berhasil', description: 'Tenant berhasil diperbarui.' });
      } else {
        // Create new tenant
        await addDoc(tenantsRef, {
            ...tenantData,
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Berhasil', description: 'Tenant baru berhasil ditambahkan.' });
      }
      setIsFormOpen(false);
      setSelectedTenant(null);
    } catch (e: any) {
        console.error('Gagal menyimpan tenant:', e);
        const path = selectedTenant ? `tenants/${selectedTenant.id}` : 'tenants';
        const operation = selectedTenant ? 'update' : 'create';
        
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: path,
            operation: operation,
            requestResourceData: tenantData,
        }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTenant) return;
    setIsSubmitting(true);

    try {
      const docRef = doc(firestore, 'tenants', selectedTenant.id);
      await deleteDoc(docRef);
      toast({ title: 'Berhasil', description: 'Tenant berhasil dihapus.' });
      setIsAlertOpen(false);
      setSelectedTenant(null);
    } catch (e: any) {
        console.error('Gagal menghapus tenant:', e);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `tenants/${selectedTenant.id}`,
            operation: 'delete',
        }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
        return (
            <div className="text-center py-10 px-4 rounded-lg bg-destructive/10 border border-destructive/50">
                <FileWarning className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold text-destructive">Gagal Memuat Data</h3>
                <p className="mt-2 text-sm text-destructive/80">
                    Terjadi kesalahan saat mengambil data tenant. Ini kemungkinan besar disebabkan oleh masalah izin Firestore. Pastikan Anda telah mendaftar dan masuk sebagai Super Admin.
                </p>
            </div>
        );
    }

    if (!tenants || tenants.length === 0) {
      return (
        <div className="text-center py-10">
          <h3 className="text-lg font-medium">Belum Ada Tenant</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Klik tombol &quot;Tambah Tenant&quot; untuk memulai.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Tenant</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Token Harian</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.nama}</TableCell>
              <TableCell className="text-muted-foreground">/{tenant.slug}</TableCell>
              <TableCell className="font-mono text-primary">{tenant.tokenHarian}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Buka menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDialogOpen(tenant)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAlertOpen(tenant)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Hapus</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  

  return (
    <>
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Kelola Tenant</CardTitle>
              <CardDescription>
                Buat, lihat, dan kelola tenant kafe Anda.
              </CardDescription>
            </div>
            <Button onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Tenant
            </Button>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant ? 'Edit Tenant' : 'Tambah Tenant Baru'}
            </DialogTitle>
            <DialogDescription>
              Isi detail tenant di bawah ini. Klik simpan jika sudah selesai.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Tenant (Kafe)</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Kopi Kenangan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Simpan'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan menghapus tenant &quot;{selectedTenant?.nama}&quot; secara permanen. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Hapus'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
