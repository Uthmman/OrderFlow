"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, MessageSquare, Library, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useNotifications } from "@/hooks/use-notifications";

export function FloatingBottomNav() {
  const pathname = usePathname();
  const { user, role } = useUser();
  const { notifications } = useNotifications();

  const chatUnreadCount = notifications.filter(n => !n.isRead && (n.type === 'New Message' || n.type === 'chat')).length;

  if (!user) return null;

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dash" },
    { href: "/orders", icon: Package, label: "Orders" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
  ];

  if (role === 'Sales' || role === 'Designer' || role === 'Admin') {
    navItems.push({ href: "/products", icon: Library, label: "Product" });
  }

  if (role === 'Admin' || role === 'Manager' || role === 'AdminView') {
    navItems.push({ href: "/expenses", icon: Receipt, label: "Expense" });
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-16px)] max-w-lg -translate-x-1/2 md:hidden">
      <nav className="flex h-16 items-center justify-between rounded-[24px] border border-border/40 bg-background/80 px-1 shadow-2xl backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("group flex flex-1 flex-col items-center justify-center gap-0.5", isActive ? "text-primary" : "text-muted-foreground")}>
              <div className={cn("flex h-8 w-10 items-center justify-center rounded-full relative", isActive ? "bg-primary/10" : "")}>
                <item.icon className="h-5 w-5" />
                {item.label === "Chat" && chatUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">{chatUnreadCount}</span>
                )}
              </div>
              <span className="text-[8px] font-bold uppercase tracking-tighter truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
