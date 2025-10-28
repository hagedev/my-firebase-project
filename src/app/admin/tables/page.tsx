'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TablesPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Tables</CardTitle>
                    <CardDescription>View and manage all tables across all tenants.</CardDescription>
                </Header>
                <CardContent>
                    <p>Table management will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
