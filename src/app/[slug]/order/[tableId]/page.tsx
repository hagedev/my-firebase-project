'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Tenant } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderPageTest() {
  const params = useParams();
  const slug = params.slug as string;
  const auth = useAuth();
  const firestore = useFirestore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [cafeName, setCafeName] = useState<string>('');

  useEffect(() => {
    const runTest = async () => {
      if (!auth || !firestore) {
        // Wait for services to be available
        return;
      }

      try {
        // Step 1: Ensure user is signed in anonymously
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        // At this point, we are guaranteed to have an authenticated user.

        // Step 2: Try to fetch the tenant data
        const tenantsRef = collection(firestore, 'tenants');
        const q = query(tenantsRef, where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error('Kafe tidak ditemukan.');
        }

        const tenantDoc = querySnapshot.docs[0];
        const tenantData = tenantDoc.data() as Tenant;

        // Step 3: If successful, update state
        setCafeName(tenantData.name);
        setStatus('success');
      } catch (error) {
        console.error('Test failed:', error);
        setStatus('error');
      }
    };

    runTest();
  }, [auth, firestore, slug]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Menyiapkan sesi...</p>
      </div>
    );
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
      {status === 'success' ? (
        <div className="flex flex-col items-center gap-6">
          <h1 className="font-headline text-4xl font-bold text-primary">
            Selamat Datang di {cafeName}
          </h1>
          <Button size="lg">Saya ingin order</Button>
        </div>
      ) : (
        <h1 className="font-headline text-4xl font-bold text-destructive">
          Aduh!
        </h1>
      )}
    </main>
  );
}
