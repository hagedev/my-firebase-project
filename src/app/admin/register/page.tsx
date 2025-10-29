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
import { useAuth, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const firestore = useFirestore();

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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // Langkah 2: Buat dokumen peran di Firestore.
      const superAdminRef = doc(firestore, 'roles_superadmin', user.uid);
      const superAdminData = {
          userId: user.uid,
          email: user.email,
          role: 'superadmin',
          assignedAt: serverTimestamp(),
      };
      
      await setDoc(superAdminRef, superAdminData);

      toast({
        title: 'Pendaftaran Super Admin Berhasil',
        description: 'Akun dan peran telah dibuat. Mengarahkan ke dasbor...',
      });

      // Arahkan ke dasbor, AdminLayout akan memverifikasi dan memberikan akses.
      router.push('/admin/dashboard');

    } catch (error: any) {
      console.error('Pendaftaran atau pembuatan peran gagal:', error);
      
      // Jika email sudah ada, coba login sebagai gantinya.
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: 'Email Sudah Terdaftar',
          description: 'Mencoba untuk login dan memperbaiki status peran...',
        });
        try {
          // Coba login, AdminLayout akan menangani pembuatan dokumen jika belum ada
          await signInWithEmailAndPassword(auth, data.email, data.password);
          router.push('/admin/dashboard');
        } catch (loginError: any) {
          toast({
            variant: 'destructive',
            title: 'Login Gagal',
            description: 'Meskipun email terdaftar, login gagal. Periksa kembali kata sandi Anda.',
          });
        }
        setIsLoading(false);
        return;
      }
      
      let title = 'Pendaftaran Gagal';
      let description = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';

      if (error.name === 'FirebaseError' && error.code.includes('permission-denied')) {
        title = 'Pembuatan Peran Gagal';
        description = 'Gagal membuat dokumen peran di Firestore karena masalah izin. Periksa aturan keamanan Anda.';
        // Emit error untuk debugging jika ini terjadi
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `roles_superadmin/${auth.currentUser?.uid || 'unknown'}`,
            operation: 'create',
            requestResourceData: { email: data.email, role: 'superadmin' }
        }));
      }
      
      toast({
        variant: 'destructive',
        title: title,
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
              Buat akun super admin pertama untuk aplikasi. Akun ini memiliki hak akses tertinggi.
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
                 <p className="px-8 text-center text-sm text-muted-foreground">
                    Sudah punya akun?{" "}
                    <Link
                    href="/admin/login"
                    className="underline underline-offset-4 hover:text-primary"
                    >
                    Login di sini
                    </Link>
                    .
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
