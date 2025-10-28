'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";
import { useRouter, useParams } from "next/navigation";

export default function TenantAdminDashboard() {
    const auth = useAuth();
    const router = useRouter();
    const params = useParams();
    const tenantSlug = params.tenantSlug as string;


    const handleLogout = async () => {
        await auth.signOut();
        router.push(`/${tenantSlug}/admin/login`);
    };

    return (
        <div className="container mx-auto p-4">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Dasbor Admin Tenant</h1>
                <Button onClick={handleLogout} variant="outline">Keluar</Button>
            </header>
            <main>
                <p>Selamat datang di Dasbor Admin Tenant untuk {tenantSlug}!</p>
            </main>
        </div>
    );
}
