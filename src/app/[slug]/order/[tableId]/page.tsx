'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType, CartItem } from '@/lib/types';
import { Loader2, ShoppingCart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah, convertGoogleDriveUrl } from '@/lib/utils';
import Image from 'next/image';
import { CheckoutDialog } from './_components/checkout-dialog';

// State machine for page flow
type PageStatus = 'authenticating' | 'welcome' | 'fetching_data' | 'ordering' | 'error';

export default function OrderPage() {
  const params = useParams();
  const { slug, tableId } = params as { slug: string; tableId: string };
  
  const auth = useAuth();
  const firestore = useFirestore();

  const [pageStatus, setPageStatus] = useState<PageStatus>('authenticating');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Data states
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [menuItems, setMenuItems] = useState<MenuType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // STEP 1: Handle Anonymous Authentication ONLY.
  useEffect(() => {
    if (!auth) {
      setErrorMsg('Layanan autentikasi tidak siap.');
      setPageStatus('error');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is authenticated (anonymous or otherwise), show the welcome screen.
        setPageStatus('welcome');
      } else {
        // No user, attempt to sign in anonymously.
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error:", error);
          setErrorMsg('Gagal memulai sesi. Coba refresh halaman.');
          setPageStatus('error');
        });
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // STEP 2 & 3: Handle button click and fetch data AFTER click.
  const handleStartOrder = async () => {
    setPageStatus('fetching_data');

    // This check is crucial. It ensures we have the most up-to-date user state.
    if (!firestore || !auth?.currentUser) {
        setErrorMsg('Sesi autentikasi tidak valid. Silakan refresh halaman.');
        setPageStatus('error');
        return;
    }

    try {
      // --- Fetch Tenant ---
      const tenantQuery = query(collection(firestore, 'tenants'), where('slug', '==', slug));
      const tenantSnapshot = await getDocs(tenantQuery);
      if (tenantSnapshot.empty) throw new Error('Kafe tidak ditemukan.');
      const tenantDoc = tenantSnapshot.docs[0];
      const tenantData = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
      setTenant(tenantData);

      // --- Fetch Table ---
      const tableRef = doc(firestore, `tenants/${tenantData.id}/tables/${tableId}`);
      const tableSnap = await getDoc(tableRef);
      if (!tableSnap.exists()) throw new Error('Meja tidak ditemukan.');
      const tableData = { id: tableSnap.id, ...tableSnap.data() } as TableType;
      setTable(tableData);

      // --- Fetch Menu ---
      const menuRef = collection(firestore, `tenants/${tenantData.id}/menus`);
      const menuSnap = await getDocs(query(menuRef, where('available', '==', true)));
      const menuData = menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuType));
      setMenuItems(menuData);
      
      // STEP 4: All data fetched, move to ordering view
      setPageStatus('ordering');
    } catch (err: any) {
      console.error("Data fetching error:", err);
      setErrorMsg(err.message || 'Gagal mengambil data menu.');
      setPageStatus('error');
    }
  };

  // --- Cart Management ---
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

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    } else {
      setCart(prevCart =>
        prevCart.map(item => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
      );
    }
  };
  
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // --- Render Logic ---
  const renderContent = () => {
    switch (pageStatus) {
      case 'authenticating':
        return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Mempersiapkan sesi...</p>
          </div>
        );

      case 'welcome':
        return (
          <main className="flex-1 flex flex-col items-center justify-center">
            <div className="container mx-auto px-4 flex flex-col items-center gap-6 text-center">
                <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                    Selamat Datang
                </h1>
                <Button size="lg" className="mt-4" onClick={handleStartOrder}>
                    Saya ingin order
                </Button>
            </div>
          </main>
        );

      case 'fetching_data':
         return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Mengambil menu...</p>
          </div>
        );
      
      case 'ordering':
        if (!tenant || !table) return null;
        const categories = [...new Set(menuItems.map(item => item.category))];

        return (
          <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-20">
              <div className="container mx-auto p-4 flex justify-between items-center">
                <div>
                   <h1 className="font-headline text-2xl font-bold text-primary">{tenant.name}</h1>
                   <p className="text-sm text-muted-foreground">Meja {table.tableNumber}</p>
                </div>
                <Button variant="outline" onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0}>
                  <ShoppingCart className="mr-2 h-4 w-4"/>
                  Keranjang ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                </Button>
              </div>
            </header>

            <main className="container mx-auto p-4">
              {categories.map(category => (
                <section key={category} className="mb-8">
                  <h2 className="font-headline text-2xl font-bold mb-4">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuItems.filter(item => item.category === category).map(item => {
                      const cartItem = cart.find(ci => ci.id === item.id);
                      return (
                        <Card key={item.id} className="overflow-hidden flex flex-col">
                          {item.imageUrl && (
                            <div className="relative w-full h-40">
                              <Image src={convertGoogleDriveUrl(item.imageUrl)} alt={item.name} layout="fill" objectFit="cover" />
                            </div>
                          )}
                          <CardHeader>
                            <CardTitle>{item.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex-grow flex flex-col justify-between">
                            <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                            <div className="flex justify-between items-center">
                              <p className="font-semibold text-lg">{formatRupiah(item.price)}</p>
                              {!cartItem ? (
                                <Button onClick={() => addToCart(item)}>Tambah</Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}><Minus className="h-4 w-4"/></Button>
                                  <span className="font-bold w-4 text-center">{cartItem.quantity}</span>
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}><Plus className="h-4 w-4"/></Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </main>
             {tenant && table && (
              <CheckoutDialog
                isOpen={isCheckoutOpen}
                onOpenChange={setIsCheckoutOpen}
                cart={cart}
                totalAmount={totalAmount}
                tenant={tenant}
                table={table}
              />
            )}
          </div>
        );

      case 'error':
        return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <h1 className="font-headline text-5xl font-bold text-destructive">Aduh!</h1>
            <p className="mt-2 text-muted-foreground">{errorMsg}</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return <>{renderContent()}</>;
}
