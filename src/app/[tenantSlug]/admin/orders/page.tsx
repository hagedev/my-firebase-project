'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function TenantOrdersPage() {
    const params = useParams();
    const tenantSlug = params.tenantSlug as string;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Kelola Pesanan</CardTitle>
                    <CardDescription>Lihat dan kelola pesanan masuk untuk {tenantSlug}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Manajemen pesanan untuk {tenantSlug} akan diimplementasikan di sini.</p>
                </CardContent>
            </Card>
        </div>
    );
}
