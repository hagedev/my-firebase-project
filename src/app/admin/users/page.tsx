'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Firestore,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  FirestorePermissionError,
  errorEmitter,
  useMemoFirebase,
  useAuth,
} from '@/firebase';
import { Auth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  MoreHorizontal,
  FileWarning,
  UserCog,
  Store,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Tenant, User } from '@/lib/types';

// Validation schema for the user form
const userSchema = z.object({
  email: z.string().email({ message: 'Email tidak valid.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }).optional().or(z.literal('')),
  tenantId: z.string({ required_error: 'Pilih tenant untuk admin ini.' }),
});

type UserFormValues = z.infer<typeof userSchema>;


function UserList({ firestore, auth }: { firestore: Firestore; auth: Auth }) {
  // Data fetching
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), orderBy('email', 'asc')), [firestore]);
  const tenantsQuery = useMemoFirebase(() => query(collection(firestore, 'tenants'), orderBy('nama', 'asc')), [firestore]);
  
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useCollection<User>(usersQuery);
  const { data: tenants, isLoading: isLoadingTenants, error: tenantsError } = useCollection<Tenant>(tenantsQuery);

  const users = useMemo(() => {
    if (!usersData || !tenants) return [];
    const tenantMap = new Map(tenants.map(t => [t.id, t.nama]));
    return usersData.map(user => ({
      ...user,
      tenantName: user.tenantId ? tenantMap.get(user.tenantId) : undefined,
    }));
  }, [usersData, tenants]);

  // Component state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', password: '', tenantId: '' },
  });

  const handleDialogOpen = (user: User | null) => {
    setSelectedUser(user);
    if (user) {
      form.reset({
        email: user.email,
        password: '',
        tenantId: user.tenantId,
      });
    } else {
      form.reset({ email: '', password: '', tenantId: '' });
    }
    setIsFormOpen(true);
  };

  const handleAlertOpen = (user: User) => {
    setSelectedUser(user);
    setIsAlertOpen(true);
  };

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);

    if (selectedUser) { // Update existing user
      const userRef = doc(firestore, 'users', selectedUser.id);
      const updatedData = { tenantId: data.tenantId };
      await updateDoc(userRef, updatedData)
        .then(() => {
            toast({ title: 'Berhasil', description: 'Peran pengguna berhasil diperbarui.' });
            setIsFormOpen(false);
            setSelectedUser(null);
        })
        .catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });

    } else { // Create new user
      if (!data.password) {
          form.setError('password', { message: 'Password wajib diisi untuk pengguna baru.' });
          setIsSubmitting(false);
          return;
      }
      
      let userCredential;
      try {
        // Step 1: Create user in Firebase Auth
        userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const newUser = userCredential.user;

        // Step 2: Create user document in Firestore. Await this to handle errors properly.
        const userRef = doc(firestore, 'users', newUser.uid);
        const userData = {
            email: data.email,
            role: 'admin_kafe' as const,
            tenantId: data.tenantId,
        };
        await setDoc(userRef, userData);

        // If both succeed:
        toast({ title: 'Berhasil', description: 'Pengguna admin kafe baru berhasil dibuat.' });
        setIsFormOpen(false);
        setSelectedUser(null);

      } catch (error: any) {
        console.error("User creation failed:", error);
        let title = 'Pendaftaran Gagal';
        let description = 'Terjadi kesalahan yang tidak diketahui.';

        if (error.code === 'auth/email-already-in-use') {
            title = 'Kesalahan Autentikasi';
            description = 'Email ini sudah digunakan oleh pengguna lain.';
        } else if (error.name === 'FirebaseError' && error.message.includes('permission-denied')) {
            title = 'Kesalahan Izin';
            description = 'Gagal menyimpan data pengguna ke database karena masalah izin.';
            
            // CRITICAL: Rollback user creation if Firestore write fails
            if (userCredential) {
              try {
                await deleteUser(userCredential.user);
                description += ' Pembuatan pengguna telah dibatalkan.';
              } catch (deleteError) {
                 console.error("Failed to rollback user creation:", deleteError);
                 description += ' Gagal membatalkan pembuatan pengguna, mohon hapus manual dari Firebase Authentication.';
              }
            }
        } else {
            description = error.message;
        }

        toast({ variant: 'destructive', title, description });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = useCallback(async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    
    const docRef = doc(firestore, 'users', selectedUser.id);
    
    // Note: This only deletes the Firestore record, not the Auth user.
    // For a real app, you'd want a Cloud Function to handle this securely.
    await deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Berhasil', description: `Pengguna ${selectedUser.email} berhasil dihapus.` });
        setIsAlertOpen(false);
        setSelectedUser(null);
      })
      .catch((e: any) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${selectedUser.id}`,
          operation: 'delete',
        }));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [selectedUser, firestore, toast]);

  const renderContent = () => {
    if (isLoadingUsers || isLoadingTenants) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (usersError || tenantsError) {
      return (
        <div className="text-center py-10 px-4 rounded-lg bg-destructive/10 border border-destructive/50">
          <FileWarning className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold text-destructive">Gagal Memuat Data</h3>
          <p className="mt-2 text-sm text-destructive/80">
            Tidak dapat memuat data pengguna atau tenant. Ini bisa jadi karena masalah izin Firestore.
          </p>
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="text-center py-10">
          <h3 className="text-lg font-medium">Belum Ada Pengguna</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Klik tombol "Tambah Pengguna" untuk membuat admin kafe pertama.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Peran</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>
                {user.role === 'superadmin' ? (
                   <Badge variant="destructive"><UserCog className="mr-2 h-3 w-3"/>Super Admin</Badge>
                ) : (
                   <Badge variant="secondary"><Store className="mr-2 h-3 w-3"/>Admin Kafe</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{user.tenantName || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Buka menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDialogOpen(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAlertOpen(user)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      disabled={user.role === 'superadmin'}
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
            <CardTitle>Kelola Pengguna</CardTitle>
            <CardDescription>Buat, lihat, dan kelola pengguna admin kafe.</CardDescription>
          </div>
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengguna
          </Button>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit Pengguna' : 'Tambah Admin Kafe'}</DialogTitle>
            <DialogDescription>Isi detail di bawah ini. Klik simpan jika selesai.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin.kafe@example.com" {...field} disabled={!!selectedUser} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!selectedUser && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
               <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tenant Kafe</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih tenant yang akan dikelola" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {tenants?.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.nama}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>
                        Pilih kafe yang akan dikelola oleh admin ini.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Batal</Button>
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
              Tindakan ini akan menghapus data pengguna "{selectedUser?.email}" dari database. Tindakan ini tidak dapat dibatalkan. Untuk keamanan, akun otentikasi tidak akan dihapus secara otomatis.
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

export default function UsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <UserList firestore={firestore} auth={auth} />
    </div>
  );
}

    