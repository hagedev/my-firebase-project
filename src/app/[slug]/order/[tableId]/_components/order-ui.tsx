'use client';

import { useState } from 'react';
import type { Tenant, Table, Menu, CartItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { formatRupiah, getValidImageUrl } from '@/lib/utils';
import { PlusCircle, MinusCircle, ShoppingCart, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckoutDialog } from './checkout-dialog';

interface OrderUIProps {
  tenant: Tenant;
  table: Table;
  menuItems: Menu[];
}

export function OrderUI({ tenant, table, menuItems }: OrderUIProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const addToCart = (item: Menu) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((cartItem) =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prevCart.filter((cartItem) => cartItem.id !== itemId);
    });
  };
  
  const clearItemFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };
  
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const groupedMenu = menuItems.reduce((acc, item) => {
    const category = item.category || 'Lainnya';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, Menu[]>);

  const validLogoUrl = getValidImageUrl(tenant.logoUrl);

  return (
    <div className="relative min-h-screen w-full bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
            <div>
                <h1 className="font-headline text-2xl font-bold text-primary">{tenant.name}</h1>
                <p className="text-muted-foreground">Meja No. {table.tableNumber}</p>
            </div>
            {validLogoUrl && (
                <div className="relative h-12 w-12 rounded-full overflow-hidden border">
                    <Image src={validLogoUrl} alt="Logo" layout="fill" objectFit="cover" />
                </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 pb-32">
        {Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category} className="mb-8">
                <h2 className="font-headline text-2xl font-semibold mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => {
                      const validMenuImageUrl = getValidImageUrl(item.imageUrl);
                      return (
                        <Card key={item.id} className="overflow-hidden flex flex-col">
                            {validMenuImageUrl ? (
                                <div className="relative h-48 w-full">
                                    <Image src={validMenuImageUrl} alt={item.name} layout="fill" objectFit="cover" />
                                </div>
                            ) : (
                                <div className="h-48 w-full bg-muted flex items-center justify-center">
                                    <p className="text-muted-foreground text-sm">Gambar tidak tersedia</p>
                                </div>
                            )}
                            <CardContent className="p-4 flex-1 flex flex-col justify-between">
                               <div>
                                    <h3 className="font-semibold text-lg">{item.name}</h3>
                                    <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                               </div>
                               <div className="flex justify-between items-center mt-4">
                                 <p className="font-bold text-lg text-primary">{formatRupiah(item.price)}</p>
                                 <Button onClick={() => addToCart(item)} size="sm">
                                     Pesan
                                 </Button>
                               </div>
                            </CardContent>
                        </Card>
                      )
                    })}
                </div>
            </div>
        ))}
      </main>

      {/* Cart Footer */}
      {cart.length > 0 && (
          <footer className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t shadow-lg">
              <div className="container mx-auto p-4">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="font-bold text-lg">{totalItems} item di keranjang</p>
                          <p className="text-primary font-semibold">{formatRupiah(totalAmount)}</p>
                      </div>
                      <Button size="lg" onClick={() => setIsCheckoutOpen(true)}>
                          <ShoppingCart className="mr-2" />
                          Checkout
                      </Button>
                  </div>
              </div>
          </footer>
      )}

      {/* Checkout Dialog */}
      <CheckoutDialog 
        isOpen={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        cart={cart}
        totalAmount={totalAmount}
        tenant={tenant}
        table={table}
      />
    </div>
  );
}
