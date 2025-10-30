'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Coffee, ShieldAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// UID Super Admin yang telah ditentukan.
const SUPER_ADMIN_UID = 'ttFbsVWt14cdTwVlKs1AbgBLUtx1';

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      // 1. AUTENTIKASI: Coba login dengan kredensial yang diberikan.
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. AUTORISASI: Bandingkan UID pengguna yang login dengan UID Super Admin.
      if (user.uid === SUPER_ADMIN_UID) {
        // 3. SUKSES: Pengguna adalah Super Admin. Alihkan ke dashboard.
        toast({
          title: 'Login Berhasil',
          description: 'Anda akan diarahkan ke dashboard super admin.',
        });
        router.replace('/admin/cafe-management');
        return; // Hentikan eksekusi lebih lanjut
      } else {
        // 4. GAGAL AUTORISASI: Kredensial benar, tapi bukan Super Admin.
        await signOut(auth); // Langsung logout pengguna ini.
        toast({
          variant: 'destructive',
          title: 'Akses Ditolak',
          description: 'Akun ini tidak memiliki hak akses super admin. Coba login sebagai admin kafe.',
        });
      }
    } catch (error: any) {
      // 5. GAGAL AUTENTIKASI: Tangani error dari Firebase Auth (misal: email/pass salah).
      let description = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
      if (error instanceof FirebaseError) {
          switch (error.code) {
              case 'auth/invalid-credential':
              case 'auth/user-not-found':
              case 'auth/wrong-password':
                  description = 'Email atau password yang Anda masukkan salah.';
                  break;
              case 'auth/too-many-requests':
                  description = 'Terlalu banyak percobaan login. Akun Anda ditangguhkan sementara. Coba lagi nanti.';
                  break;
              case 'auth/network-request-failed':
                  description = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
                  break;
              default:
                  description = `Terjadi kesalahan: [${error.code}]`;
                  break;
          }
      }
      
      toast({ 
        variant: 'destructive', 
        title: 'Login Gagal', 
        description: description 
      });
    } finally {
      // Apapun hasilnya (kecuali redirect sukses), loading dihentikan.
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <Coffee className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-3xl">AirCafe Super Admin</CardTitle>
          <CardDescription>Hanya untuk Super Admin. Silakan masuk.</CardDescription>
        </CardHeader>
        <CardContent>
          {errorParam === 'unauthorized' && (
            <Alert variant="destructive" className="mb-6">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Akses Ditolak</AlertTitle>
              <AlertDescription>Anda harus login sebagai Super Admin untuk mengakses halaman ini.</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>
          </Form>
           <div className="mt-4 text-center text-sm">
            Login sebagai admin kafe?{' '}
            <Link href="/admin/cafe/login" className="underline">
              Klik di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
