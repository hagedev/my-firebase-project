
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType, CartItem } from '@/lib/types';
import { Loader2, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { formatRupiah, convertGoogleDriveUrl } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { CheckoutDialog } from './_components/checkout-dialog';


type ViewStatus = 'loading' | 'welcome' | 'ordering' | 'error';

export default function OrderPage() {
  const params = useParams();
  const { slug, tableId } = params as { slug: string; tableId: string };
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const [status, setStatus] = useState<ViewStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Data states
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [menuItems, setMenuItems] = useState<MenuType[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);


  // Effect 1: Handle Anonymous Authentication
  useEffect(() => {
    if (!auth) {
      setStatus('error');
      setErrorMsg('Layanan autentikasi tidak siap.');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error:", error);
          setStatus('error');
          setErrorMsg('Gagal memulai sesi anonim.');
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Effect 2: Fetch data only after user is authenticated
  useEffect(() => {
    if (!firestore || !authUser) {
      return; // Wait for firestore and an authenticated user
    }

    const fetchData = async () => {
      setIsDataLoading(true);
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
        const menuQuery = query(collection(firestore, `tenants/${tenantData.id}/menus`), where('available', '==', true));
        const menuSnapshot = await getDocs(menuQuery);
        const menuData = menuSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MenuType[];
        setMenuItems(menuData);
        
        setStatus('welcome');
      } catch (err: any) {
        console.error("Data fetching error:", err);
        setErrorMsg(err.message || 'Gagal mengambil data.');
        setStatus('error');
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [firestore, authUser, slug, tableId]);

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

  const updateQuantity = (itemId: string, amount: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + amount;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);


  // --- Render Logic ---
  if (status === 'loading' || (status !== 'error' && isDataLoading)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Mempersiapkan sesi...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="font-headline text-5xl font-bold text-destructive">Aduh!</h1>
        <p className="mt-2 text-muted-foreground">{errorMsg}</p>
      </div>
    );
  }
  
  if (status === 'welcome' && tenant && table) {
    return (
       <main className="flex-1 flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 flex flex-col items-center gap-6 text-center">
            <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                Selamat Datang di {tenant.name}
            </h1>
            <p className="text-lg text-muted-foreground">Anda berada di Meja {table.tableNumber}</p>
            <Button size="lg" className="mt-4" onClick={() => setStatus('ordering')}>
                Saya ingin order
            </Button>
        </div>
      </main>
    );
  }

  if (status === 'ordering' && tenant && table) {
    const categories = [...new Set(menuItems.map(item => item.category))];

    return (
      <div className="flex flex-col h-screen">
        <header className="p-4 border-b text-center sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <h1 className="font-headline text-2xl font-bold">{tenant.name}</h1>
            <p className="text-sm text-muted-foreground">Meja {table.tableNumber}</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 space-y-8">
           {categories.map(category => (
            <div key={category}>
                <h2 className="font-bold text-xl mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuItems.filter(item => item.category === category).map(item => (
                        <Card key={item.id} className="flex flex-col">
                            <CardContent className="p-4 flex gap-4">
                                {item.imageUrl && (
                                     <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                                        <Image src={convertGoogleDriveUrl(item.imageUrl)} alt={item.name} layout="fill" objectFit="cover" className="bg-gray-200" />
                                    </div>
                                )}
                                <div className="flex-grow flex flex-col">
                                    <h3 className="font-semibold">{item.name}</h3>
                                    {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                                    <p className="font-bold mt-auto">{formatRupiah(item.price)}</p>
                                </div>
                            </CardContent>
                             <div className="p-4 pt-0 mt-auto">
                                <Button className="w-full" onClick={() => addToCart(item)}>Tambah</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
           ))}
        </main>
        {cart.length > 0 && (
          <footer className="p-4 border-t sticky bottom-0 bg-background shadow-lg">
             <Card>
                <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-4">Keranjang Anda</h3>
                    <div className="max-h-40 overflow-y-auto space-y-4">
                         {cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatRupiah(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Separator className="my-4"/>
                    <div className="flex justify-between font-bold text-lg mb-4">
                        <p>Total</p>
                        <p>{formatRupiah(totalAmount)}</p>
                    </div>
                     <Button className="w-full" onClick={() => setIsCheckoutOpen(true)}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Pesan Sekarang ({totalItems} item)
                    </Button>
                </CardContent>
            </Card>
          </footer>
        )}
        
        {isCheckoutOpen && (
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
    )
  }

  return null;
}
