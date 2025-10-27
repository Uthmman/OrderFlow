
"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { formatTimestamp } from "@/lib/utils";
import Link from "next/link";
import { ScrollArea } from "../ui/scroll-area";

export function Notifications() {
  const { notifications, unreadCount, loading, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
             <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0">
          <CardHeader className="flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-base font-headline">Notifications</CardTitle>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    <MailCheck className="mr-2"/> Mark all as read
                </Button>
            )}
          </CardHeader>
          <ScrollArea className="h-96">
            <CardContent className="p-2">
                {loading && <div className="text-center p-4 text-sm text-muted-foreground">Loading...</div>}
                {!loading && notifications.length === 0 && (
                    <div className="text-center p-8">
                        <CardTitle className="text-lg">All caught up!</CardTitle>
                        <CardDescription>You have no new notifications.</CardDescription>
                    </div>
                )}
              <div className="flex flex-col gap-1">
                {notifications.map((notification) => (
                  <Link key={notification.id} href={notification.orderId ? `/orders/${notification.orderId}` : '#'}>
                    <div className={`flex items-start gap-3 rounded-lg p-3 hover:bg-muted ${!notification.isRead && 'bg-blue-50/50'}`}>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${!notification.isRead && 'font-bold'}`}>{notification.type}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                         <time className="text-xs text-muted-foreground pt-1">{formatTimestamp(notification.timestamp)}</time>
                      </div>
                      {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1" />}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
