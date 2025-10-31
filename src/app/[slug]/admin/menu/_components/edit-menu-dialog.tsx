'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Menu } from '@/lib/types';
import { MenuForm } from './menu-form';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';

interface EditMenuDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  menu: Menu;
}

export function EditMenuDialog({ isOpen, onOpenChange, menu }: EditMenuDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleEditMenu = async (values: Omit<Menu, 'id' | 'tenantId'>) => {
    if (!firestore || !menu) return false;

    const menuDocRef = doc(firestore, `tenants/${menu.tenantId}/menus`, menu.id);
    try {
      await updateDoc(menuDocRef, values);
      toast({
        title: 'Menu Diperbarui',
        description: `"${values.name}" telah berhasil diperbarui.`,
      });
      return true; // Indicate success
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui Menu',
        description: error.message || 'Terjadi kesalahan pada server.',
      });
      return false; // Indicate failure
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Menu</DialogTitle>
          <DialogDescription>
            Ubah detail di bawah ini untuk item menu Anda.
          </DialogDescription>
        </DialogHeader>
        <MenuForm
          initialData={menu}
          onSubmit={handleEditMenu}
          onSubmissionSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
