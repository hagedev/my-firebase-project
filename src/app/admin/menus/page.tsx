'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MenusPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Menus</CardTitle>
                    <CardDescription>View and manage all menu items across all tenants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Menu management will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
