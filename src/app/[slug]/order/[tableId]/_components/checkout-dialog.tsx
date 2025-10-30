'use client';

import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Wallet, QrCode } from 'lucide-react';
import { FirebaseError } from 'firebase/app';

const checkoutSchema = z.object({
  verificationToken: z.string().min(1, { message: 'Token verifikasi harus diisi.' }),
  paymentMethod: z.enum(['qris', 'cash'], { required_error: 'Pilih metode pembayaran.' }),
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
  const [uniqueCode, setUniqueCode] = useState<number | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { 
        verificationToken: '',
        paymentMethod: 'qris',
    },
  });
  
  const paymentMethod = form.watch('paymentMethod');
  const finalTotalAmount = paymentMethod === 'qris' && uniqueCode ? totalAmount + uniqueCode : totalAmount;

  useEffect(() => {
    if (isOpen) {
      // Generate a random 3-digit number between 100 and 999
      setUniqueCode(Math.floor(Math.random() * 900) + 100);
    } else {
      setUniqueCode(null);
    }
  }, [isOpen]);

  const handleOrderSubmit = async (data: CheckoutFormValues) => {
    if (!firestore || !tenant || !table) {
        toast({ variant: 'destructive', title: 'Error', description: 'Data tidak lengkap.' });
        return;
    }

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
      totalAmount: finalTotalAmount,
      uniqueCode: data.paymentMethod === 'qris' ? uniqueCode : null,
      status: 'received' as const,
      paymentMethod: data.paymentMethod,
      paymentVerified: false,
      verificationToken: data.verificationToken,
      createdAt: serverTimestamp(),
    };

    try {
        const ordersCollectionRef = collection(firestore, `tenants/${tenant.id}/orders`);
        const newOrderRef = await addDoc(ordersCollectionRef, orderData);
        
        toast({
            title: 'Pesanan Berhasil Dibuat!',
            description: 'Anda akan diarahkan ke halaman status pesanan.',
        });

        // Redirect to status/payment page
        router.replace(`/${tenant.slug}/order/${table.id}/status/${newOrderRef.id}`);

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
            Periksa pesanan, pilih metode pembayaran, dan masukkan token dari kasir.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-48 overflow-y-auto pr-2 space-y-2 my-4">
            {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                    <p>{item.quantity}x {item.name}</p>
                    <p>{formatRupiah(item.price * item.quantity)}</p>
                </div>
            ))}
        </div>

        {paymentMethod === 'qris' && uniqueCode && (
          <>
            <div className="flex justify-between text-sm">
                <p>Subtotal</p>
                <p>{formatRupiah(totalAmount)}</p>
            </div>
             <div className="flex justify-between text-sm">
                <p>Kode Unik Pembayaran</p>
                <p>{formatRupiah(uniqueCode)}</p>
            </div>
          </>
        )}

        <div className="flex justify-between font-bold text-lg border-t pt-4">
            <p>Total</p>
            <p>{formatRupiah(finalTotalAmount)}</p>
        </div>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOrderSubmit)} className="space-y-6 mt-4">
                <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Pilih Metode Pembayaran</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-2 gap-4"
                            >
                                <FormItem>
                                    <FormControl>
                                        <RadioGroupItem value="qris" id="qris" className="sr-only" />
                                    </FormControl>
                                    <FormLabel htmlFor="qris" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                        <QrCode className="mb-3 h-6 w-6" />
                                        QRIS
                                    </FormLabel>
                                </FormItem>
                                <FormItem>
                                     <FormControl>
                                        <RadioGroupItem value="cash" id="cash" className="sr-only" />
                                    </FormControl>
                                    <FormLabel htmlFor="cash" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                        <Wallet className="mb-3 h-6 w-6" />
                                        Tunai (Kasir)
                                    </FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

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
                        'Konfirmasi Pesanan'
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
