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
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Building,
  ClipboardList,
  Home,
  LogOut,
  MenuSquare,
  Settings,
  Table,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/tenants', label: 'Tenants', icon: Building },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/menus', label: 'Menus', icon: MenuSquare },
  { href: '/admin/categories', label: 'Categories', icon: ClipboardList },
  { href: '/admin/tables', label: 'Tables', icon: Table },
  { href: '/admin/orders', label: 'Orders', icon: UtensilsCrossed },
];

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/admin/login');
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="text-primary-foreground" />
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  href={item.href}
                  isActive={pathname === item.href}
                  as="a"
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarMenu className="p-2">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </Sidebar>
      <main className="flex-1">{children}</main>
    </SidebarProvider>
  );
}
