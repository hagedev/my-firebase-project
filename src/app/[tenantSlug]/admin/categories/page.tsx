'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  getDocs,
  Firestore,
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
import { useParams } from 'next/navigation';
import type { Category } from '@/lib/types';

const categorySchema = z.object({
  name: z.string().min(3, { message: 'Nama kategori minimal 3 karakter.' }),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

type CategoryWithId = Category & { id: string };

function CategoryList({ firestore, tenantId }: { firestore: Firestore, tenantId: string }) {
  const categoriesRef = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/categories`), [firestore, tenantId]);
  const categoriesQuery = useMemoFirebase(() => query(categoriesRef, orderBy('name', 'asc')), [categoriesRef]);
  const { data: categories, isLoading, error } = useCollection<CategoryWithId>(categoriesQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithId | null>(null);
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });

  const handleDialogOpen = (category: CategoryWithId | null) => {
    setSelectedCategory(category);
    form.reset(category ? { name: category.name } : { name: '' });
    setIsFormOpen(true);
  };

  const handleAlertOpen = (category: CategoryWithId) => {
    setSelectedCategory(category);
    setIsAlertOpen(true);
  };

  const onSubmit = async (data: CategoryFormValues) => {
    if (!categoriesRef) return;
    setIsSubmitting(true);
    const categoryData = { name: data.name };

    if (selectedCategory) {
      // Perbarui kategori yang ada
      const docRef = doc(firestore, `tenants/${tenantId}/categories`, selectedCategory.id);
      updateDoc(docRef, categoryData)
        .then(() => {
          toast({ title: 'Berhasil', description: 'Kategori berhasil diperbarui.' });
          setIsFormOpen(false);
        })
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: categoryData,
          }));
        })
        .finally(() => setIsSubmitting(false));
    } else {
      // Buat kategori baru
      addDoc(categoriesRef, { ...categoryData, tenantId, order: (categories?.length ?? 0) + 1 })
        .then(() => {
          toast({ title: 'Berhasil', description: 'Kategori baru berhasil ditambahkan.' });
          setIsFormOpen(false);
        })
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: categoriesRef.path,
            operation: 'create',
            requestResourceData: categoryData,
          }));
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    const docRef = doc(firestore, `tenants/${tenantId}/categories`, selectedCategory.id);
    
    deleteDoc(docRef)
        .then(() => {
            toast({ title: 'Berhasil', description: 'Kategori berhasil dihapus.' });
            setIsAlertOpen(false);
        })
        .catch(() => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            }));
        })
        .finally(() => setIsSubmitting(false));
  }, [selectedCategory, firestore, toast, tenantId]);

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
                <h3 className="mt-4 text-lg font-semibold text-destructive">Gagal Memuat Kategori</h3>
                <p className="mt-2 text-sm text-destructive/80">
                    Tidak dapat mengambil data kategori. Ini mungkin karena masalah izin Firestore. Pastikan Anda memiliki akses yang benar.
                </p>
            </div>
        );
    }

    if (!categories || categories.length === 0) {
      return (
        <div className="text-center py-10">
          <h3 className="text-lg font-medium">Belum Ada Kategori</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Klik tombol "Tambah Kategori" untuk membuat kategori menu pertama Anda.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Kategori</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Buka menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDialogOpen(category)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAlertOpen(category)}
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
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Kelola Kategori Menu</CardTitle>
              <CardDescription>
                Buat, lihat, dan kelola kategori untuk menu Anda.
              </CardDescription>
            </div>
            <Button onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kategori
            </Button>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
            <DialogDescription>
              Isi nama kategori di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Kopi, Makanan Ringan" {...field} />
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
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Simpan'}
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
                    Tindakan ini akan menghapus kategori &quot;{selectedCategory?.name}&quot; secara permanen. Menu yang terkait mungkin perlu diperbarui.
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


export default function TenantCategoriesPage() {
    const firestore = useFirestore();
    const params = useParams();
    const [tenant, setTenant] = useState<{ id: string, name: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const tenantSlug = params.tenantSlug as string;

    useEffect(() => {
        const fetchTenant = async () => {
            if (!firestore || !tenantSlug) return;
            setIsLoading(true);
            try {
                const tenantsRef = collection(firestore, 'tenants');
                const q = query(tenantsRef, where("slug", "==", tenantSlug));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setError(`Tenant dengan slug "${tenantSlug}" tidak ditemukan.`);
                } else {
                    const tenantDoc = querySnapshot.docs[0];
                    setTenant({ id: tenantDoc.id, name: tenantDoc.data().nama });
                }
            } catch (e: any) {
                setError("Gagal memuat data tenant. Kemungkinan karena masalah izin.");
                const permissionError = new FirestorePermissionError({
                    path: 'tenants',
                    operation: 'list',
                });
                errorEmitter.emit('permission-error', permissionError);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTenant();
    }, [firestore, tenantSlug]);

    if (isLoading) {
        return (
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }

    if (error) {
         return (
            <div className="container mx-auto p-4 md:p-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!tenant) {
        return null; // Harus ditangani oleh state error
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <CategoryList firestore={firestore} tenantId={tenant.id} />
        </div>
    );
}
