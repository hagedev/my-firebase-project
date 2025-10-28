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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Logo from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const registerSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
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
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      try {
        // 2. Create documents in Firestore to assign role
        const userDocRef = doc(firestore, 'users', user.uid);
        const roleDocRef = doc(firestore, 'roles_superadmin', user.uid);

        // This should be a transaction, but for simplicity we do it sequentially.
        // The security rules should prevent inconsistent states.
        await setDoc(userDocRef, {
          email: user.email,
          role: 'superadmin',
          id: user.uid,
        });

        await setDoc(roleDocRef, {
          userId: user.uid,
          assignedAt: serverTimestamp(),
        });

        await sendEmailVerification(user);

        toast({
          title: 'Registration Successful',
          description:
            'Super admin created. Please verify your email and then log in.',
        });
        router.push('/admin/login');
      } catch (firestoreError: any) {
        // If Firestore fails, rollback Auth user creation
        await deleteUser(user);
        throw firestoreError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      let description =
        error.message || 'An unknown error occurred. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        description =
          'This email is already in use. Please use a different email.';
      } else if (error.code === 'permission-denied') {
        description =
          'Cannot create super admin. An initial super admin may already exist.';
      }
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
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
            <CardTitle className="text-2xl">Initial Super Admin</CardTitle>
            <CardDescription>
              Create the first super admin account for the application. This can
              only be done once.
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
                      <FormLabel>Password</FormLabel>
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
                      <FormLabel>Confirm Password</FormLabel>
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
                    'Create Super Admin'
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
