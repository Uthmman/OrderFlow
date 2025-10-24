
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

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/orders", icon: Package, label: "Orders" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/users", icon: ShieldCheck, label: "Users" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const pathname = usePathname();

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
          {navItems.map((item) => (
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
