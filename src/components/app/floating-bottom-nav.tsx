
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

  // Filter for unread messages specifically for the Chat badge
  const chatUnreadCount = notifications.filter(n => !n.isRead && (n.type === 'New Message' || n.type === 'chat')).length;

  if (!user) return null;

  // shared base items with concise labels for mobile fitting
  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dash" },
    { href: "/orders", icon: Package, label: "Orders" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
  ];

  // Role based items: Sales and Designers see Products
  if (role === 'Sales' || role === 'Designer' || role === 'Admin') {
    navItems.push({ href: "/products", icon: Library, label: "Catalog" });
  }

  // Role based items: Admin, Manager and AdminView see Expenses
  if (role === 'Admin' || role === 'Manager' || role === 'AdminView') {
    navItems.push({ href: "/expenses", icon: Receipt, label: "Ledger" });
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-16px)] max-w-lg -translate-x-1/2 md:hidden">
      <nav className="flex h-16 items-center justify-between rounded-[24px] border border-border/40 bg-background/80 px-1 shadow-2xl backdrop-blur-xl transition-all duration-300">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isChat = item.label === "Chat";
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex h-8 w-10 items-center justify-center rounded-full transition-colors duration-200 relative",
                isActive ? "bg-primary/10" : "group-hover:bg-muted"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                
                {isChat && chatUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-in zoom-in-50 duration-300">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                    </span>
                )}
              </div>
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-tighter truncate w-full text-center px-0.5",
                isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 h-0.5 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
