'use client';

import { useState } from 'react';
import type { Tenant, Table, Menu, CartItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

  const validLogoUrl = tenant.logoUrl || '';

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
                    <Image src={validLogoUrl} alt="Logo" layout="fill" objectFit="cover" unoptimized />
                </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 pb-36">
        <Accordion type="multiple" defaultValue={Object.keys(groupedMenu)} className="w-full">
            {Object.entries(groupedMenu).map(([category, items]) => (
                <AccordionItem value={category} key={category} className="mb-4 border-b-0 rounded-lg bg-background shadow-sm">
                    <AccordionTrigger className="px-4 md:px-6 py-4 font-headline text-xl text-left">
                        {category}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 md:px-6 pb-4">
                        <div className="flex flex-col divide-y">
                            {items.map((item) => (
                               <div key={item.id} className="flex items-start md:items-center justify-between py-3 gap-2">
                                   <div className="flex-1 pr-4">
                                       <h4 className="font-semibold">{item.name}</h4>
                                       {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                                       <p className="font-semibold text-primary mt-1">{formatRupiah(item.price)}</p>
                                   </div>
                                   <Button onClick={() => addToCart(item)} size="sm" className="shrink-0">
                                     Pesan
                                   </Button>
                               </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </main>

      {/* Cart Footer */}
      {cart.length > 0 && (
          <footer className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t shadow-lg">
              <div className="container mx-auto p-4">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="font-bold text-base md:text-lg">{totalItems} item di keranjang</p>
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
