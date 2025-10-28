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
                <h1 className="text-3xl font-bold">Dasbor Super Admin</h1>
                <p className="text-muted-foreground">Selamat datang kembali, {user?.email || 'Admin'}!</p>
            </header>
            <main>
                 {error && !loading && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Gagal Memuat Data</AlertTitle>
                        <AlertDescription>
                           Tidak dapat memuat statistik dasbor. Ini kemungkinan besar masalah aturan keamanan Firestore.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                   <StatCard 
                        title="Total Tenant"
                        value={stats?.tenants}
                        icon={Building}
                        description="Pengambilan data dinonaktifkan"
                   />
                   <StatCard 
                        title="Total Pengguna"
                        value={stats?.users}
                        icon={Users}
                        description="Pengambilan data dinonaktifkan"
                   />
                    <StatCard 
                        title="Total Menu"
                        value={stats?.menus}
                        icon={MenuSquare}
                        description="Pengambilan data dinonaktifkan"
                   />
                   <StatCard 
                        title="Total Pesanan"
                        value={stats?.orders}
                        icon={UtensilsCrossed}
                        description="Pengambilan data dinonaktifkan"
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
