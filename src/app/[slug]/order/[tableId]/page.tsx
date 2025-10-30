'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { Tenant, Table as TableType, Menu as MenuType } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewStatus = 'loading' | 'welcome' | 'error';

export default function OrderPage() {
  const params = useParams();
  const { slug, tableId } = params as { slug: string; tableId: string };
  
  const auth = useAuth();
  const firestore = useFirestore();

  const [status, setStatus] = useState<ViewStatus>('loading');
  const [tenantName, setTenantName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [authUser, setAuthUser] = useState<User | null>(null);

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
        // No user is signed in, so we initiate anonymous sign-in.
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
      // Wait for firestore and an authenticated user
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch Tenant to get its name
        const tenantQuery = query(collection(firestore, 'tenants'), where('slug', '==', slug));
        const tenantSnapshot = await getDocs(tenantQuery);
        
        if (tenantSnapshot.empty) {
          throw new Error('Kafe tidak ditemukan.');
        }
        
        const tenantData = tenantSnapshot.docs[0].data() as Tenant;
        setTenantName(tenantData.name);
        setStatus('welcome');

      } catch (err: any) {
        console.error("Data fetching error:", err);
        setErrorMsg(err.message || 'Gagal mengambil data kafe.');
        setStatus('error');
      }
    };

    fetchData();
  }, [firestore, authUser, slug]);


  // --- Render Logic ---
  if (status === 'loading') {
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
  
  if (status === 'welcome') {
    return (
       <main className="flex-1 flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 flex flex-col items-center gap-6 text-center">
            <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                Selamat Datang di {tenantName}
            </h1>
            <Button size="lg" className="mt-4">
                Saya ingin order
            </Button>
        </div>
      </main>
    );
  }

  return null;
}
