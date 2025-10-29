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
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Coffee, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const loginSchema = z.object({
  email: z
    .string()
    .email({ message: 'Format email tidak valid.' })
    .min(1, { message: 'Email tidak boleh kosong.' }),
  password: z
    .string()
    .min(6, { message: 'Password minimal 6 karakter.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // 1. Coba login dengan email dan password
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. Jika login berhasil, cek peran di Firestore
      const roleRef = doc(firestore, `roles_superadmin/${user.uid}`);
      const roleDoc = await getDoc(roleRef);

      // 3. Jika dokumen peran ada, dia adalah super admin
      if (roleDoc.exists()) {
        toast({
          title: 'Login Berhasil',
          description: 'Anda akan diarahkan ke dashboard.',
        });
        // 4. Alihkan ke dashboard
        router.replace('/admin');
      } else {
        // Jika dokumen peran tidak ada, tolak akses dan logout
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Akses Ditolak',
          description: 'Akun Anda tidak memiliki hak akses super admin.',
        });
      }

    } catch (error: any) {
      console.error('Login Error:', error);
      let description = 'Terjadi kesalahan saat login.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Email atau password yang Anda masukkan salah.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: description,
      });
    } finally {
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
          <CardDescription>
            Silakan masuk untuk mengelola sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorParam === 'unauthorized' && (
            <Alert variant="destructive" className="mb-6">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Akses Ditolak</AlertTitle>
              <AlertDescription>
                Anda tidak memiliki hak akses untuk halaman ini. Silakan masuk dengan akun super admin.
              </AlertDescription>
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
                      <Input
                        placeholder="email@example.com"
                        {...field}
                        disabled={isLoading}
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
