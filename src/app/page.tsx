'use client';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 flex flex-col items-center gap-6 text-center">
            <h1 className="font-headline text-5xl md:text-7xl font-bold drop-shadow-lg">
                Selamat Datang
            </h1>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground drop-shadow-md">
                we are green!
            </p>
        </div>
    </main>
  );
}
