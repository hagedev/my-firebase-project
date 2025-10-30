'use client';

import { useParams } from 'next/navigation';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

// Halaman ini telah di-reset ke kondisi awal tanpa logika apa pun
// untuk mengatasi masalah infinite loop.

export default function OrderPage() {
  const params = useParams();
  const slug = params.slug as string;
  const tableId = params.tableId as string;

  // Tampilkan UI statis tanpa pengambilan data
  return (
    <div className="min-h-screen bg-background font-body pb-28">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">
                Nama Kafe
            </h1>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Anda berada di</p>
            <p className="font-bold text-lg text-primary">Meja #{tableId}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="text-center py-16">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Memuat menu...</p>
        </div>
      </main>

       {/* Tombol keranjang statis */}
       <Button 
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-30" 
            size="icon"
            disabled
        >
            <ShoppingCart className="h-7 w-7" />
            <span className="sr-only">Buka Keranjang</span>
        </Button>
    </div>
  );
}
