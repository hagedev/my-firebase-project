'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
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
import { Coffee, Loader2, ShieldX } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';

const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function CafeAdminLoginPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const auth = useAuth();
  const firestore = useFirestore();

  useEffect(() => {
    if (!slug || !firestore) {
        setIsLoading(false);
        return;
    };

    const findTenantBySlug = async () => {
      try {
        const tenantsRef = collection(firestore, 'tenants');
        const q = query(tenantsRef, where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setTenant(null);
        } else {
          // Assuming slug is unique, take the first result
          const tenantDoc = querySnapshot.docs[0];
          setTenant({ id: tenantDoc.id, ...tenantDoc.data() } as Tenant);
        }
      } catch (error: any) {
        // This is a public read, if it fails, it's likely a config or network issue
        // not a security rule issue, as tenants are public.
        console.error('Error fetching tenant:', error);
        setTenant(null);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Gagal memuat data kafe.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    findTenantBySlug();
  }, [slug, firestore, toast]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth || !firestore || !tenant) {
        toast({ variant: 'destructive', title: 'Error', description: 'Layanan tidak siap.' });
        return;
    }
    setIsSubmitting(true);
    
    let authUser;
    try {
      // 1. Authenticate user
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      authUser = userCredential.user;

      // 2. Authorize user: Fetch user profile from Firestore
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('authUid', '==', authUser.uid));
      const userQuerySnapshot = await getDocs(q);

      if (userQuerySnapshot.empty) {
        throw new Error('Profil user tidak ditemukan.');
      }

      const userDoc = userQuerySnapshot.docs[0].data();

      // 3. Check role and tenant match
      if (userDoc.role === 'admin_kafe' && userDoc.tenantId === tenant.id) {
        toast({
          title: 'Login Berhasil',
          description: `Selamat datang, admin ${tenant.name}.`,
        });
        // Redirect to cafe admin dashboard (we'll create this next)
        router.replace(`/${slug}/admin`);
      } else {
         throw new Error('Anda tidak memiliki hak akses untuk kafe ini.');
      }

    } catch (error: any) {
       // Sign out the user if any authorization step fails after a successful login
      if (auth.currentUser) {
        await signOut(auth);
      }
      
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error instanceof FirebaseError && error.code.startsWith('auth/')) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = 'Email atau password yang Anda masukkan salah.';
        } else {
          description = error.message || description;
        }
      } else if (error instanceof FirebaseError && error.message.includes('permission-denied')) {
        // This is a Firestore permission error
        const permissionError = new FirestorePermissionError({
          path: 'users',
          operation: 'list'
        });
        errorEmitter.emit('permission-error', permissionError);
        // The listener will throw, so this toast might not be seen, which is ok.
        description = 'Akses ditolak oleh aturan keamanan.';
      }
      else {
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

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Mencari data kafe...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-destructive rounded-full p-3 w-fit mb-4">
                        <ShieldX className="h-8 w-8 text-destructive-foreground" />
                    </div>
                    <CardTitle className="font-headline text-3xl">Kafe Tidak Ditemukan</CardTitle>
                    <CardDescription>
                        URL yang Anda akses tidak valid atau kafe tidak terdaftar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/admin/login">Kembali ke Login Super Admin</Link>
                    </Button>
                </CardContent>
            </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <Coffee className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-3xl">Admin {tenant.name}</CardTitle>
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
                {isSubmitting ? 'Memverifikasi...' : 'Masuk'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
