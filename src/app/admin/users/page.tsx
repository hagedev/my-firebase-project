'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminUsersPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Kelola Pengguna</CardTitle>
                    <CardDescription>Lihat, buat, dan kelola semua pengguna.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Manajemen pengguna akan diimplementasikan di sini.</p>
                </CardContent>
            </Card>
        </div>
    );
}
