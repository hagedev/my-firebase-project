'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function TenantCategoriesPage() {
    const params = useParams();
    const tenantSlug = params.tenantSlug as string;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Categories</CardTitle>
                    <CardDescription>View, create, and manage your menu categories for {tenantSlug}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Category management for {tenantSlug} will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
