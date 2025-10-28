'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function TenantTablesPage() {
    const params = useParams();
    const tenantSlug = params.tenantSlug as string;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Tables</CardTitle>
                    <CardDescription>View, create, and manage your tables for {tenantSlug}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Table management for {tenantSlug} will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
