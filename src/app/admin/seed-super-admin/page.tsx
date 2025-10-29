'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SeedSuperAdminPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Seed Super Admin</CardTitle>
            <CardDescription>
                Halaman ini dimaksudkan untuk seeding manual data super admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
             <Button variant="outline" asChild>
                <Link href="/admin/login">Kembali ke Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
