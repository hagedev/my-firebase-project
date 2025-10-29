'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';


export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    // Setelah logout, arahkan kembali ke halaman login.
    // Menggunakan replace agar riwayat navigasi dashboard dihapus.
    router.replace('/admin/login');
  };

  // Selama proses verifikasi user, tampilkan layar loading.
  // Ini memberi waktu bagi aplikasi untuk memuat semua data yang dibutuhkan.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  // Jika user tidak ada setelah loading selesai (misal, akses langsung),
  // layout akan meng-handle redirect, tapi kita bisa return null untuk mencegah flash content.
  if (!user) {
    return null;
  }

  // Setelah loading selesai dan user terverifikasi, tampilkan dashboard.
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
