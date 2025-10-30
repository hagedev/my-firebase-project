'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatRupiah } from '@/lib/utils';
import type { CartItem, Tenant, Table as TableType } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';

const checkoutSchema = z.object({
  verificationToken: z.string().min(1, { message: 'Token verifikasi harus diisi.' }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cart: CartItem[];
  totalAmount: number;
  tenant: Tenant;
  table: TableType;
}

export function CheckoutDialog({
  isOpen,
  onOpenChange,
  cart,
  totalAmount,
  tenant,
  table,
}: CheckoutDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { verificationToken: '' },
  });

  const handleOrderSubmit = async (data: CheckoutFormValues) => {
    if (!firestore || !tenant || !table) {
        toast({ variant: 'destructive', title: 'Error', description: 'Data tidak lengkap.' });
        return;
    }

    // Basic client-side token check
    if (data.verificationToken !== tenant.tokenHarian) {
        form.setError('verificationToken', {
            type: 'manual',
            message: 'Token verifikasi tidak valid. Minta pada kasir.',
        });
        return;
    }
    
    setIsSubmitting(true);

    const orderData = {
      tenantId: tenant.id,
      tableId: table.id,
      tableNumber: table.tableNumber,
      orderItems: cart.map(item => ({ 
          id: item.id, 
          name: item.name, 
          price: item.price, 
          quantity: item.quantity 
      })),
      totalAmount: totalAmount,
      status: 'received' as const,
      paymentMethod: 'qris' as const,
      paymentVerified: false,
      verificationToken: data.verificationToken,
      createdAt: serverTimestamp(),
    };

    try {
        const ordersCollectionRef = collection(firestore, `tenants/${tenant.id}/orders`);
        const newOrderRef = await addDoc(ordersCollectionRef, orderData);
        
        toast({
            title: 'Pesanan Berhasil Dibuat!',
            description: 'Anda akan diarahkan ke halaman pembayaran.',
        });

        // Redirect to status/payment page
        router.push(`/${tenant.slug}/order/${table.id}/status/${newOrderRef.id}`);

    } catch (error: any) {
        console.error('Order submission error:', error);
         if (error instanceof FirebaseError && error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
                operation: 'create',
                path: `tenants/${tenant.id}/orders`,
                requestResourceData: orderData,
            });
            errorEmitter.emit('permission-error', contextualError);
        } else {
             toast({
                variant: 'destructive',
                title: 'Gagal Membuat Pesanan',
                description: error.message || 'Terjadi kesalahan pada server.',
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Pesanan Anda</DialogTitle>
          <DialogDescription>
            Periksa kembali pesanan Anda. Masukkan token verifikasi dari kasir untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-60 overflow-y-auto pr-2 space-y-2 my-4">
            {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                    <p>{item.quantity}x {item.name}</p>
                    <p>{formatRupiah(item.price * item.quantity)}</p>
                </div>
            ))}
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-4">
            <p>Total</p>
            <p>{formatRupiah(totalAmount)}</p>
        </div>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOrderSubmit)} className="space-y-4 mt-4">
                <FormField
                    control={form.control}
                    name="verificationToken"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Token Harian</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="Minta token pada kasir" 
                                    {...field}
                                    className="text-center font-bold tracking-widest"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Mengirim Pesanan...
                        </>
                        ) : (
                        'Konfirmasi & Bayar dengan QRIS'
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
