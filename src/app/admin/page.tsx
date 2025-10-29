'use client';

import { useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Tunggu sampai status loading user selesai
    if (isUserLoading) {
      return; // Jangan lakukan apa-apa selagi loading
    }

    // Setelah loading selesai, jika tidak ada user, redirect paksa
    if (!user) {
      router.replace('/admin/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    // Setelah logout, Firebase listener akan mendeteksi tidak ada user,
    // dan useEffect di atas akan menangani redirect ke halaman login.
  };

  // Tampilkan loading screen selama proses verifikasi user.
  // Ini adalah langkah krusial untuk mencegah "flash" konten yang salah.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  // Jika user tidak ada setelah loading (misal, karena sudah di-redirect oleh useEffect),
  // return null untuk memastikan tidak ada yang dirender sebelum redirect selesai.
  if (!user) {
    return null;
  }

  // Jika semua pengecekan lolos, tampilkan dashboard.
  return (
    <div className="flex min-h-screen flex-col bg-background">
       <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
        <h1 className="font-headline text-xl font-semibold">
          AirCafe Super Admin
        </h1>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Anda telah berhasil login sebagai super admin!</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
