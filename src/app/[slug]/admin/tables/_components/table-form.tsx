'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2, Save } from 'lucide-react';
import type { Table } from '@/lib/types';

// Schema for form validation
const tableFormSchema = z.object({
  tableNumber: z.coerce.number().min(1, { message: 'Nomor meja harus lebih dari 0.' }),
});

type TableFormValues = z.infer<typeof tableFormSchema>;

interface TableFormProps {
  initialData?: Omit<Table, 'status' | 'tenantId'>;
  onSubmit: (values: TableFormValues) => Promise<boolean>;
  onSubmissionSuccess?: () => void;
}

export function TableForm({
  initialData,
  onSubmit,
  onSubmissionSuccess,
}: TableFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: initialData
      ? { ...initialData }
      : { tableNumber: undefined },
  });

  const handleFormSubmit = async (values: TableFormValues) => {
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
          name="tableNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nomor Meja</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Contoh: 12" {...field} />
              </FormControl>
              <FormMessage />
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
                Simpan Meja
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
