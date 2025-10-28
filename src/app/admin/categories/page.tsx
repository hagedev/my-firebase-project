'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CategoriesPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Categories</CardTitle>
                    <CardDescription>View and manage all menu categories across all tenants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Category management will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
