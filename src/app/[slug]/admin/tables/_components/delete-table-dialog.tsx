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
import type { Table } from '@/lib/types';

interface DeleteTableDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  table: Table | null;
}

export function DeleteTableDialog({ isOpen, onOpenChange, table }: DeleteTableDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = async () => {
    if (!firestore || !table) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Data meja tidak ditemukan.',
      });
      return;
    }
    setIsDeleting(true);

    try {
      const tableDocRef = doc(firestore, `tenants/${table.tenantId}/tables`, table.id);
      await deleteDoc(tableDocRef);

      toast({
        title: 'Meja Berhasil Dihapus',
        description: `Meja nomor "${table.tableNumber}" telah dihapus.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Meja',
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
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus meja nomor{' '}
            <span className="font-semibold text-foreground">{table?.tableNumber}</span> secara permanen.
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
              'Ya, Hapus Meja'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
