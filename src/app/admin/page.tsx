'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore } from "@/firebase";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { Building, MenuSquare, UtensilsCrossed, Users, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardStats {
    tenants: number;
    users: number;
    menus: number;
    orders: number;
}

export default function AdminDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!firestore) return;

            try {
                const tenantsCollection = collection(firestore, 'tenants');
                const usersCollection = collection(firestore, 'users');
                const menusCollectionGroup = collectionGroup(firestore, 'menus');
                const ordersCollectionGroup = collectionGroup(firestore, 'orders');

                const [tenantsSnap, usersSnap, menusSnap, ordersSnap] = await Promise.all([
                    getDocs(tenantsCollection),
                    getDocs(usersCollection),
                    getDocs(menusCollectionGroup),
                    getDocs(ordersCollectionGroup)
                ]);

                setStats({
                    tenants: tenantsSnap.size,
                    users: usersSnap.size,
                    menus: menusSnap.size,
                    orders: ordersSnap.size,
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
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
