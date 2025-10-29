'use client';

import { useState, useCallback } from 'react';
import { useAuth, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function SeedSuperAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleGenerate = useCallback(async () => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const email = 'bayu@superad.min';
    const password = '123456';

    try {
      // Langkah 1: Coba buat pengguna baru di Firebase Authentication.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      toast({
        title: 'Pengguna Berhasil Dibuat',
        description: `Akun untuk ${email} telah dibuat. Menetapkan peran...`,
      });

      // Langkah 2: Buat dokumen peran di Firestore.
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminData = {
        userId: user.uid,
        email: user.email,
        role: 'superadmin',
        assignedAt: serverTimestamp(),
      };

      await setDoc(superAdminRef, superAdminData);

      toast({
        title: 'Peran Super Admin Ditetapkan',
        description: 'Akun telah berhasil menjadi super admin.',
      });

      setSuccess(true);

    } catch (error: any) {
      console.error('Gagal membuat super admin:', error);
      let errorMessage = 'Terjadi kesalahan yang tidak diketahui.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = `Pengguna dengan email ${email} sudah ada. Proses dianggap berhasil. Silakan login.`;
        setSuccess(true); // Anggap sukses jika user sudah ada.
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Gagal membuat dokumen peran karena masalah izin. Kemungkinan besar sudah ada super admin lain.';
        // Emit contextual error
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `roles_superadmin/${auth.currentUser?.uid || 'unknown'}`,
            operation: 'create',
            requestResourceData: { email, role: 'superadmin' }
        }));
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Operasi Gagal',
        description: errorMessage,
      });

    } finally {
      setIsLoading(false);
    }
  }, [auth, firestore, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
         <div className="mb-8 flex justify-center">
            <Link href="/">
                <Logo className="text-foreground" />
            </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Generator Super Admin</CardTitle>
            <CardDescription>
                Klik tombol di bawah untuk membuat akun super admin pertama.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-card-foreground/5 p-4 text-sm">
                <p className="font-semibold">Akun yang akan dibuat:</p>
                <p><span className="text-muted-foreground">Email:</span> bayu@superad.min</p>
                <p><span className="text-muted-foreground">Password:</span> 123456</p>
            </div>

            {success && !isLoading && (
              <div className="rounded-md border border-green-500 bg-green-50 p-4 text-green-800">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6" />
                  <div>
                    <p className="font-semibold">Operasi Berhasil!</p>
                    <p className="text-sm">Pengguna super admin sudah ada atau berhasil dibuat.</p>
                     <Button variant="link" className="p-0 h-auto mt-2" asChild>
                        <Link href="/admin/login">Lanjutkan ke Halaman Login</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {error && !success && !isLoading && (
                 <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
                     <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5"/>
                        <div>
                             <p className="font-semibold">Terjadi Error</p>
                             <p className="text-sm">{error}</p>
                        </div>
                     </div>
                </div>
            )}
            
            <Button onClick={handleGenerate} className="w-full" disabled={isLoading || success}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Buat Super Admin Pertama'}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
                <p>Sudah punya akun? <Link href="/admin/login" className="underline">Login di sini</Link>.</p>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
