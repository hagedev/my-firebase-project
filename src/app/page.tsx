'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Coffee, ShieldCheck } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Logo from '@/components/Logo';

export default function Home() {
  const heroImage = PlaceHolderImages.find((p) => p.id === 'hero-background');

  return (
    <main className="flex-1 flex flex-col">
      <header className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="container mx-auto flex items-center justify-between">
          <Logo />
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/admin/login">Admin Login</Link>
          </Button>
        </div>
      </header>

      <div className="relative flex-1 flex items-center justify-center text-center text-white">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover -z-10"
            quality={100}
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/60 -z-10"></div>

        <div className="container mx-auto px-4 flex flex-col items-center gap-6">
          <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
            Welcome to AirCafe
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-white/90 drop-shadow-md">
            The seamless digital ordering experience your customers deserve.
            Modern, efficient, and secure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              asChild
            >
              <Link href="/air-cafe-demo/meja/5">
                <Coffee className="mr-2" />
                View Demo Menu
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/admin/register">
                <ShieldCheck className="mr-2" />
                Create Super Admin
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <footer className="bg-background border-t">
        <div className="container mx-auto py-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AirCafe. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
