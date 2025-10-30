'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType, CartItem } from '@/lib/types';

import { Loader2, ShoppingCart, Trash2, MinusCircle, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { formatRupiah } from '@/lib/utils';
import { CheckoutDialog } from './_components/checkout-dialog';

export default function OrderPage() {
  const params = useParams();
  const slug = params.slug as string;
  const tableId = params.tableId as string;

  const firestore = useFirestore();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);

  // --- Data Fetching ---
  const tenantQuery = useMemoFirebase(
      () => (firestore && slug ? collection(firestore, 'tenants') : null),
      [firestore, slug]
  );
  
  // This is not efficient, but for a small number of tenants it's okay.
  // A better approach would be a direct query on a slug field if we had one indexed.
  const { data: tenants, isLoading: isTenantsLoading } = useCollection<Tenant>(tenantQuery);

  useEffect(() => {
    if (tenants) {
      const currentTenant = tenants.find(t => t.slug === slug);
      setTenant(currentTenant || null);
    }
  }, [tenants, slug]);

  const tableRef = useMemoFirebase(
    () => (firestore && tenant ? doc(firestore, `tenants/${tenant.id}/tables/${tableId}`) : null),
    [firestore, tenant, tableId]
  );
  const { data: table, isLoading: isTableLoading } = useDoc<TableType>(tableRef);

  const menuRef = useMemoFirebase(
    () => (firestore && tenant ? collection(firestore, `tenants/${tenant.id}/menus`) : null),
    [firestore, tenant]
  );
  const { data: menuItems, isLoading: isMenuLoading } = useCollection<MenuType>(menuRef);

  // --- Cart Logic ---
  const addToCart = (item: MenuType) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
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
          cartItem.id === itemId ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem
        );
      }
      return prevCart.filter((cartItem) => cartItem.id !== itemId);
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);


  const groupedMenu = useMemo(() => {
    if (!menuItems) return {};
    return menuItems.reduce((acc, item) => {
        if (item.available) { // Only include available items
            (acc[item.category] = acc[item.category] || []).push(item);
        }
        return acc;
    }, {} as Record<string, MenuType[]>);
  }, [menuItems]);

  const isLoading = isTenantsLoading || isTableLoading || isMenuLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant || !table) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">
          Kafe atau Meja tidak ditemukan.
          <br />
          Pastikan URL Anda benar.
        </h1>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                {tenant.logoUrl && (
                     <Image src={tenant.logoUrl} alt={`${tenant.name} logo`} width={40} height={40} className="rounded-full object-cover"/>
                )}
                <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">
                    {tenant.name}
                </h1>
            </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Anda berada di</p>
            <p className="font-bold text-lg text-primary">Meja {table.tableNumber}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Menu Section */}
          <div className="lg:col-span-2 space-y-8">
            {Object.keys(groupedMenu).length > 0 ? Object.entries(groupedMenu).map(([category, items]) => (
              <div key={category}>
                <h2 className="font-headline text-2xl font-bold mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <Card key={item.id} className="flex flex-col">
                        {item.imageUrl && (
                            <div className="relative w-full h-40">
                                <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" className="rounded-t-lg"/>
                            </div>
                        )}
                      <CardHeader>
                        <CardTitle>{item.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center">
                        <p className="font-bold text-primary">{formatRupiah(item.price)}</p>
                        <Button onClick={() => addToCart(item)} size="sm">
                          <PlusCircle className="mr-2 h-4 w-4" /> Tambah
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )) : (
                 <div className="text-center py-16">
                    <p className="text-muted-foreground">Belum ada menu yang tersedia saat ini.</p>
                </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart />
                    Keranjang Anda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length > 0 ? (
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{formatRupiah(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.id)}>
                               <MinusCircle className="h-4 w-4" />
                            </Button>
                            <span className="font-bold w-4 text-center">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => addToCart(item)}>
                               <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Keranjang masih kosong.</p>
                  )}
                </CardContent>
                {cart.length > 0 && (
                  <>
                    <Separator />
                    <CardFooter className="flex-col items-stretch gap-4 pt-6">
                        <div className="flex justify-between font-bold text-lg">
                            <p>Total</p>
                            <p>{formatRupiah(totalAmount)}</p>
                        </div>
                      <Button onClick={() => setCheckoutOpen(true)} className="w-full" disabled={cart.length === 0}>
                        Pesan Sekarang ({totalItems} item)
                      </Button>
                      <Button onClick={clearCart} className="w-full" variant="outline">
                        <Trash2 className="mr-2 h-4 w-4" /> Kosongkan Keranjang
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
    <CheckoutDialog 
        isOpen={isCheckoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        totalAmount={totalAmount}
        tenant={tenant}
        table={table}
    />
    </>
  );
}
