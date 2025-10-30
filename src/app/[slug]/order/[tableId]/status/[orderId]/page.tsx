'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Tenant, Table as TableType, Order } from '@/lib/types';
import { Loader2, CheckCircle, Clock, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { formatRupiah, convertGoogleDriveUrl } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const statusConfig = {
    received: { text: "Diterima", icon: <CheckCircle className="text-green-500" />, color: "bg-green-100 text-green-800" },
    preparing: { text: "Sedang Disiapkan", icon: <Clock className="text-blue-500" />, color: "bg-blue-100 text-blue-800" },
    ready: { text: "Siap Diambil", icon: <CheckCircle className="text-yellow-500" />, color: "bg-yellow-100 text-yellow-800" },
    delivered: { text: "Selesai", icon: <CheckCircle className="text-gray-500" />, color: "bg-gray-100 text-gray-800" },
    cancelled: { text: "Dibatalkan", icon: <CheckCircle className="text-red-500" />, color: "bg-red-100 text-red-800" },
};


export default function OrderStatusPage() {
    const params = useParams();
    const { slug, tableId, orderId } = params as { slug: string; tableId: string; orderId: string };

    const firestore = useFirestore();

    // Fetch tenant, table, and order data
    const tenantRef = useMemoFirebase(() => firestore ? doc(firestore, `tenants/${slug}`) : null, [firestore, slug]);
    const { data: tenantData, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);
    
    // In a real app with many tenants, you'd query by slug. For now we fetch one document by its slug-derived ID.
    // This assumes the tenant ID is the same as the slug, which is the case for our initial setup.
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const tenantDocRef = useMemoFirebase(
        () => firestore && slug ? doc(firestore, 'tenants', slug) : null,
        [firestore, slug]
    );

    const orderRef = useMemoFirebase(
        () => (firestore && tenantData?.id ? doc(firestore, `tenants/${tenantData.id}/orders/${orderId}`) : null),
        [firestore, tenantData, orderId]
    );
    const { data: order, isLoading: isOrderLoading } = useDoc<Order>(orderRef);

    useEffect(() => {
        if(tenantData) {
            // A limitation of our current setup: we assume the slug is the tenant ID.
            // This is incorrect. We need to query tenants by slug.
            // For now, we'll just set it directly.
             setTenant(tenantData)
        }
    }, [tenantData])

    const isLoading = isTenantLoading || isOrderLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!order || !tenantData) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-center">
                <h1 className="text-2xl font-bold text-destructive">
                    Pesanan atau Kafe tidak ditemukan.
                </h1>
            </div>
        );
    }
    
    const currentStatus = statusConfig[order.status] || statusConfig.received;

    const PaymentInstructions = () => {
        if (order.paymentVerified) {
            return (
                <div className="text-center p-4 rounded-lg bg-green-50 border-l-4 border-green-500">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2"/>
                    <h3 className="font-semibold text-green-800">Pembayaran Lunas</h3>
                    <p className="text-sm text-green-700">Terima kasih! Pesanan Anda sedang kami siapkan.</p>
                </div>
            )
        }

        if (order.paymentMethod === 'qris') {
            return (
                <div>
                    <h3 className="font-semibold text-center mb-2">Silakan Lakukan Pembayaran</h3>
                    <p className="text-center text-xs text-muted-foreground mb-4">
                        Pindai kode QRIS di bawah ini dengan aplikasi perbankan atau e-wallet Anda.
                    </p>
                    {tenantData.qrisImageUrl ? (
                        <div className="relative aspect-square w-full max-w-xs mx-auto border-4 border-primary rounded-lg overflow-hidden">
                            <Image 
                                src={convertGoogleDriveUrl(tenantData.qrisImageUrl)} 
                                alt="QRIS Payment Code" 
                                layout="fill" 
                                objectFit="contain" 
                            />
                        </div>
                    ) : (
                        <div className="text-center p-4 bg-destructive/10 rounded-lg">
                            <p className="font-semibold text-destructive">Gambar QRIS tidak tersedia.</p>
                            <p className="text-sm text-destructive-foreground">Silakan bayar di kasir.</p>
                        </div>
                    )}
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        Tunjukkan halaman ini ke kasir jika pembayaran sudah berhasil.
                    </p>
                </div>
            )
        }

        if (order.paymentMethod === 'cash') {
            return (
                 <div className="text-center p-6 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                    <Wallet className="mx-auto h-12 w-12 text-blue-500 mb-2"/>
                    <h3 className="font-semibold text-blue-800">Pembayaran di Kasir</h3>
                    <p className="text-sm text-blue-700">
                        Silakan lakukan pembayaran tunai di kasir dan tunjukkan halaman ini.
                    </p>
                </div>
            )
        }
        
        return null;
    }


    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md mx-auto shadow-2xl">
                <CardHeader className="text-center">
                    <h1 className="font-headline text-3xl font-bold text-primary">{tenantData.name}</h1>
                    <CardDescription>Terima kasih atas pesanan Anda!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Status Pesanan</p>
                         <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${currentStatus.color}`}>
                           {currentStatus.icon}
                           <span>{currentStatus.text}</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Ringkasan Pesanan</h3>
                        <div className="space-y-2 text-sm">
                            {order.orderItems.map(item => (
                                <div key={item.id} className="flex justify-between">
                                    <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                                    <span>{formatRupiah(item.price * item.quantity)}</span>
                                </div>
                            ))}
                             <Separator />
                            <div className="flex justify-between font-bold text-base">
                                <span>Total</span>
                                <span>{formatRupiah(order.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <PaymentInstructions />

                </CardContent>
            </Card>
        </div>
    );
}
