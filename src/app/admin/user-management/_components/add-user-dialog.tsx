'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { deleteApp, initializeApp, FirebaseError } from 'firebase/app';
import { Loader2 } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { firebaseConfig } from '@/firebase/config';

const addUserSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
  tenantId: z.string().min(1, { message: 'Silakan pilih kafe.' }),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tenants: Tenant[];
}

export function AddUserDialog({ isOpen, onOpenChange, tenants }: AddUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { email: '', password: '', tenantId: '' },
  });

  const onSubmit = async (data: AddUserFormValues) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Layanan Firestore tidak terinisialisasi.',
      });
      return;
    }
    setIsSubmitting(true);

    const selectedTenant = tenants.find(t => t.id === data.tenantId);
    if (!selectedTenant) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tenant yang dipilih tidak valid.' });
      setIsSubmitting(false);
      return;
    }

    // Create a temporary, secondary Firebase app instance to avoid session hijacking.
    const tempAppName = `temp-auth-app-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    let newUserUid: string | null = null;

    try {
      // Step 1: Create user in Firebase Auth using the temporary app instance.
      const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
      newUserUid = userCredential.user.uid;

      // Step 2: Create the user's profile document in Firestore with a specific ID.
      const newUserProfile = {
        authUid: newUserUid,
        email: data.email,
        role: 'admin_kafe' as const,
        tenantId: data.tenantId,
        tenantName: selectedTenant.name,
      };

      // Use setDoc with an explicit document ID (the UID)
      const newUserDocRef = doc(firestore, 'users', newUserUid);
      await setDoc(newUserDocRef, newUserProfile);

      toast({
        title: 'User Berhasil Dibuat',
        description: `User admin untuk ${data.email} telah berhasil dibuat.`,
      });
      
      form.reset();
      onOpenChange(false);

    } catch (error: any) {
      // Handle known Firebase errors
      if (error instanceof FirebaseError) {
        if (error.code === 'permission-denied') {
          const contextualError = new FirestorePermissionError({
            operation: 'create',
            path: `users/${newUserUid || 'unknown_uid'}`,
            requestResourceData: { email: data.email, role: 'admin_kafe' },
          });
          errorEmitter.emit('permission-error', contextualError);
        } else if (error.code === 'auth/email-already-in-use') {
          toast({
            variant: 'destructive',
            title: 'Gagal Membuat User',
            description: 'Email ini sudah terdaftar. Silakan gunakan email lain.',
          });
        } else if (error.code === 'auth/weak-password') {
          toast({
            variant: 'destructive',
            title: 'Gagal Membuat User',
            description: 'Password terlalu lemah. Gunakan minimal 6 karakter.',
          });
        } else {
          // Other Firebase errors
          toast({
            variant: 'destructive',
            title: 'Gagal Membuat User',
            description: `Terjadi kesalahan: [${error.code}] ${error.message}`,
          });
        }
      } else {
        // Generic errors
        toast({
          variant: 'destructive',
          title: 'Gagal Membuat User',
          description: error.message || 'Terjadi kesalahan tidak diketahui pada server.',
        });
      }
    } finally {
      // Always clean up the temporary Firebase app instance.
      await deleteApp(tempApp);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah User Admin Kafe</DialogTitle>
          <DialogDescription>
            Buat akun baru untuk admin yang akan mengelola kafe.
          </DialogDescription>
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
                    <Input type="email" placeholder="admin.kafe@example.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kafe yang Dikelola</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kafe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants.map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  'Simpan User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
