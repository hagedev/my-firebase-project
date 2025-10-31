'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Tenant, Table as TableType, Order } from '@/lib/types';
import { Loader2, CheckCircle, Clock, Wallet, Utensils, ChefHat, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { formatRupiah, convertGoogleImageUrl } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


const statusConfig = {
    received: { text: "Diterima", icon: <CheckCircle className="text-green-500" />, color: "bg-green-100 text-green-800", description: "Pesanan Anda telah kami terima dan akan segera diproses." },
    preparing: { text: "Sedang Disiapkan", icon: <ChefHat className="text-blue-500" />, color: "bg-blue-100 text-blue-800", description: "Koki kami sedang menyiapkan pesanan Anda dengan penuh cinta." },
    ready: { text: "Siap Diambil", icon: <Utensils className="text-yellow-500" />, color: "bg-yellow-100 text-yellow-800", description: "Pesanan Anda sudah siap! Silakan ambil di konter." },
    delivered: { text: "Selesai", icon: <CheckCircle className="text-gray-500" />, color: "bg-gray-100 text-gray-800", description: "Terima kasih! Selamat menikmati pesanan Anda." },
    cancelled: { text: "Dibatalkan", icon: <XCircle className="text-red-500" />, color: "bg-red-100 text-red-800", description: "Pesanan Anda telah dibatalkan." },
};


export default function OrderStatusPage() {
    const params = useParams();
    const { slug, tableId, orderId } = params as { slug: string; tableId: string; orderId: string };

    const firestore = useFirestore();

    const [tenant, setTenant] = useState<Tenant | null>(null);

    // This is a more robust way to get tenant by slug
    useEffect(() => {
        if (!firestore) return;
        const getTenantBySlug = async () => {
            const tenantsRef = collection(firestore, "tenants");
            const q = query(tenantsRef, where("slug", "==", slug));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const tenantDoc = querySnapshot.docs[0];
                setTenant({ id: tenantDoc.id, ...tenantDoc.data() } as Tenant);
            }
        };
        getTenantBySlug();
    }, [firestore, slug]);


    const orderRef = useMemoFirebase(
        () => (firestore && tenant ? doc(firestore, `tenants/${tenant.id}/orders/${orderId}`) : null),
        [firestore, tenant, orderId]
    );
    const { data: order, isLoading: isOrderLoading } = useDoc<Order>(orderRef);

    const isLoading = !tenant || isOrderLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!order || !tenant) {
        return (
             <AlertDialog open={true}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive text-center">Pesanan Tidak Ditemukan</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Maaf, kami tidak dapat menemukan detail untuk pesanan ini. Pastikan URL sudah benar atau hubungi staf kami.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>
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
                    <h3 className="font-semibold text-center mb-2 text-lg">Lakukan Pembayaran</h3>
                    <p className="text-center text-xs text-muted-foreground mb-4">
                        Pindai kode QRIS di bawah ini dengan aplikasi perbankan atau e-wallet Anda.
                    </p>
                    {tenant.qrisImageUrl ? (
                        <div className="relative aspect-square w-full max-w-xs mx-auto border-4 border-primary rounded-lg overflow-hidden shadow-lg">
                            <Image 
                                src={convertGoogleImageUrl(tenant.qrisImageUrl)} 
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
                    <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-center p-3 rounded-md">
                        <p className="font-bold">Total Transfer: {formatRupiah(order.totalAmount)}</p>
                        <p className="text-xs">Pastikan jumlah yang Anda transfer sudah sesuai (termasuk kode unik jika ada) agar pesanan dapat diproses otomatis.</p>
                    </div>
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
                        Silakan lakukan pembayaran tunai sebesar <span className="font-bold">{formatRupiah(order.totalAmount)}</span> di kasir dan tunjukkan halaman ini.
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
                     {tenant.logoUrl && (
                        <Image 
                            src={convertGoogleImageUrl(tenant.logoUrl)} 
                            alt="Logo" 
                            width={64}
                            height={64}
                            className="mx-auto rounded-full border p-1"
                        />
                    )}
                    <h1 className="font-headline text-3xl font-bold text-primary mt-2">{tenant.name}</h1>
                    <CardDescription>Terima kasih atas pesanan Anda!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Status Pesanan</p>
                         <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold ${currentStatus.color}`}>
                           {currentStatus.icon}
                           <span>{currentStatus.text}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{currentStatus.description}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Ringkasan Pesanan</h3>
                        <div className="space-y-2 text-sm border rounded-md p-3">
                            {order.orderItems.map(item => (
                                <div key={item.id} className="flex justify-between">
                                    <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                                    <span>{formatRupiah(item.price * item.quantity)}</span>
                                </div>
                            ))}
                             <Separator className="my-2"/>
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
