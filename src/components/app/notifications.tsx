"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const mockNotifications = [
  {
    title: "New Order #ORD-005",
    description: "Innovate Inc. placed a new urgent order.",
    time: "5m ago",
    avatar: "https://picsum.photos/seed/avatar1/40/40",
    initials: "II"
  },
  {
    title: "Deadline Approaching",
    description: "Order #ORD-002 is due in 2 days.",
    time: "1h ago",
    avatar: "https://picsum.photos/seed/avatar2/40/40",
    initials: "SC"
  },
  {
    title: "New Chat Message",
    description: "Maria Garcia sent a message in #ORD-003.",
    time: "3h ago",
    avatar: "https://picsum.photos/seed/avatar3/40/40",
    initials: "MG"
  },
];

export function Notifications() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent/80"></span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-headline">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-col gap-2">
              {mockNotifications.map((notification, index) => (
                <div key={index} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={notification.avatar} />
                        <AvatarFallback>{notification.initials}</AvatarFallback>
                    </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                  </div>
                  <time className="text-xs text-muted-foreground">{notification.time}</time>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
