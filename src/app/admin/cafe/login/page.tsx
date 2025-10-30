'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { useAuth, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Coffee, Loader2 } from 'lucide-react';
import type { Tenant, User } from '@/lib/types';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';

const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function CafeAdminLoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Layanan autentikasi tidak siap.' });
        return;
    }
    setIsSubmitting(true);
    
    let authUser;
    try {
      // 1. Authenticate user
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      authUser = userCredential.user;

      // 2. Fetch user profile from Firestore
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('authUid', '==', authUser.uid));
      const userQuerySnapshot = await getDocs(q);

      if (userQuerySnapshot.empty) {
        throw new Error('Profil user tidak ditemukan atau Anda bukan admin kafe.');
      }

      const userDocData = userQuerySnapshot.docs[0].data() as User;

      // 3. Check role and tenantId
      if (userDocData.role !== 'admin_kafe' || !userDocData.tenantId) {
         throw new Error('Anda tidak memiliki hak akses sebagai admin kafe.');
      }

      // 4. Fetch tenant slug using tenantId
      const tenantDocRef = doc(firestore, 'tenants', userDocData.tenantId);
      const tenantDoc = await getDoc(tenantDocRef);

      if (!tenantDoc.exists()) {
        throw new Error('Data kafe yang Anda kelola tidak ditemukan.');
      }
      const tenantData = tenantDoc.data() as Tenant;
      const slug = tenantData.slug;
      
      // 5. Redirect to the correct admin dashboard
      toast({
        title: 'Login Berhasil',
        description: `Selamat datang kembali, admin ${tenantData.name}.`,
      });
      router.replace(`/${slug}/admin`);

    } catch (error: any) {
      if (auth.currentUser) {
        await signOut(auth);
      }
      
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error instanceof FirebaseError) {
         if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = 'Email atau password yang Anda masukkan salah.';
        } else {
          description = `[${error.code}] ${error.message}`;
        }
      } else {
        description = error.message || description;
      }
      
      toast({ 
        variant: 'destructive', 
        title: 'Login Gagal', 
        description: description 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <Coffee className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-3xl">Login Admin Kafe</CardTitle>
          <CardDescription>Silakan masuk untuk mengelola kafe Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email.admin@kafe.com" {...field} disabled={isSubmitting} />
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
                      <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
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
             Bukan admin kafe?{' '}
            <Link href="/admin/login" className="underline">
              Login sebagai Super Admin
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}