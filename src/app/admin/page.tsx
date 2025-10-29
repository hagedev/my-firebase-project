'use client';

import { useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // 1. Jangan lakukan apa-apa selagi status autentikasi masih loading.
    if (isUserLoading) {
      return; 
    }

    // 2. Setelah loading selesai, jika TIDAK ADA user, redirect paksa ke login.
    // Ini akan menangani kasus akses langsung ke URL atau sesi yang sudah berakhir.
    if (!user) {
      router.replace('/admin/login?error=unauthorized');
    }

    // Jika user ada, biarkan halaman dirender. Pengecekan peran super admin
    // sudah dilakukan secara tuntas di halaman login.
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        toast({
            title: 'Logout Berhasil',
            description: 'Anda telah keluar dari sesi super admin.',
        });
        // `useEffect` di atas akan otomatis mendeteksi perubahan `user` menjadi `null`
        // dan mengalihkan ke halaman login.
    } catch (error) {
        console.error("Logout error:", error)
        toast({
            variant: 'destructive',
            title: 'Logout Gagal',
            description: 'Terjadi kesalahan saat mencoba keluar.',
        });
    }
  };

  // Tampilkan layar loading untuk menunggu hasil pengecekan `useEffect`.
  // Ini adalah bagian krusial untuk mencegah "kedipan" konten atau redirect prematur.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  // Jika setelah loading selesai ternyata tidak ada user, useEffect sudah
  // memulai proses redirect. Return null untuk memastikan tidak ada
  // konten dashboard yang ter-render sebelum redirect selesai.
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
            <p className="text-sm text-muted-foreground mt-2">Email: {user.email}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
