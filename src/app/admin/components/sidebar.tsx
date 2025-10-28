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
  ClipboardList,
  Home,
  LogOut,
  MenuSquare,
  Table,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import Link from 'next/link';

const menuItems = [
  { href: '/admin', label: 'Dasbor', icon: Home },
  { href: '/admin/tenants', label: 'Tenant', icon: Building },
  { href: '/admin/users', label: 'Pengguna', icon: Users },
  { href: '/admin/menus', label: 'Menu', icon: MenuSquare },
  { href: '/admin/categories', label: 'Kategori', icon: ClipboardList },
  { href: '/admin/tables', label: 'Meja', icon: Table },
  { href: '/admin/orders', label: 'Pesanan', icon: UtensilsCrossed },
];

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  
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
