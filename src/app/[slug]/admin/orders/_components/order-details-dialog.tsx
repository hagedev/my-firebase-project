'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: Order | null;
}

export function OrderDetailsDialog({ isOpen, onOpenChange, order }: OrderDetailsDialogProps) {
  if (!order) return null;

  const orderTime = order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPP p', { locale: idLocale }) : 'Waktu tidak tersedia';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Pesanan #{order.id.substring(0, 6)}</DialogTitle>
          <DialogDescription>
            Untuk Meja {order.tableNumber} pada {orderTime}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="max-h-[300px] overflow-y-auto pr-4">
            <h4 className="font-semibold mb-2">Item Pesanan:</h4>
            <div className="space-y-3">
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      {item.quantity} x {formatRupiah(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold ml-4">{formatRupiah(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            {order.uniqueCode && (
              <div className="flex justify-between text-sm">
                <p>Subtotal</p>
                <p>{formatRupiah(order.totalAmount - order.uniqueCode)}</p>
              </div>
            )}
            {order.uniqueCode && (
                 <div className="flex justify-between text-sm">
                    <p>Kode Unik</p>
                    <p>{formatRupiah(order.uniqueCode)}</p>
                </div>
            )}
            <div className="flex justify-between font-bold text-base">
              <p>Total</p>
              <p>{formatRupiah(order.totalAmount)}</p>
            </div>
             <Separator />
             <div className="flex justify-between items-center text-sm pt-2">
                <p className="text-muted-foreground">Metode Pembayaran</p>
                <Badge variant="outline">{(order.paymentMethod || 'N/A').toUpperCase()}</Badge>
            </div>
             <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">Status Pembayaran</p>
                <Badge variant={order.paymentVerified ? 'secondary' : 'destructive'}>{order.paymentVerified ? 'Lunas' : 'Belum Lunas'}</Badge>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
