'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { Building, MenuSquare, UtensilsCrossed, Users, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DashboardStats {
    tenants: number;
    users: number;
    menus: number;
    orders: number;
}

export default function AdminDashboard() {
    const { user } = useUser();
    
    // Data fetching has been disabled to prevent permission errors.
    // Stats are now hardcoded to 0.
    const stats: DashboardStats = {
        tenants: 0,
        users: 0,
        menus: 0,
        orders: 0,
    };
    const loading = false;
    const error = null;

    const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: number | undefined, icon: React.ElementType, description: string }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <>
                        <div className="text-2xl font-bold">{value ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );


    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {user?.email || 'Admin'}!</p>
            </header>
            <main>
                 {error && !loading && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Data Fetching Error</AlertTitle>
                        <AlertDescription>
                           Could not load dashboard stats. This is likely a Firestore security rule issue.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                   <StatCard 
                        title="Total Tenants"
                        value={stats?.tenants}
                        icon={Building}
                        description="Data fetching disabled"
                   />
                   <StatCard 
                        title="Total Users"
                        value={stats?.users}
                        icon={Users}
                        description="Data fetching disabled"
                   />
                    <StatCard 
                        title="Total Menus"
                        value={stats?.menus}
                        icon={MenuSquare}
                        description="Data fetching disabled"
                   />
                   <StatCard 
                        title="Total Orders"
                        value={stats?.orders}
                        icon={UtensilsCrossed}
                        description="Data fetching disabled"
                   />
                </div>
                <div className="mt-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">No recent activity to display.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
