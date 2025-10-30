'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderPage() {
  const auth = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!auth) {
      console.error("Auth service not available.");
      setStatus('error');
      return;
    }

    // This listener will fire once the auth state is confirmed.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in (could be from a previous session or the new anonymous one).
        console.log("Auth state changed, user is present:", user.uid);
        setStatus('success');
      } else {
        // No user is signed in, so we initiate anonymous sign-in.
        // The onAuthStateChanged listener will fire again once this completes.
        console.log("No user found, attempting anonymous sign-in...");
        signInAnonymously(auth).catch((err) => {
          console.error('Anonymous sign-in failed:', err);
          setStatus('error');
        });
      }
    }, (error) => {
      // Handle errors in the listener itself
      console.error('onAuthStateChanged error:', error);
      setStatus('error');
    });

    // Cleanup the listener on component unmount
    return () => unsubscribe();

  }, [auth]);

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
        <p className="mt-2 text-muted-foreground">Gagal mempersiapkan sesi. Silakan coba lagi.</p>
      </div>
    );
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
            selamat datang pengunjung yang ganteng
        </h1>
        <Button size="lg" className="mt-8">
            Saya ingin order
        </Button>
    </main>
  );
}
