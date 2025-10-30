'use client';

import { useState, useEffect } from 'react';
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
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { User as AppUser, Tenant } from '@/lib/types';
import { FirebaseError } from 'firebase/app';

const editUserSchema = z.object({
  tenantId: z.string().min(1, { message: 'Silakan pilih kafe.' }),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: AppUser;
  tenants: Tenant[];
}

export function EditUserDialog({ isOpen, onOpenChange, user, tenants }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      tenantId: user?.tenantId || '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({ tenantId: user.tenantId });
    }
  }, [user, form]);

  const onSubmit = async (data: EditUserFormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Data tidak lengkap untuk memperbarui user.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const selectedTenant = tenants.find(t => t.id === data.tenantId);
       if (!selectedTenant) {
        throw new Error("Tenant tidak ditemukan.");
      }

      const userDocRef = doc(firestore, 'users', user.id);
      const updatedData = {
        tenantId: data.tenantId,
        tenantName: selectedTenant.name, // Update denormalized name
      };
      
      await updateDoc(userDocRef, updatedData);

      toast({
        title: 'User Berhasil Diperbarui',
        description: `User ${user.email} telah diperbarui.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        const contextualError = new FirestorePermissionError({
            operation: 'update',
            path: `users/${user.id}`,
            requestResourceData: {
                tenantId: data.tenantId,
                tenantName: tenants.find(t => t.id === data.tenantId)?.name,
            }
        });
        errorEmitter.emit('permission-error', contextualError);
      } else {
         toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui User',
            description: error.message || 'Terjadi kesalahan pada server.',
         });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Admin Kafe</DialogTitle>
          <DialogDescription>
            Ubah kafe yang dikelola oleh user ini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input value={user?.email || ''} disabled readOnly />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kafe yang Dikelola</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
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
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
