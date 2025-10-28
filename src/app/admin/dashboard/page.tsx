'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building, Users } from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const { user } = useUser();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Dasbor Super Admin</h1>
        <p className="text-muted-foreground">
          Selamat datang kembali, {user?.email || 'Admin'}. Kelola seluruh sistem dari sini.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              <span>Manajemen Tenant</span>
            </CardTitle>
            <CardDescription>
              Buat, lihat, dan kelola semua tenant kafe yang terdaftar di platform AirCafe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/tenants">Buka Manajemen Tenant</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Manajemen Pengguna</span>
            </CardTitle>
            <CardDescription>
              Lihat dan kelola semua akun pengguna, termasuk admin kafe dan pengguna lainnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/users">Buka Manajemen Pengguna</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
