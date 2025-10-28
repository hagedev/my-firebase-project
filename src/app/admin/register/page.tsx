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
import { useAuth, useFirestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
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
    let userCredential;

    try {
      // 1. Buat pengguna di Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2. Gunakan batch write untuk membuat dokumen peran dan pengguna
      const batch = writeBatch(firestore);
      
      const userDocRef = doc(firestore, 'users', user.uid);
      batch.set(userDocRef, {
        email: user.email,
        role: 'superadmin',
        id: user.uid,
      });

      const roleDocRef = doc(firestore, 'roles_superadmin', user.uid);
      batch.set(roleDocRef, {
        userId: user.uid,
        assignedAt: serverTimestamp(),
      });

      // Commit the batch
      await batch.commit();
      
      // 3. Kirim email verifikasi
      await sendEmailVerification(user);

      toast({
        title: 'Pendaftaran Berhasil',
        description: 'Super admin dibuat. Silakan verifikasi email Anda lalu login.',
      });
      router.push('/admin/login');

    } catch (error: any) {
      // Jika terjadi error, hapus pengguna yang mungkin sudah terbuat di Auth
      if (userCredential) {
        await deleteUser(userCredential.user).catch(delErr => {
          console.error("Gagal menghapus pengguna setelah error registrasi:", delErr);
        });
      }

      console.error('Pendaftaran gagal:', error);
      let description = error.message || 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
      
      if (error.code === 'auth/email-already-in-use') {
        description = 'Email ini sudah digunakan. Silakan gunakan email lain.';
      } else if (error.code === 'permission-denied') {
        description = 'Tidak dapat membuat super admin. Kemungkinan super admin awal sudah ada atau aturan keamanan salah.';
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
            <CardTitle className="text-2xl">Super Admin Awal</CardTitle>
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
