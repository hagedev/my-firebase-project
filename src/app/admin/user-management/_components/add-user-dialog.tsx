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
import { useFirestore, useAuth } from '@/firebase';
import { collection, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { FirebaseError } from 'firebase/app';


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
  const auth = useAuth(); // Temporary auth instance for user creation

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { email: '', password: '', tenantId: '' },
  });

  const onSubmit = async (data: AddUserFormValues) => {
    if (!firestore || !auth) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Layanan tidak terinisialisasi.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      // Step 1: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newAuthUser = userCredential.user;

      // Step 2: Create user document in Firestore within a batch
      const selectedTenant = tenants.find(t => t.id === data.tenantId);
      if (!selectedTenant) {
        throw new Error("Tenant tidak ditemukan.");
      }
      
      const batch = writeBatch(firestore);
      const usersCollection = collection(firestore, 'users');
      const newUserDocRef = addDoc(usersCollection, {
        authUid: newAuthUser.uid,
        email: data.email,
        role: 'admin_kafe',
        tenantId: data.tenantId,
        tenantName: selectedTenant.name, // Denormalize tenant name
        createdAt: serverTimestamp(),
      });

      // Commit the batch
      await batch.commit();

      toast({
        title: 'User Berhasil Dibuat',
        description: `User admin kafe untuk ${data.email} telah berhasil dibuat.`,
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding user: ', error);
      let description = 'Terjadi kesalahan pada server.';
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
            description = 'Email ini sudah digunakan oleh akun lain.';
        } else if (error.code === 'auth/weak-password') {
            description = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
        }
      }
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat User',
        description: description,
      });
    } finally {
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
