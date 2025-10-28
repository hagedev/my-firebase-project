'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Building,
  Home,
  LogOut,
  Users,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/firebase';
import Link from 'next/link';

export function SuperAdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();

  const menuItems = [
    { href: `/admin/dashboard`, label: 'Dasbor', icon: Home },
    { href: `/admin/tenants`, label: 'Tenant', icon: Building },
    { href: `/admin/users`, label: 'Pengguna', icon: Users },
  ];

  const handleLogout = async () => {
    await auth.signOut();
    // Navigasi akan ditangani oleh AdminLayout yang mendeteksi perubahan status auth
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} className="block">
                  <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={{children: item.label}}
                  >
                      <item.icon />
                      <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarMenu className="p-2 mt-auto">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip={{children: "Keluar"}}>
              <LogOut />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </Sidebar>
      <main className="flex-1">{children}</main>
    </SidebarProvider>
  );
}
