
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Boxes,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ['Admin', 'Manager', 'Sales', 'Designer'] },
    { href: "/orders", icon: Package, label: "Orders", roles: ['Admin', 'Manager', 'Sales', 'Designer'] },
    { href: "/customers", icon: Users, label: "Customers", roles: ['Admin', 'Manager', 'Sales'] },
    { href: "/users", icon: ShieldCheck, label: "Users", roles: ['Admin'] },
    { href: "/settings", icon: Settings, label: "Settings", roles: ['Admin', 'Manager', 'Sales', 'Designer'] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, role } = useUser();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(role || ''));

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 p-2">
          <Boxes className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <h2 className="font-headline text-lg font-semibold text-sidebar-foreground">
              OrderFlow
            </h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
