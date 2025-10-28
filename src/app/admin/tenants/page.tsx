'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TenantsPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Tenants</CardTitle>
                    <CardDescription>View, create, and manage your cafe tenants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Tenant management will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
