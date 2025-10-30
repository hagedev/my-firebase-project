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
import { useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Tenant } from '@/lib/types';

interface DeleteCafeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cafe: Tenant;
}

export function DeleteCafeDialog({ isOpen, onOpenChange, cafe }: DeleteCafeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = async () => {
    if (!firestore || !cafe) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore tidak terinisialisasi atau data kafe tidak ditemukan.',
      });
      return;
    }
    setIsDeleting(true);

    try {
      const cafeDocRef = doc(firestore, 'tenants', cafe.id);
      await deleteDoc(cafeDocRef);

      toast({
        title: 'Kafe Berhasil Dihapus',
        description: `Kafe "${cafe.name}" telah dihapus dari sistem.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Kafe',
        description: error.message || 'Terjadi kesalahan pada server.',
      });
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
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus kafe{' '}
            <span className="font-semibold text-foreground">{cafe?.name}</span> secara permanen.
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
              'Ya, Hapus Kafe'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
