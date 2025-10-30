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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { nanoid } from 'nanoid';


const addCafeSchema = z.object({
  name: z.string().min(3, { message: 'Nama kafe minimal 3 karakter.' }),
});

type AddCafeFormValues = z.infer<typeof addCafeSchema>;

interface AddCafeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Function to generate a URL-friendly slug
const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes
};

export function AddCafeDialog({ isOpen, onOpenChange }: AddCafeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<AddCafeFormValues>({
    resolver: zodResolver(addCafeSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: AddCafeFormValues) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore tidak terinisialisasi.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const slug = createSlug(data.name);
      const tokenHarian = nanoid(6).toUpperCase();

      const tenantsCollection = collection(firestore, 'tenants');
      
      await addDoc(tenantsCollection, {
        name: data.name,
        slug: slug,
        tokenHarian: tokenHarian,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Kafe Berhasil Ditambahkan',
        description: `Kafe "${data.name}" telah berhasil dibuat.`,
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding document: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menambahkan Kafe',
        description: error.message || 'Terjadi kesalahan pada server.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Kafe Baru</DialogTitle>
          <DialogDescription>
            Masukkan nama kafe baru. Slug dan Token Harian akan dibuat secara otomatis.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kafe</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Kopi Senja" {...field} disabled={isSubmitting} />
                  </FormControl>
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
                  'Simpan Kafe'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
