'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminUsersPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Users</CardTitle>
                    <CardDescription>View, create, and manage all users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>User management will be implemented here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
