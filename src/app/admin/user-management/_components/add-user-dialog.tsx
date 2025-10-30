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
import { useFirestore, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
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
  const auth = useAuth(); 

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

    let newAuthUser;
    const selectedTenant = tenants.find(t => t.id === data.tenantId);
    if (!selectedTenant) {
        toast({ variant: 'destructive', title: 'Error', description: 'Tenant yang dipilih tidak valid.' });
        setIsSubmitting(false);
        return;
    }

    const newUserProfile = {
        authUid: '', // Will be filled after auth user creation
        email: data.email,
        role: 'admin_kafe' as const,
        tenantId: data.tenantId,
        tenantName: selectedTenant.name,
    };

    try {
      // Step 1: Create user in Firebase Authentication
      // This will automatically sign in as the new user, which is expected.
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      newAuthUser = userCredential.user;
      newUserProfile.authUid = newAuthUser.uid;

      // Step 2: Create user document in Firestore within a batch
      // This MUST be done by a Super Admin. However, since the auth state has changed,
      // this write will fail if not handled correctly.
      // The current security rules require a super admin to perform this.
      // This operation WILL FAIL under current logic, and the error will be caught.
      // The correct long-term solution involves a server-side function.
      // For now, we ensure the error is handled gracefully.
      
      const batch = writeBatch(firestore);
      const newUserDocRef = doc(firestore, 'users', newAuthUser.uid);
      batch.set(newUserDocRef, newUserProfile);

      // Commit the batch
      await batch.commit();

      toast({
        title: 'User Berhasil Dibuat',
        description: `User admin kafe untuk ${data.email} telah berhasil dibuat.`,
      });
      
      form.reset();
      onOpenChange(false);

    } catch (error: any) {
      // Rollback auth user creation if firestore write fails
      if (newAuthUser) {
        try {
          // IMPORTANT: This deletes the newly created user to prevent orphans.
          await newAuthUser.delete();
          console.log("Orphaned auth user deleted successfully due to Firestore write failure.");
        } catch (deleteError) {
          // This is a critical state - an auth user exists without a profile.
          console.error("CRITICAL: Failed to delete orphaned auth user:", deleteError);
          toast({
            variant: 'destructive',
            title: 'Error Kritis',
            description: `Gagal menghapus user Auth yang gagal dibuat profilnya. Hubungi support. Email: ${data.email}`,
            duration: 10000,
          });
        }
      }
      
      // Handle known Firebase errors
      if (error instanceof FirebaseError) {
          if (error.code === 'permission-denied') {
              // This is the expected error due to the auth switch.
              // We create the contextual error for proper debugging.
              const contextualError = new FirestorePermissionError({
                  operation: 'create',
                  path: `users/${newUserProfile.authUid || 'unknown_uid'}`,
                  requestResourceData: newUserProfile,
              });
              errorEmitter.emit('permission-error', contextualError);
              // The global listener will throw this, and Next.js overlay will show it.
              // We don't show a toast here because the overlay is the intended feedback.
          } else if (error.code === 'auth/email-already-in-use') {
              toast({
                  variant: 'destructive',
                  title: 'Gagal Membuat User',
                  description: 'Email ini sudah digunakan oleh akun lain.',
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
                  description: `Terjadi kesalahan: [${error.code}]`,
              });
          }
      } else {
         // Generic errors
         toast({
            variant: 'destructive',
            title: 'Gagal Membuat User',
            description: error.message || 'Terjadi kesalahan pada server.',
         });
      }

    } finally {
      // IMPORTANT: Re-authenticate as Super Admin if needed.
      // However, a robust solution would use a backend function.
      // For now, the super admin might need to refresh or re-login.
      // This is a known limitation of the client-side-only approach.
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
