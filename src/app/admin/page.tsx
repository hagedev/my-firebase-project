'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, FirestorePermissionError, errorEmitter } from "@/firebase";
import { collection, collectionGroup, getDocs, Query } from "firebase/firestore";
import { Building, MenuSquare, UtensilsCrossed, Users, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DashboardStats {
    tenants: number;
    users: number;
    menus: number;
    orders: number;
}

// This is a more reliable way to get the path from a query, especially for collection groups.
function getQueryPath(q: Query): string {
    const internalQuery = (q as any)._query;
    if (internalQuery) {
        if (internalQuery.path) { // For regular collection queries
            return internalQuery.path.canonicalString ? internalQuery.path.canonicalString() : internal-Query.path.toString();
        }
        if (internalQuery.collectionGroup) { // For collectionGroup queries
            return `*/${internalQuery.collectionGroup}`;
        }
    }
    // Fallback if the internal structure changes, but this is much safer.
    return 'unknown_firestore_path';
}

export default function AdminDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            if (!firestore) return;
            setLoading(true);
            setError(null);

            try {
                const tenantsQuery = collection(firestore, 'tenants');
                const usersQuery = collection(firestore, 'users');
                const menusQuery = collectionGroup(firestore, 'menus');
                const ordersQuery = collectionGroup(firestore, 'orders');

                // Helper to wrap getDocs in a promise that emits contextual errors
                const createFetchPromise = (query: Query) => {
                    return getDocs(query).catch(err => {
                        // This block creates and throws our rich, contextual error.
                        const permissionError = new FirestorePermissionError({ 
                            path: getQueryPath(query), 
                            operation: 'list' 
                        });
                        // Emit for the global listener (Next.js error overlay)
                        errorEmitter.emit('permission-error', permissionError);
                        // Also throw it to be caught by our Promise.all catch block below
                        throw permissionError;
                    });
                };

                const [tenantsSnap, usersSnap, menusSnap, ordersSnap] = await Promise.all([
                    createFetchPromise(tenantsQuery),
                    createFetchPromise(usersQuery),
                    createFetchPromise(menusQuery),
                    createFetchPromise(ordersQuery),
                ]);

                const newStats: DashboardStats = {
                    tenants: tenantsSnap.size,
                    users: usersSnap.size,
                    menus: menusSnap.size,
                    orders: ordersSnap.size,
                };
                
                setStats(newStats);

            } catch (err: any) {
                // This will now catch the detailed FirestorePermissionError if thrown
                setError(err.message || "An error occurred while fetching dashboard stats.");
            } finally {
                setLoading(false);
            }
        };

        if (firestore) {
            fetchStats();
        }
    }, [firestore]);

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
                           Could not load dashboard stats. This is likely a Firestore security rule issue. The detailed error has been reported for debugging.
                           <pre className="mt-2 whitespace-pre-wrap text-xs">{error}</pre>
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                   <StatCard 
                        title="Total Tenants"
                        value={stats?.tenants}
                        icon={Building}
                        description="Jumlah kafe terdaftar"
                   />
                   <StatCard 
                        title="Total Users"
                        value={stats?.users}
                        icon={Users}
                        description="Termasuk admin kafe"
                   />
                    <StatCard 
                        title="Total Menus"
                        value={stats?.menus}
                        icon={MenuSquare}
                        description="Di semua tenant"
                   />
                   <StatCard 
                        title="Total Orders"
                        value={stats?.orders}
                        icon={UtensilsCrossed}
                        description="Di semua tenant"
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
