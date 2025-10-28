'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query } from 'firebase/firestore';
import { Building, MenuSquare, UtensilsCrossed, Users, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Tenant, User, MenuItem, Order } from '@/lib/types';


const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string, value: number, icon: React.ElementType, description: string, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                <>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                </>
            )}
        </CardContent>
    </Card>
);

export default function AdminDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();

    const tenantsQuery = useMemoFirebase(() => query(collection(firestore, 'tenants')), [firestore]);
    const { data: tenants, isLoading: loadingTenants, error: tenantsError } = useCollection<Tenant>(tenantsQuery);

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: users, isLoading: loadingUsers, error: usersError } = useCollection<User>(usersQuery);

    const menusQuery = useMemoFirebase(() => tenants && query(collection(firestore, `tenants/${tenants[0]?.id}/menus`)), [tenants, firestore]);
    const { data: menus, isLoading: loadingMenus, error: menusError } = useCollection<MenuItem>(menusQuery);

    const ordersQuery = useMemoFirebase(() => tenants && query(collection(firestore, `tenants/${tenants[0]?.id}/orders`)), [tenants, firestore]);
    const { data: orders, isLoading: loadingOrders, error: ordersError } = useCollection<Order>(ordersQuery);

    const isLoading = loadingTenants || loadingUsers || loadingMenus || loadingOrders;
    const error = tenantsError || usersError || menusError || ordersError;

    const stats = useMemo(() => {
        // Note: This is a simplified aggregation. For large scale apps, this should be done with cloud functions.
        // We are only fetching from the first tenant for menus/orders as a sample.
        return {
            tenants: tenants?.length ?? 0,
            users: users?.length ?? 0,
            menus: menus?.length ?? 0,
            orders: orders?.length ?? 0,
        };
    }, [tenants, users, menus, orders]);


    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Dasbor Super Admin</h1>
                <p className="text-muted-foreground">Selamat datang kembali, {user?.email || 'Admin'}!</p>
            </header>
            <main>
                 {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Gagal Memuat Data Dasbor</AlertTitle>
                        <AlertDescription>
                           Terjadi kesalahan saat memuat statistik. Ini mungkin karena masalah aturan keamanan Firestore. Pastikan super admin memiliki izin 'list' pada koleksi tenants, users, menus, dan orders.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                   <StatCard 
                        title="Total Tenant"
                        value={stats.tenants}
                        icon={Building}
                        description="Jumlah kafe terdaftar"
                        isLoading={loadingTenants}
                   />
                   <StatCard 
                        title="Total Pengguna"
                        value={stats.users}
                        icon={Users}
                        description="Admin kafe & super admin"
                        isLoading={loadingUsers}
                   />
                    <StatCard 
                        title="Total Menu"
                        value={stats.menus}
                        icon={MenuSquare}
                        description="Menu di tenant pertama"
                        isLoading={loadingMenus}
                   />
                   <StatCard 
                        title="Total Pesanan"
                        value={stats.orders}
                        icon={UtensilsCrossed}
                        description="Pesanan di tenant pertama"
                        isLoading={loadingOrders}
                   />
                </div>
                <div className="mt-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Aktivitas Terkini</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Tidak ada aktivitas terkini untuk ditampilkan.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
