'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { doc, collection, getDocs, getDoc, query, where } from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType, CartItem } from '@/lib/types';
import { signInAnonymously } from 'firebase/auth';

import { Loader2, ShoppingCart, Trash2, MinusCircle, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { formatRupiah, convertGoogleDriveUrl } from '@/lib/utils';
import { CheckoutDialog } from './_components/checkout-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function OrderPage() {
  const params = useParams();
  const slug = params.slug as string;
  const tableId = params.tableId as string;

  const { auth, user, isUserLoading: isAuthLoading } = useAuth();
  const firestore = useFirestore();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [menuItems, setMenuItems] = useState<MenuType[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Step 1: Anonymous Authentication ---
  // This effect's ONLY job is to ensure the user is signed in.
  useEffect(() => {
    // Wait until Firebase Auth is initialized.
    if (!auth || isAuthLoading) {
      return;
    }
    // If there is no active user, sign in anonymously.
    if (!user) {
      signInAnonymously(auth).catch((authError) => {
        console.error("Anonymous sign-in error:", authError);
        setError("Gagal mendapatkan sesi. Silakan refresh halaman.");
      });
    }
  }, [auth, isAuthLoading, user]);


  // --- Step 2: Data Fetching ---
  // This effect runs ONLY AFTER the user is authenticated (user object is available).
  useEffect(() => {
    // Do not proceed if services aren't ready or if there's no authenticated user.
    if (!firestore || !user) {
      return;
    }

    const fetchInitialData = async () => {
      setDataLoading(true);
      setError(null);
      try {
        // Find the tenant using the URL slug.
        const tenantsRef = collection(firestore, 'tenants');
        const q = query(tenantsRef, where("slug", "==", slug));
        const tenantSnapshot = await getDocs(q);

        if (tenantSnapshot.empty) {
          throw new Error("Kafe tidak ditemukan. Pastikan URL Anda benar.");
        }
        
        const foundTenantDoc = tenantSnapshot.docs[0];
        const tenantData = { id: foundTenantDoc.id, ...foundTenantDoc.data() } as Tenant;
        const tenantId = tenantData.id;

        // Get the table and menu data directly using the tenantId.
        const tableDocRef = doc(firestore, `tenants/${tenantId}/tables/${tableId}`);
        const menuCollectionRef = collection(firestore, `tenants/${tenantId}/menus`);

        const [tableDocSnap, menuSnapshot] = await Promise.all([
          getDoc(tableDocRef),
          getDocs(menuCollectionRef)
        ]);

        if (!tableDocSnap.exists()) {
          throw new Error("Meja tidak ditemukan. Silakan pindai ulang QR Code.");
        }
        
        const tableData = { id: tableDocSnap.id, ...tableDocSnap.data() } as TableType;
        const menuData = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuType));

        // Batch state updates
        setTenant(tenantData);
        setTable(tableData);
        setMenuItems(menuData);

      } catch (e: any) {
        console.error("Initial data fetch error:", e);
        setError(e.message || "Gagal memuat data kafe.");
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchInitialData();
  
  }, [firestore, user, slug, tableId]); // Depends on `user` to ensure auth is complete.


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
    return menuItems.reduce((acc, item) => {
        if (item.available) { 
            (acc[item.category] = acc[item.category] || []).push(item);
        }
        return acc;
    }, {} as Record<string, MenuType[]>);
  }, [menuItems]);
  
  const handleCheckout = () => {
    setIsCartSheetOpen(false);
    setCheckoutOpen(true);
  }

  const isLoading = isAuthLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-center">
        <Card className="max-w-md w-full border-destructive">
            <CardHeader><CardTitle className="text-destructive text-center">Terjadi Kesalahan</CardTitle></CardHeader>
            <CardContent>
              <p className="text-center text-destructive">{error}</p>
            </CardContent>
          </Card>
      </div>
    );
  }

   if (!tenant || !table) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">
          Gagal memuat data kafe atau meja.
        </h1>
      </div>
    );
  }
  
  const CartContent = () => (
    <>
      <div className="flex-grow overflow-y-auto pr-2">
      {cart.length > 0 ? (
        <div className="space-y-4">
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
      </div>
       {cart.length > 0 && (
        <div className="flex-shrink-0 pt-4 space-y-4">
          <Separator />
          <div className="flex justify-between font-bold text-lg">
              <p>Total</p>
              <p>{formatRupiah(totalAmount)}</p>
          </div>
          <Button onClick={handleCheckout} className="w-full" disabled={cart.length === 0}>
              Pesan Sekarang ({totalItems} item)
          </Button>
          <Button onClick={clearCart} className="w-full" variant="outline">
              <Trash2 className="mr-2 h-4 w-4" /> Kosongkan Keranjang
          </Button>
        </div>
      )}
    </>
  );

  return (
    <>
    <div className="min-h-screen bg-background font-body pb-28">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                {tenant.logoUrl && (
                     <Image src={convertGoogleDriveUrl(tenant.logoUrl)} alt={`${tenant.name} logo`} width={40} height={40} className="rounded-full object-cover"/>
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
        <div className="space-y-8">
          {Object.keys(groupedMenu).length > 0 ? Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category}>
              <h2 className="font-headline text-2xl font-bold mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                      {item.imageUrl && (
                          <div className="relative w-full h-40">
                              <Image src={convertGoogleDriveUrl(item.imageUrl)} alt={item.name} fill objectFit="cover" className="rounded-t-lg"/>
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
      </main>

      {/* Mobile Floating Cart Button & Sheet */}
        <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
            <SheetTrigger asChild>
                <Button 
                    className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-30" 
                    size="icon"
                    disabled={cart.length === 0}
                >
                    <ShoppingCart className="h-7 w-7" />
                    <span className="sr-only">Buka Keranjang</span>
                    {totalItems > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full">
                            {totalItems}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-4/5 flex flex-col">
                <SheetHeader>
                    <SheetTitle>Keranjang Anda</SheetTitle>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto py-4 flex flex-col">
                   <CartContent />
                </div>
            </SheetContent>
        </Sheet>
    </div>
    {tenant && table && (
      <CheckoutDialog 
          isOpen={isCheckoutOpen}
          onOpenChange={setCheckoutOpen}
          cart={cart}
          totalAmount={totalAmount}
          tenant={tenant}
          table={table}
      />
    )}
    </>
  );
}
