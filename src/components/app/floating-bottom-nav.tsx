
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, MessageSquare, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/orders", icon: Package, label: "Orders" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/products", icon: Library, label: "Products" },
];

export function FloatingBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-28px)] max-w-md -translate-x-1/2 md:hidden">
      <nav className="flex h-16 items-center justify-around rounded-[24px] border border-border/50 bg-background/70 px-4 shadow-2xl backdrop-blur-xl transition-all duration-300">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200",
                isActive ? "bg-primary/10" : "group-hover:bg-muted"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-tight",
                isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
