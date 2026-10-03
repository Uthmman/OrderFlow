
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
  Palette,
  Shapes,
  Library,
  MessageSquare,
  CreditCard,
  Building,
  Receipt,
  PieChart,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ['Admin', 'Manager', 'Sales', 'Designer', 'AdminView'] },
    { href: "/orders", icon: Package, label: "Orders", roles: ['Admin', 'Manager', 'Sales', 'Designer', 'AdminView'] },
    { href: "/chat", icon: MessageSquare, label: "Chat", roles: ['Admin', 'Manager', 'Sales', 'Designer', 'AdminView'] },
    { href: "/products", icon: Library, label: "Products", roles: ['Admin', 'Manager', 'Sales', 'Designer', 'AdminView'] },
    { href: "/expenses", icon: Receipt, label: "Expenses", roles: ['Admin', 'Manager', 'Sales', 'AdminView'] },
    { href: "/customers", icon: Users, label: "Customers", roles: ['Admin', 'Sales', 'AdminView'] },
    { href: "/users", icon: ShieldCheck, label: "Users", roles: ['Admin', 'AdminView'] },
    { href: "/settings", icon: Settings, label: "Settings", roles: ['Admin', 'Manager', 'Sales', 'Designer', 'AdminView'] },
];

const settingsNavItems = [
    { href: "/settings", icon: Palette, label: "Color Settings", roles: ['Admin', 'Manager', 'Sales', 'Designer', 'AdminView'] },
    { href: "/settings/products", icon: Shapes, label: "Product Categories", roles: ['Admin', 'Manager', 'Sales', 'Designer', 'AdminView'] },
    { href: "/settings/payments", icon: CreditCard, label: "Payment & Banks", roles: ['Admin', 'Sales', 'AdminView'] },
    { href: "/settings/branding", icon: Building, label: "Branding", roles: ['Admin', 'AdminView'] },
    { href: "/settings/shareholders", icon: PieChart, label: "Shareholders", roles: ['Admin', 'AdminView'] },
]

export function AppSidebar() {
  const pathname = usePathname();
  const { user, role } = useUser();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(role || ''));
  const isSettingsPage = pathname.startsWith('/settings');

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
                isActive={pathname.startsWith(item.href) && (item.href !== '/settings' || pathname === '/settings') && !isSettingsPage || (isSettingsPage && item.href === '/settings')}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
              {item.href === '/settings' && isSettingsPage && (
                 <ul className="py-2 pl-8 space-y-1">
                    {settingsNavItems.filter(s => s.roles.includes(role || '')).map(subItem => (
                         <li key={subItem.href}>
                             <Link href={subItem.href} className={`flex items-center gap-2 text-sm p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${pathname === subItem.href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80'}`}>
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.label}</span>
                            </Link>
                         </li>
                    ))}
                 </ul>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
