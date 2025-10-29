'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, errorEmitter } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email({ message: 'Alamat email tidak valid.' }),
  password: z.string().min(6, { message: 'Kata sandi minimal harus 6 karakter.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function SuperAdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const superAdminCollectionRef = collection(firestore, 'roles_superadmin');
    const q = query(superAdminCollectionRef, limit(1));

    try {
      const snapshot = await getDocs(q).catch(serverError => {
        // Implementasi contextual error handling
        const permissionError = new FirestorePermissionError({
            path: superAdminCollectionRef.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Lemparkan kembali error untuk ditangkap oleh blok catch utama
        throw permissionError;
      });
      
      const isSystemEmpty = snapshot.empty;

      if (isSystemEmpty) {
        // SCENARIO 1: Belum ada super admin, buat pengguna baru.
        toast({
          title: 'Membuat Super Admin Pertama',
          description: 'Sistem kosong, akun Anda akan dibuat sebagai super admin pertama.',
        });
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        // Setelah berhasil, AdminLayout akan mengambil alih untuk membuat dokumen peran.
        router.push('/admin/dashboard');
      } else {
        // SCENARIO 2: Sudah ada super admin, lakukan login biasa.
        await signInWithEmailAndPassword(auth, data.email, data.password);
        // AdminLayout akan menangani verifikasi peran dan pengalihan.
        toast({
          title: 'Login Berhasil',
          description: 'Mengarahkan ke dasbor...',
        });
        router.push('/admin/dashboard');
      }
    } catch (error: any) {
      // Jangan tampilkan toast untuk FirestorePermissionError karena sudah ditangani secara global
      if (error instanceof FirestorePermissionError) {
        // Biarkan FirebaseErrorListener yang menanganinya
        return;
      }

      console.error('Proses login/registrasi gagal:', error);

      let description = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = 'Email atau kata sandi yang Anda masukkan salah.';
      } else if (error.code === 'auth/email-already-in-use') {
        description = 'Email ini sudah terdaftar. Silakan coba login.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Operasi Gagal',
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
                <Logo className="text-foreground" />
            </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login Super Admin</CardTitle>
            <CardDescription>Masukkan kredensial Anda. Jika ini login pertama, akun super admin akan dibuat.</CardDescription>
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
                        <Input placeholder="superadmin@air.cafe" {...field} />
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
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login atau Buat Akun'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
