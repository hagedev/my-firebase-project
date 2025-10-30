'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { Tenant, Table as TableType } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewStatus = 'loading' | 'welcome' | 'error';

export default function OrderPage() {
  const params = useParams();
  const { slug, tableId } = params as { slug: string; tableId: string };
  
  const auth = useAuth();
  const firestore = useFirestore();

  const [status, setStatus] = useState<ViewStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Data states
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableType | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Effect 1: Handle Anonymous Authentication. This runs only once.
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
        // If no user, sign in anonymously. onAuthStateChanged will run again with the new user.
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error:", error);
          setStatus('error');
          setErrorMsg('Gagal memulai sesi anonim.');
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Effect 2: Fetch CORE data (tenant, table) only after user is authenticated.
  useEffect(() => {
    // Wait for firestore and an authenticated user.
    if (!firestore || !authUser) {
      return; 
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
        
        // If everything is successful, change status to 'welcome'
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


  // --- Render Logic ---
  if (status === 'loading' || isDataLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Mempersiapkan sesi...</p>
      </div>
    );
  }

  if (status === 'error' || !tenant || !table) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="font-headline text-5xl font-bold text-destructive">Aduh!</h1>
        <p className="mt-2 text-muted-foreground">{errorMsg || 'Data kafe atau meja tidak dapat dimuat.'}</p>
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
            {/* Tombol ini sengaja tidak diberi fungsi onClick untuk saat ini */}
            <Button size="lg" className="mt-4">
                Saya ingin order
            </Button>
        </div>
      </main>
    );
  }

  // Fallback, seharusnya tidak pernah tercapai
  return null;
}
