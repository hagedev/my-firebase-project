'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Category, Menu } from '@/lib/types';
import { MenuForm } from './menu-form';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc } from 'firebase/firestore';

interface AddMenuDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tenantId: string;
  categories: Category[];
}

export function AddMenuDialog({ isOpen, onOpenChange, tenantId, categories }: AddMenuDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddMenu = async (values: Omit<Menu, 'id'>) => {
    if (!firestore || !tenantId) return false;

    const menuCollectionRef = collection(firestore, `tenants/${tenantId}/menus`);
    try {
      await addDoc(menuCollectionRef, values);
      toast({
        title: 'Menu Ditambahkan',
        description: `"${values.name}" telah berhasil ditambahkan ke daftar menu.`,
      });
      return true; // Indicate success
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menambahkan Menu',
        description: error.message || 'Terjadi kesalahan pada server.',
      });
      return false; // Indicate failure
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Menu Baru</DialogTitle>
          <DialogDescription>
            Isi detail di bawah ini untuk menambahkan item menu baru ke kafe Anda.
          </DialogDescription>
        </DialogHeader>
        <MenuForm
          categories={categories}
          onSubmit={handleAddMenu}
          onSubmissionSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
