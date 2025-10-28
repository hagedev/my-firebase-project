'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Users</CardTitle>
                    <CardDescription>View and manage all users across all tenants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>User management will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
