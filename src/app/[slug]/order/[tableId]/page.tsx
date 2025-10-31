'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore, errorEmitter } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType } from '@/lib/types';
import { Loader2, Play, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FirebaseError } from 'firebase/app';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { OrderUI } from './_components/order-ui';

// State machine for page flow
type PageStatus = 'authenticating' | 'welcome' | 'loading_data' | 'ordering' | 'error';

export default function OrderPage() {
  const params = useParams();
  const { slug, tableId } = params as { slug: string, tableId: string };
  
  const auth = useAuth();
  const firestore = useFirestore();

  const [pageStatus, setPageStatus] = useState<PageStatus>('authenticating');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Data state
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [menuItems, setMenuItems] = useState<MenuType[]>([]);

  // STEP 1: Handle Anonymous Authentication
  useEffect(() => {
    if (!auth) {
      if (pageStatus !== 'error') {
        setErrorMsg('Layanan autentikasi tidak siap.');
        setPageStatus('error');
      }
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Once authenticated, move to welcome state. Don't fetch data yet.
        if (pageStatus === 'authenticating') {
            setPageStatus('welcome');
        }
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error:", error);
          setErrorMsg('Gagal memulai sesi. Coba refresh halaman.');
          setPageStatus('error');
        });
      }
    });
    return () => unsubscribe();
  }, [auth, pageStatus]);


  // STEP 2: Handle button click to start ordering
  const handleStartOrder = async () => {
    setPageStatus('loading_data');

    if (!firestore || !auth?.currentUser) {
        setErrorMsg('Sesi autentikasi tidak valid atau Firestore tidak siap. Silakan refresh halaman.');
        setPageStatus('error');
        return;
    }

    try {
        // --- 1. Fetch Tenant Info ---
        const tenantQuery = query(collection(firestore, 'tenants'), where('slug', '==', slug));
        const tenantSnapshot = await getDocs(tenantQuery);
        if (tenantSnapshot.empty) throw new Error(`Kafe dengan slug "${slug}" tidak ditemukan.`);
        const tenantData = { id: tenantSnapshot.docs[0].id, ...tenantSnapshot.docs[0].data() } as Tenant;
        setTenant(tenantData);

        // --- 2. Fetch Table Info ---
        const tableRef = doc(firestore, `tenants/${tenantData.id}/tables/${tableId}`);
        const tableSnap = await getDoc(tableRef);
        if (!tableSnap.exists()) throw new Error(`Meja dengan ID "${tableId}" tidak ditemukan.`);
        const tableData = { id: tableSnap.id, ...tableSnap.data() } as TableType;
        setTable(tableData);
      
        // --- 3. Fetch Menu Items ---
        const menuRef = collection(firestore, `tenants/${tenantData.id}/menus`);
        const menuSnap = await getDocs(menuRef);
        const menuData = menuSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as MenuType))
            .filter(item => item.available); // Only show available items
        setMenuItems(menuData);
        
        // --- All data loaded, move to ordering UI ---
        setPageStatus('ordering');

    } catch (error: any) {
        console.error("Data loading error:", error);
         if (error instanceof FirebaseError && error.code === 'permission-denied') {
          const contextualError = new FirestorePermissionError({
            operation: 'list', // Assuming the failing operation is a list/get
            path: error.customData?.path || `tenants/${slug}`, // Provide a fallback path
          });
          errorEmitter.emit('permission-error', contextualError);
        }
        setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data kafe.');
        setPageStatus('error');
    }
  };


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
           <main className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="container mx-auto flex flex-col items-center gap-6 text-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                        <ShoppingCart className="size-10" />
                    </div>
                    <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                        Selamat Datang
                    </h1>
                    <p className="max-w-xl text-lg text-muted-foreground">
                        Pesan menu favorit Anda langsung dari meja.
                    </p>
                    <Button size="lg" className="mt-6 rounded-full text-lg px-8 py-6" onClick={handleStartOrder}>
                        <Play className="mr-3 size-5"/>
                        Saya Ingin Order
                    </Button>
                </div>
            </main>
        );
      
      case 'loading_data':
         return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Memuat menu...</p>
          </div>
        );

      case 'ordering':
         if (!tenant || !table) return null; // Should not happen in this state
         return <OrderUI tenant={tenant} table={table} menuItems={menuItems} />;

      case 'error':
         return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <Card className="w-full max-w-md bg-destructive/10 border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Aduh!</CardTitle>
                    <CardDescription className="text-destructive-foreground">
                        Terjadi kesalahan yang tidak terduga.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive-foreground">{errorMsg}</p>
                    <Button variant="destructive" className="mt-6 w-full" onClick={() => window.location.reload()}>
                        Coba Lagi
                    </Button>
                </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return <>{renderContent()}</>;
}
