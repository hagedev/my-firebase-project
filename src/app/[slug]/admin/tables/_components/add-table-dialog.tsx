'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc } from 'firebase/firestore';
import type { Table } from '@/lib/types';
import { TableForm } from './table-form';

interface AddTableDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tenantId: string;
}

export function AddTableDialog({ isOpen, onOpenChange, tenantId }: AddTableDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddTable = async (values: Omit<Table, 'id' | 'tenantId' | 'status'>) => {
    if (!firestore || !tenantId) return false;

    const tableCollectionRef = collection(firestore, `tenants/${tenantId}/tables`);
    try {
      const newTable = { 
          ...values, 
          tenantId: tenantId,
          status: 'available' as const
      };
      await addDoc(tableCollectionRef, newTable);
      toast({
        title: 'Meja Ditambahkan',
        description: `Meja nomor "${values.tableNumber}" telah berhasil ditambahkan.`,
      });
      return true; // Indicate success
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menambahkan Meja',
        description: error.message || 'Terjadi kesalahan pada server.',
      });
      return false; // Indicate failure
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Meja Baru</DialogTitle>
          <DialogDescription>
            Masukkan nomor meja untuk ditambahkan ke daftar.
          </DialogDescription>
        </DialogHeader>
        <TableForm
          onSubmit={handleAddTable}
          onSubmissionSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
