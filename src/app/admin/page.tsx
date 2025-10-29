'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';


export default function AdminDashboardPage() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

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
            <CardTitle>Redirect Berhasil!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Selamat datang di Dashboard, {user?.email}.</p>
            <p>Halaman ini masih kosong. Kita akan mengisinya nanti.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
