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
import { useAuth, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function SuperAdminRegisterPage() {
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
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. Create the role document in Firestore
      const superAdminData = {
        email: user.email,
        role: 'superadmin',
        uid: user.uid,
      };
      const superAdminRef = doc(firestore, `roles_superadmin/${user.uid}`);

      // Attempt to set the document. This is now allowed by the new security rules.
      await setDoc(superAdminRef, superAdminData);

      // 3. If both succeed, show success and redirect
      toast({
          title: 'Pendaftaran Berhasil',
          description: 'Akun super admin telah dibuat. Anda akan diarahkan ke dasbor.',
      });
      router.push(`/admin`);

    } catch (error: any) {
        // This single catch block handles both Auth and Firestore errors
        console.error("Super Admin Registration Failed:", error);
        
        let description = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
        
        // Handle Auth errors
        if (error.code === 'auth/email-already-in-use') {
            description = 'Email ini sudah digunakan. Coba login atau gunakan email lain.';
        } else if (error.message.includes('permission-denied') || error.name === 'FirebaseError') {
             // Handle potential Firestore errors (though rules should now allow it)
            description = 'Gagal memberikan peran super admin karena masalah izin. Pastikan aturan keamanan sudah benar.';
            // Rollback user creation if role assignment fails
            if (auth.currentUser) {
                try {
                    await deleteUser(auth.currentUser);
                    description += ' Pembuatan pengguna telah dibatalkan.';
                } catch (deleteError) {
                    console.error("Failed to rollback user creation:", deleteError);
                    description += ' Gagal membatalkan pembuatan pengguna, mohon hapus manual.';
                }
            }
        } else {
            description = error.message;
        }

        toast({
            variant: 'destructive',
            title: 'Pendaftaran Gagal',
            description: description,
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
            <CardTitle className="text-2xl">Buat Akun Super Admin</CardTitle>
            <CardDescription>Buat akun super admin pertama untuk AirCafe.</CardDescription>
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Buat Akun'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
