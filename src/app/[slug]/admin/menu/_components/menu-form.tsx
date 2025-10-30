'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import type { Category, Menu } from '@/lib/types';

// Schema for form validation
const menuFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama menu minimal 3 karakter.' }),
  price: z.coerce.number().min(0, { message: 'Harga tidak boleh negatif.' }),
  categoryId: z.string().min(1, { message: 'Silakan pilih kategori.' }),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: 'URL gambar tidak valid.' }).or(z.literal('')),
  available: z.boolean(),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

interface MenuFormProps {
  initialData?: Menu;
  categories: Category[];
  onSubmit: (values: MenuFormValues) => Promise<boolean>;
  onSubmissionSuccess?: () => void; // Optional: Callback for after successful submission
}

export function MenuForm({
  initialData,
  categories,
  onSubmit,
  onSubmissionSuccess,
}: MenuFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          imageUrl: initialData.imageUrl || '',
        }
      : {
          name: '',
          price: 0,
          categoryId: '',
          description: '',
          imageUrl: '',
          available: true,
        },
  });

  const handleFormSubmit = async (values: MenuFormValues) => {
    setIsSubmitting(true);
    const success = await onSubmit(values);
    setIsSubmitting(false);
    if (success && onSubmissionSuccess) {
      form.reset();
      onSubmissionSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Menu</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: Kopi Susu Gula Aren" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Harga</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="25000" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Kategori</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori menu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Tidak ada kategori.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi (Opsional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Kopi susu dengan rasa manis dari gula aren asli..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Gambar (Opsional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/gambar.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="available"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Tersedia</FormLabel>
                <FormDescription>
                  Nonaktifkan jika item ini sedang tidak tersedia atau habis.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Menu
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
