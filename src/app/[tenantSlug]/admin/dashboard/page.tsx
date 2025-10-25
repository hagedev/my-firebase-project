'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/');
    };

    return (
        <div className="container mx-auto p-4">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button onClick={handleLogout} variant="outline">Logout</Button>
            </header>
            <main>
                <p>Welcome to the Super Admin Dashboard!</p>
            </main>
        </div>
    );
}
