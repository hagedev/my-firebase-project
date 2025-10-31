'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Tenant } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// State machine for page flow
type PageStatus = 'authenticating' | 'welcome' | 'testing' | 'test_success' | 'error';

export default function OrderPage() {
  const params = useParams();
  const { slug } = params as { slug: string };
  
  const auth = useAuth();
  const firestore = useFirestore();

  const [pageStatus, setPageStatus] = useState<PageStatus>('authenticating');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // STEP 1: Handle Anonymous Authentication
  useEffect(() => {
    if (!auth) {
      setErrorMsg('Layanan autentikasi tidak siap.');
      setPageStatus('error');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is authenticated, move to welcome screen.
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

  // STEP 2 & 3: Handle button click and test cafe info fetching
  const handleStartOrderTest = async () => {
    setPageStatus('testing');

    if (!firestore || !auth?.currentUser) {
        setErrorMsg('Sesi autentikasi tidak valid atau Firestore tidak siap. Silakan refresh halaman.');
        setPageStatus('error');
        return;
    }

    try {
      // --- TEST: Fetch Tenant Info ---
      console.log('Testing: Attempting to fetch tenant with slug:', slug);
      const tenantQuery = query(collection(firestore, 'tenants'), where('slug', '==', slug));
      const tenantSnapshot = await getDocs(tenantQuery);
      
      if (tenantSnapshot.empty) {
        throw new Error(`Kafe dengan slug "${slug}" tidak ditemukan.`);
      }

      const tenantDoc = tenantSnapshot.docs[0].data();
      console.log('Test successful. Found tenant:', tenantDoc.name);

      // STEP 4: Show success message
      setPageStatus('test_success');
    } catch (err: any) {
      console.error("Data fetching test error:", err);
      setErrorMsg(err.message || 'Gagal mengambil data kafe.');
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
          <main className="flex-1 flex flex-col items-center justify-center">
            <div className="container mx-auto px-4 flex flex-col items-center gap-6 text-center">
                <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                    Selamat Datang
                </h1>
                <p className="text-muted-foreground">Klik tombol di bawah untuk memulai tes.</p>
                <Button size="lg" className="mt-4" onClick={handleStartOrderTest}>
                    Saya ingin order
                </Button>
            </div>
          </main>
        );

      case 'testing':
         return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Menguji pembacaan info kafe...</p>
          </div>
        );
      
      case 'test_success':
         return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <h1 className="font-headline text-5xl font-bold text-green-600">
              info kafe sukses
            </h1>
            <p className="mt-2 text-muted-foreground">Tes pembacaan data kafe berhasil dilakukan.</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center p-4">
            <h1 className="font-headline text-5xl font-bold text-destructive">Aduh!</h1>
            <p className="mt-2 text-muted-foreground max-w-md">Terjadi masalah:</p>
            <Card className="mt-4 text-left bg-destructive/10 border-destructive max-w-md w-full">
                <CardHeader>
                    <CardTitle className="text-destructive">Detail Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <code className="text-sm text-destructive-foreground break-all">{errorMsg}</code>
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
