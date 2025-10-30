'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType, CartItem } from '@/lib/types';
import { Loader2, ShoppingCart, PlusCircle, MinusCircle, Trash2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { formatRupiah, convertGoogleDriveUrl } from '@/lib/utils';
import { CheckoutDialog } from './_components/checkout-dialog';

export default function OrderPage() {
  const params = useParams();
  const slug = params.slug as string;
  const tableId = params.tableId as string;
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  // State for data
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [menuItems, setMenuItems] = useState<MenuType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // State for UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!firestore || !auth) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Step 1: Ensure anonymous sign-in
        if (!auth.currentUser) {
          await signInAnonymously(auth);
          // We need to wait for the next auth state change, so let's just return
          // and let the hook re-run when the user is available. A small delay is fine.
          const checkUser = () => new Promise(resolve => {
            const unsub = onSnapshot(doc(firestore, 'users', 'dummy'), () => {}); // A trick to wait for auth
            const unsubscribe = auth.onAuthStateChanged(user => {
              if (user) {
                unsubscribe();
                resolve(user);
              }
            });
          });
          await checkUser();
        }

        // Step 2: Fetch Tenant by slug
        const tenantsRef = collection(firestore, 'tenants');
        const tenantQuery = query(tenantsRef, where('slug', '==', slug));
        const tenantSnapshot = await getDocs(tenantQuery);

        if (tenantSnapshot.empty) {
          throw new Error(`Kafe dengan slug "${slug}" tidak ditemukan.`);
        }
        const foundTenant = { id: tenantSnapshot.docs[0].id, ...tenantSnapshot.docs[0].data() } as Tenant;
        setTenant(foundTenant);

        // Step 3: Fetch Table by ID
        const tableRef = doc(firestore, `tenants/${foundTenant.id}/tables/${tableId}`);
        const tableSnapshot = await getDoc(tableRef);
        if (!tableSnapshot.exists()) {
          throw new Error('Meja tidak valid atau tidak ditemukan.');
        }
        const foundTable = { id: tableSnapshot.id, ...tableSnapshot.data() } as TableType;
        setTable(foundTable);

        // Step 4: Fetch Menu items
        const menuRef = collection(firestore, `tenants/${foundTenant.id}/menus`);
        const menuQuery = query(menuRef, where('available', '==', true));
        const menuSnapshot = await getDocs(menuQuery);
        const fetchedMenus = menuSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuType));
        setMenuItems(fetchedMenus);

      } catch (e: any) {
        console.error('Failed to fetch order page data:', e);
        setError(e.message || 'Terjadi kesalahan saat memuat data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, [auth, firestore, slug, tableId, router]);

  const groupedMenu = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const category = item.category || 'Lainnya';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuType[]>);
  }, [menuItems]);

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

  const deleteFromCart = (itemId: string) => {
      setCart(prevCart => prevCart.filter(cartItem => cartItem.id !== itemId));
  };
  
  const getQuantityInCart = (itemId: string) => {
    return cart.find(item => item.id === itemId)?.quantity || 0;
  };

  const { totalItems, totalPrice } = useMemo(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { totalItems, totalPrice };
  }, [cart]);


  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-muted-foreground">Memuat menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-destructive/10">
        <XCircle className="h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold text-destructive">Gagal Memuat Halaman</h1>
        <p className="mt-2 text-destructive-foreground">{error}</p>
        <Button variant="destructive" onClick={() => window.location.reload()} className="mt-6">
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!tenant || !table) {
    // This case should be covered by the error state, but as a fallback
    return <div>Data kafe atau meja tidak ditemukan.</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-32">
        <header className="p-4 bg-card border-b sticky top-0 z-10">
            <h1 className="font-headline text-3xl font-bold text-center">{tenant.name}</h1>
            <p className="text-center text-muted-foreground">Pesanan untuk Meja {table.tableNumber}</p>
        </header>

        <main className="container mx-auto px-4 py-6">
            {Object.entries(groupedMenu).map(([category, items]) => (
                <div key={category} className="mb-8">
                    <h2 className="font-headline text-2xl font-semibold mb-4 border-b-2 border-primary pb-2">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(item => (
                            <Card key={item.id} className="flex flex-col">
                                <CardContent className="p-4 flex-1 flex flex-col">
                                   <div className="flex-1">
                                        <h3 className="font-bold">{item.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 mb-2">{item.description}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-4">
                                        <p className="font-semibold text-primary">{formatRupiah(item.price)}</p>
                                        <div className="flex items-center gap-2">
                                           {getQuantityInCart(item.id) > 0 ? (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.id)}><MinusCircle/></Button>
                                                    <span className="font-bold w-4 text-center">{getQuantityInCart(item.id)}</span>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToCart(item)}><PlusCircle/></Button>
                                                </>
                                           ) : (
                                                <Button size="sm" onClick={() => addToCart(item)}>Tambah</Button>
                                           )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </main>
      </div>

       {cart.length > 0 && (
         <footer className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-20">
            <div className="container mx-auto p-4 flex justify-between items-center">
                 <div>
                    <p className="font-bold">{totalItems} Item</p>
                    <p className="text-lg font-bold text-primary">{formatRupiah(totalPrice)}</p>
                </div>
                <Button size="lg" onClick={() => setIsCheckoutOpen(true)}>
                    <ShoppingCart className="mr-2"/>
                    Checkout
                </Button>
            </div>
         </footer>
      )}

      {isCheckoutOpen && (
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
