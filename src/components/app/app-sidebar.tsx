
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Package,
  FilePlus2,
  Settings,
  LogOut,
  Boxes,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/firebase/auth/use-user";

const navItems = {
  Admin: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/orders", icon: Package, label: "Orders" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/users", icon: ShieldCheck, label: "Users" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ],
  Manager: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/orders", icon: Package, label: "Orders" },
    { href: "/customers", icon: Users, label: "Customers" },
  ],
  Sales: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/customers", icon: Users, label: "Customers" },
  ],
  Designer: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/orders", icon: Package, label: "Orders" },
  ],
};

export function AppSidebar() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const pathname = usePathname();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  const role = user?.role as keyof typeof navItems || "Designer";

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
          {(navItems[role] || []).map((item) => (
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
      <SidebarFooter className="p-2">
        <div className="flex items-center gap-3 rounded-md bg-background/10 p-2">
           <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatarUrl || ''} alt={user?.name || ''} />
              <AvatarFallback>{getInitials(user?.name || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm">
                <span className="font-semibold text-sidebar-foreground">{user?.name}</span>
                <span className="text-muted-foreground">{role}</span>
            </div>
            <SidebarMenuButton variant="ghost" className="ml-auto h-8 w-8" onClick={signOut} tooltip="Logout">
              <LogOut className="h-4 w-4" />
            </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
