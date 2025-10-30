'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function OrderPage() {
  const [authStatus, setAuthStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const auth = useAuth();

  useEffect(() => {
    if (!auth) {
      // Jika layanan auth belum siap, tunggu.
      return;
    }

    const attemptAnonymousSignIn = async () => {
      try {
        // Cek jika sudah ada user (termasuk sesi anonim sebelumnya)
        if (auth.currentUser) {
           setAuthStatus('success');
        } else {
          // Jika tidak ada, coba login anonim
          await signInAnonymously(auth);
          setAuthStatus('success');
        }
      } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        setAuthStatus('error');
      }
    };

    attemptAnonymousSignIn();
  }, [auth]); // Hanya bergantung pada auth object

  return (
    <div className="flex items-center justify-center min-h-screen text-4xl font-bold text-center">
      {authStatus === 'loading' && <Loader2 className="h-16 w-16 animate-spin" />}
      {authStatus === 'success' && <h1 className="text-green-600">selamat datang pengunjung yang ganteng</h1>}
      {authStatus === 'error' && <h1 className="text-destructive">aduh!</h1>}
    </div>
  );
}
