'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const registerSchema = z
  .object({
    email: z.string().email({ message: 'Alamat email tidak valid.' }),
    password: z
      .string()
      .min(8, { message: 'Kata sandi minimal harus 8 karakter.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata sandi tidak cocok.",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterSuperAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      // Langkah 1: Buat pengguna di Firebase Auth.
      // Ini mungkin gagal jika email sudah digunakan atau jika aturan menolak.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Langkah 2: Langsung login dengan pengguna baru.
      // Ini penting agar klien memiliki token auth untuk langkah selanjutnya di AdminLayout.
      await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      toast({
        title: 'Pendaftaran Berhasil',
        description: 'Login berhasil, memverifikasi peran & mengarahkan ke dasbor...',
      });

      // AdminLayout akan menangani pembuatan dokumen Firestore dan pengalihan akhir.
      // Kita cukup arahkan ke root admin, dan layout akan mengambil alih.
      router.push('/admin/dashboard');

    } catch (error: any) {
      console.error('Pendaftaran atau login gagal:', error);
      let description = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
      
      if (error.code === 'auth/email-already-in-use') {
        description = 'Email ini sudah digunakan. Silakan gunakan email lain atau coba login jika Anda sudah mendaftar.';
      } else if (error.code === 'permission-denied') {
        // Ini bisa terjadi jika aturan keamanan menolak pembuatan pengguna,
        // meskipun untuk Auth, ini lebih jarang. Kemungkinan besar ini terjadi
        // karena super admin sudah ada.
        description = 'Gagal membuat pengguna. Kemungkinan super admin awal sudah ada.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Pendaftaran Gagal',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Pendaftaran Super Admin</CardTitle>
            <CardDescription>
              Buat akun super admin pertama untuk aplikasi. Ini hanya dapat dilakukan sekali.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="superadmin@air.cafe"
                          {...field}
                          autoComplete="email"
                        />
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
                      <FormLabel>Kata Sandi</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konfirmasi Kata Sandi</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Buat Super Admin'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
