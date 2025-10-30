'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType, CartItem } from '@/lib/types';
import { Loader2, MinusCircle, PlusCircle, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatRupiah } from '@/lib/utils';
import Image from 'next/image';
import { CheckoutDialog } from './_components/checkout-dialog';

type AuthStatus = 'loading' | 'success' | 'error';

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const { slug, tableId } = params as { slug: string; tableId: string };
  
  const auth = useAuth();
  const firestore = useFirestore();

  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [isOrdering, setIsOrdering] = useState(false); // New state to control view

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [menu, setMenu] = useState<MenuType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Effect for anonymous authentication and subsequent data fetching
  useEffect(() => {
    if (!auth || !firestore) {
      setAuthStatus('error');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const performSignIn = async () => {
        try {
          const currentUser = user || (await signInAnonymously(auth)).user;
          if (currentUser) {
            setAuthStatus('success');
            
            // --- Data Fetching ---
            // 1. Fetch Tenant
            const tenantQuery = query(collection(firestore, 'tenants'), where('slug', '==', slug));
            const tenantSnapshot = await getDocs(tenantQuery);
            if (tenantSnapshot.empty) throw new Error('Kafe tidak ditemukan.');
            const tenantData = { id: tenantSnapshot.docs[0].id, ...tenantSnapshot.docs[0].data() } as Tenant;
            setTenant(tenantData);

            // 2. Fetch Table
            const tableRef = doc(firestore, `tenants/${tenantData.id}/tables/${tableId}`);
            const tableSnapshot = await getDoc(tableRef);
            if (!tableSnapshot.exists()) throw new Error('Meja tidak ditemukan.');
            const tableData = { id: tableSnapshot.id, ...tableSnapshot.data() } as TableType;
            setTable(tableData);

            // 3. Fetch Menu
            const menuQuery = query(collection(firestore, `tenants/${tenantData.id}/menus`), where('available', '==', true));
            const menuSnapshot = await getDocs(menuQuery);
            const menuData = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuType));
            setMenu(menuData);
          }
        } catch (error) {
          console.error("Auth or data fetching error:", error);
          setAuthStatus('error');
        } finally {
          setIsDataLoading(false);
        }
      };

      performSignIn();
    });

    return () => unsubscribe();
  }, [auth, firestore, slug, tableId]);

  // --- Cart Logic ---
  const addToCart = (item: MenuType) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.id === itemId ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem
        );
      }
      return prevCart.filter(cartItem => cartItem.id !== itemId);
    });
  };

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  // --- Render Logic ---
  if (authStatus === 'loading' || isDataLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Mempersiapkan sesi...</p>
      </div>
    );
  }

  if (authStatus === 'error' || !tenant) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="font-headline text-5xl font-bold text-destructive">Aduh!</h1>
        <p className="mt-2 text-muted-foreground">Gagal mempersiapkan sesi atau data tidak ditemukan. Silakan coba lagi.</p>
      </div>
    );
  }
  
  // After loading and success, decide whether to show welcome or ordering screen
  if (!isOrdering) {
      return (
         <main className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
            <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                Selamat Datang di {tenant.name}
            </h1>
            <Button size="lg" className="mt-8" onClick={() => setIsOrdering(true)}>
                Saya ingin order
            </Button>
        </main>
      )
  }

  // --- Ordering View ---
  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-card shadow-sm sticky top-0 z-10 p-4 text-center">
        <h1 className="font-headline text-2xl font-bold text-primary">{tenant.name}</h1>
        <p className="text-sm text-muted-foreground">Pesanan untuk Meja {table?.tableNumber}</p>
      </header>

      <main className="container mx-auto max-w-3xl p-4">
        <div className="space-y-6">
          {menu.map(item => (
            <Card key={item.id} className="flex items-center gap-4 p-4">
              {item.imageUrl && (
                 <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                   <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" className="bg-gray-200" />
                 </div>
              )}
              <div className="flex-grow">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{formatRupiah(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                 {cart.find(cartItem => cartItem.id === item.id) ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.id)}>
                        {cart.find(cartItem => cartItem.id === item.id)?.quantity === 1 ? <Trash2 className="text-destructive"/> : <MinusCircle />}
                      </Button>
                      <span className="w-4 text-center font-bold">{cart.find(cartItem => cartItem.id === item.id)?.quantity}</span>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToCart(item)}>
                        <PlusCircle />
                      </Button>
                    </>
                ) : (
                    <Button onClick={() => addToCart(item)}>Tambah</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>

      {cart.length > 0 && (
         <div className="fixed bottom-0 left-0 right-0 z-10 bg-card border-t shadow-lg">
            <div className="container mx-auto max-w-3xl p-4 flex justify-between items-center">
                <div>
                    <p className="font-bold">{totalItems} item</p>
                    <p className="text-xl font-bold text-primary">{formatRupiah(totalPrice)}</p>
                </div>
                <Button size="lg" onClick={() => setIsCheckoutOpen(true)}>
                    <ShoppingCart className="mr-2"/>
                    Pesan Sekarang
                </Button>
            </div>
        </div>
      )}
    </div>
    {tenant && table && (
        <CheckoutDialog 
            isOpen={isCheckoutOpen}
            onOpenChange={setIsCheckoutOpen}
            cart={cart}
            totalAmount={totalPrice}
            tenant={tenant}
            table={table}
        />
    )}
    </>
  );
}
