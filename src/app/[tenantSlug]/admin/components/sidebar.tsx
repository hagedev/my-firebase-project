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
  ClipboardList,
  Home,
  LogOut,
  MenuSquare,
  Table,
  UtensilsCrossed,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/firebase';
import Link from 'next/link';

export function TenantAdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const auth = useAuth();
  const tenantSlug = params.tenantSlug as string;

  const menuItems = [
    { href: `/${tenantSlug}/admin/dashboard`, label: 'Dasbor', icon: Home },
    { href: `/${tenantSlug}/admin/menus`, label: 'Menu', icon: MenuSquare },
    { href: `/${tenantSlug}/admin/categories`, label: 'Kategori', icon: ClipboardList },
    { href: `/${tenantSlug}/admin/tables`, label: 'Meja', icon: Table },
    { href: `/${tenantSlug}/admin/orders`, label: 'Pesanan', icon: UtensilsCrossed },
  ];

  const handleLogout = async () => {
    await auth.signOut();
    // Navigasi akan ditangani oleh TenantAdminLayout yang mendeteksi perubahan status auth
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
