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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Menu } from '@/lib/types';

interface DeleteMenuDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  menu: Menu | null;
}

export function DeleteMenuDialog({ isOpen, onOpenChange, menu }: DeleteMenuDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = async () => {
    if (!firestore || !menu) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Data menu tidak ditemukan.',
      });
      return;
    }
    setIsDeleting(true);

    try {
      const menuDocRef = doc(firestore, `tenants/${menu.tenantId}/menus`, menu.id);
      await deleteDoc(menuDocRef);

      toast({
        title: 'Menu Berhasil Dihapus',
        description: `Menu "${menu.name}" telah dihapus.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Menu',
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
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus item menu{' '}
            <span className="font-semibold text-foreground">{menu?.name}</span> secara permanen.
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
              'Ya, Hapus Menu'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
