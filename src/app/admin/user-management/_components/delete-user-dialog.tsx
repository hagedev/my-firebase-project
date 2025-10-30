'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { User as AppUser } from '@/lib/types';
import { FirebaseError } from 'firebase/app';

interface DeleteUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: AppUser;
}

export function DeleteUserDialog({ isOpen, onOpenChange, user }: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Data tidak lengkap untuk menghapus user.',
      });
      return;
    }
    setIsDeleting(true);

    try {
      const userDocRef = doc(firestore, 'users', user.id);
      await deleteDoc(userDocRef);

      toast({
        title: 'User Berhasil Dihapus',
        description: `Data user ${user.email} telah dihapus dari database. Operasi ini tidak menghapus akun autentikasi user.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        const contextualError = new FirestorePermissionError({
            operation: 'delete',
            path: `users/${user.id}`,
        });
        errorEmitter.emit('permission-error', contextualError);
        // We let the global error handler manage the UI feedback
      } else {
         toast({
            variant: 'destructive',
            title: 'Gagal Menghapus User',
            description: error.message || 'Terjadi kesalahan pada server.',
         });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan menghapus data user <span className="font-semibold text-foreground">{user?.email}</span> secara permanen dari database.
            Operasi ini <span className="font-bold">tidak menghapus akun autentikasi user</span>, hanya data profilnya di Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              'Ya, Hapus Data User'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
