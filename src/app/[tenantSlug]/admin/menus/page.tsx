'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function TenantMenusPage() {
    const params = useParams();
    const tenantSlug = params.tenantSlug as string;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Kelola Menu</CardTitle>
                    <CardDescription>Lihat, buat, dan kelola item menu Anda untuk {tenantSlug}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Manajemen menu untuk {tenantSlug} akan diimplementasikan di sini.</p>
                </CardContent>
            </Card>
        </div>
    );
}
