'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth, useFirestore } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Tenant, Menu, Table as TableType, CartItem } from '@/lib/types';
import { Loader2, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah, convertGoogleDriveUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckoutDialog } from './_components/checkout-dialog';

export default function OrderPage() {
  const params = useParams();
  const { slug, tableId } = params as { slug: string; tableId: string; };
  const auth = useAuth();
  const firestore = useFirestore();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [menu, setMenu] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [status, setStatus] = useState<'loading' | 'welcome' | 'ordering' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth || !firestore || !slug || !tableId) {
        return;
      }

      try {
        // Step 1: Ensure user is signed in anonymously
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        
        // Wait for auth state to be confirmed
        await new Promise(resolve => {
            const unsubscribe = auth.onAuthStateChanged(user => {
                if (user) {
                    unsubscribe();
                    resolve(user);
                }
            });
        });

        // Step 2: Fetch tenant data
        const tenantsRef = collection(firestore, 'tenants');
        const tenantQuery = query(tenantsRef, where('slug', '==', slug));
        const tenantSnapshot = await getDocs(tenantQuery);

        if (tenantSnapshot.empty) {
          throw new Error('Kafe tidak ditemukan.');
        }
        const tenantData = { id: tenantSnapshot.docs[0].id, ...tenantSnapshot.docs[0].data() } as Tenant;
        setTenant(tenantData);

        // Step 3: Fetch table data
        const tableRef = doc(firestore, `tenants/${tenantData.id}/tables/${tableId}`);
        const tableSnap = await getDoc(tableRef);
        if (!tableSnap.exists()) {
            throw new Error('Meja tidak ditemukan.');
        }
        const tableData = { id: tableSnap.id, ...tableSnap.data() } as TableType;
        setTable(tableData);

        // Step 4: Fetch menu data
        const menuRef = collection(firestore, `tenants/${tenantData.id}/menus`);
        const menuQuery = query(menuRef, where('available', '==', true));
        const menuSnapshot = await getDocs(menuQuery);
        const menuData = menuSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Menu));
        setMenu(menuData);
        
        setStatus('welcome');

      } catch (error: any) {
        setErrorMessage(error.message || 'Terjadi kesalahan tidak diketahui.');
        setStatus('error');
      }
    };

    fetchData();
  }, [auth, firestore, slug, tableId]);

  // --- Cart Handlers ---
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

  const updateQuantity = (itemId: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.id !== itemId);
      }
      return prevCart.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      );
    });
  };

  const categorizedMenu = useMemo(() => {
    if (!menu) return {};
    return menu.reduce((acc, item) => {
        const category = item.category || 'Lainnya';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, Menu[]>);
  }, [menu]);

  const totalAmount = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);


  // --- Render Logic ---

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Menyiapkan menu...</p>
      </div>
    );
  }

  if (status === 'error' || !tenant) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="font-headline text-4xl font-bold text-destructive">Aduh!</h1>
        <p className="mt-2 text-muted-foreground">{errorMessage || 'Gagal memuat data kafe atau meja.'}</p>
      </main>
    );
  }
  
  if (status === 'welcome') {
      return (
        <main className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
            <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                Selamat Datang di {tenant.name}
            </h1>
            <Button size="lg" className="mt-8" onClick={() => setStatus('ordering')}>
                Saya ingin order
            </Button>
        </main>
      )
  }

  return (
    <>
      <div className="min-h-screen w-full bg-gray-50 pb-32">
        <header className="bg-card shadow-md sticky top-0 z-20">
            <div className="container mx-auto p-4">
                <h1 className="font-headline text-3xl font-bold text-primary">{tenant.name}</h1>
                <p className="text-muted-foreground">Memesan dari <span className="font-semibold text-foreground">Meja {table?.tableNumber}</span></p>
            </div>
        </header>
        
        <main className="container mx-auto p-4">
          {Object.keys(categorizedMenu).map(category => (
            <section key={category} className="mb-8">
              <h2 className="font-headline text-2xl font-semibold mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorizedMenu[category].map(item => (
                  <Card key={item.id} className="flex flex-col">
                    <CardContent className="p-4 flex gap-4">
                      {item.imageUrl && (
                        <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                           <Image 
                            src={convertGoogleDriveUrl(item.imageUrl)} 
                            alt={item.name} 
                            fill={true}
                            style={{objectFit: "cover"}}
                           />
                        </div>
                      )}
                      <div className="flex-grow flex flex-col">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-grow">{item.description}</p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-primary">{formatRupiah(item.price)}</span>
                            <Button size="sm" onClick={() => addToCart(item)}>Tambah</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </main>

        {cart.length > 0 && table && (
            <footer className="fixed bottom-0 left-0 right-0 z-10 bg-card border-t shadow-lg">
                <div className="container mx-auto p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-muted-foreground">{cart.length} item di keranjang</p>
                            <p className="text-xl font-bold">{formatRupiah(totalAmount)}</p>
                        </div>
                        <Button size="lg" onClick={() => setIsCheckoutOpen(true)}>
                            Pesan Sekarang <ArrowRight className="ml-2"/>
                        </Button>
                    </div>
                </div>
            </footer>
        )}
      </div>

      {table && <CheckoutDialog 
        isOpen={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        cart={cart}
        totalAmount={totalAmount}
        tenant={tenant}
        table={table}
      />}
    </>
  );
}
