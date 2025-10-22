"use client";

import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { UserNav } from "@/components/app/user-nav";
import { Notifications } from "@/components/app/notifications";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search orders, customers..."
          className="w-full rounded-lg bg-background pl-8 md:w-[300px] lg:w-[400px]"
        />
      </div>
      <Notifications />
      <UserNav />
    </header>
  );
}
