'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Tenant, User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CafeAdminDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // State untuk menyimpan data tenant
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Jangan lakukan apapun jika loading user atau firestore belum siap
    if (isUserLoading || !firestore) {
        return;
    }

    // Jika tidak ada user setelah loading selesai, redirect ke login
    if (!user) {
        router.replace('/admin/cafe/login');
        return;
    }
    
    // User ada, mari kita verifikasi lebih lanjut
    const verifyUserAndTenant = async () => {
      try {
        // Ambil data user dari koleksi 'users'
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          throw new Error('Profil user tidak ditemukan.');
        }

        const appUser = userDocSnap.data() as AppUser;

        // Pastikan user adalah admin kafe dan punya tenantId
        if (appUser.role !== 'admin_kafe' || !appUser.tenantId) {
          throw new Error('Anda tidak memiliki hak akses sebagai admin kafe.');
        }
        
        // Ambil data tenant berdasarkan tenantId dari profil user
        const tenantDocRef = doc(firestore, 'tenants', appUser.tenantId);
        const tenantDocSnap = await getDoc(tenantDocRef);

        if (!tenantDocSnap.exists()) {
            throw new Error('Kafe yang Anda kelola tidak ditemukan.');
        }

        const tenantData = { id: tenantDocSnap.id, ...tenantDocSnap.data() } as Tenant;

        // Validasi paling penting: cocokan slug dari URL dengan slug dari database
        if (tenantData.slug !== slug) {
            throw new Error('Anda tidak berwenang mengakses dasbor kafe ini.');
        }

        // Jika semua valid, simpan data tenant dan matikan loading
        setTenant(tenantData);

      } catch (e: any) {
        console.error("Verification error:", e);
        setError(e.message || 'Terjadi kesalahan saat verifikasi.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyUserAndTenant();

  }, [user, isUserLoading, firestore, slug, router]);

  if (isLoading || isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-center">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-destructive">{error}</p>
            <button onClick={() => router.push('/admin/cafe/login')} className="mt-4 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 py-2 px-4 rounded-md">
              Kembali ke Halaman Login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center">
            <h1 className="font-headline text-4xl md:text-5xl font-bold">
                Selamat Datang, {user?.email}!
            </h1>
            <p className="mt-2 text-xl md:text-2xl text-muted-foreground">
                Anda berada di dashboard admin kafe <span className="font-semibold text-primary">{tenant?.name}</span>.
            </p>
        </div>
    </main>
  );
}
