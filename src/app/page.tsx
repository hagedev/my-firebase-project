'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 flex flex-col items-center gap-8 text-center">
            <div className="flex flex-col items-center gap-4">
                <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                    Selamat Datang
                </h1>
                <p className="max-w-2xl text-lg md:text-xl text-muted-foreground drop-shadow-md">
                    we are green!
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link href="/admin/login" passHref>
                    <Button variant="outline">Login Super Admin</Button>
                </Link>
                <Link href="/admin/cafe/login" passHref>
                    <Button>Login Admin Kafe</Button>
                </Link>
            </div>
        </div>
    </main>
  );
}
