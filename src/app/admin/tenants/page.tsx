'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminTenantsPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Kelola Tenant</CardTitle>
                    <CardDescription>Lihat, buat, dan kelola tenant kafe.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Manajemen tenant akan diimplementasikan di sini.</p>
                </CardContent>
            </Card>
        </div>
    );
}
