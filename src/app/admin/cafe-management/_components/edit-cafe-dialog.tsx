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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Tenant } from '@/lib/types';

const editCafeSchema = z.object({
  name: z.string().min(3, { message: 'Nama kafe minimal 3 karakter.' }),
});

type EditCafeFormValues = z.infer<typeof editCafeSchema>;

interface EditCafeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cafe: Tenant;
}

// Function to generate a URL-friendly slug
const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes
};

export function EditCafeDialog({ isOpen, onOpenChange, cafe }: EditCafeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<EditCafeFormValues>({
    resolver: zodResolver(editCafeSchema),
    defaultValues: {
      name: cafe?.name || '',
    },
  });

  useEffect(() => {
    // Reset form with new cafe data when the prop changes
    if (cafe) {
      form.reset({ name: cafe.name });
    }
  }, [cafe, form]);

  const onSubmit = async (data: EditCafeFormValues) => {
    if (!firestore || !cafe) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore tidak terinisialisasi atau data kafe tidak ditemukan.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const slug = createSlug(data.name);
      const cafeDocRef = doc(firestore, 'tenants', cafe.id);

      await updateDoc(cafeDocRef, {
        name: data.name,
        slug: slug,
      });

      toast({
        title: 'Kafe Berhasil Diperbarui',
        description: `Nama kafe telah diubah menjadi "${data.name}".`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating document: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui Kafe',
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
          <DialogTitle>Edit Kafe</DialogTitle>
          <DialogDescription>
            Ubah nama kafe. Slug akan diperbarui secara otomatis.
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
