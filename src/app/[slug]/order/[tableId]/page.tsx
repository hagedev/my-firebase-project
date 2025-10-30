'use client';

import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Tenant } from '@/lib/types';

export default function OrderPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Mengautentikasi...');
  const auth = useAuth();
  const firestore = useFirestore();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    if (!auth || !firestore || !slug) {
      return;
    }

    const testDataAccess = async () => {
      try {
        // Step 1: Ensure anonymous sign-in
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        
        setMessage('Autentikasi berhasil. Mengambil data kafe...');

        // Step 2: Try to access the tenant collection
        const tenantsRef = collection(firestore, 'tenants');
        const q = query(tenantsRef, where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error(`Kafe dengan slug "${slug}" tidak ditemukan.`);
        }

        const tenantDoc = querySnapshot.docs[0];
        const tenantData = tenantDoc.data() as Tenant;
        
        // Step 3: Display the cafe name
        setStatus('success');
        setMessage(`Selamat Datang di ${tenantData.name}`);

      } catch (error: any) {
        console.error("Test failed:", error);
        setStatus('error');
        setMessage(error.message || 'Terjadi kesalahan.');
      }
    };

    testDataAccess();
  }, [auth, firestore, slug]);

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-destructive';
      default:
        return '';
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen text-2xl md:text-4xl font-bold text-center p-4">
      <div className="flex flex-col items-center gap-4">
        {status === 'loading' && <Loader2 className="h-16 w-16 animate-spin" />}
        <h1 className={getStatusColor()}>{message}</h1>
      </div>
    </div>
  );
}
