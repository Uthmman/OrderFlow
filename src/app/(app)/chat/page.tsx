'use client';

import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { Order, OrderChatMessage } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import { formatOrderUniqueName } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

function getLastMessage(order: Order): OrderChatMessage | null {
  if (!order.chatMessages || !Array.isArray(order.chatMessages) || order.chatMessages.length === 0) {
    return null;
  }
  // Sort messages by timestamp to find the latest one
  const sortedMessages = [...order.chatMessages].sort((a, b) => 
    parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime()
  );
  return sortedMessages[0];
}

function parseTimestamp(timestamp: any): Date {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string') {
        return parseISO(timestamp);
    }
    return new Date(timestamp);
}

function formatLastMessageTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = parseTimestamp(timestamp);
        if (isToday(date)) {
            return format(date, 'p'); 
        } else if (isThisWeek(date, { weekStartsOn: 1 })) {
            return format(date, 'eee'); 
        } else {
            return format(date, 'MMM d');
        }
    } catch (e) {
        return "";
    }
}

export default function ChatPage() {
  const { orders, loading } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
        const name = formatOrderUniqueName(order.customerName, order.products, order.id).toLowerCase();
        const customer = order.customerName.toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || customer.includes(search);
    });
  }, [orders, searchTerm]);

  const activeOrders = useMemo(() => {
    return filteredOrders
        .filter(o => !['Completed', 'Shipped', 'Cancelled'].includes(o.status))
        .sort((a, b) => {
            const lastA = getLastMessage(a);
            const lastB = getLastMessage(b);
            const timeA = lastA ? parseTimestamp(lastA.timestamp).getTime() : (a.creationDate ? parseTimestamp(a.creationDate).getTime() : 0);
            const timeB = lastB ? parseTimestamp(lastB.timestamp).getTime() : (b.creationDate ? parseTimestamp(b.creationDate).getTime() : 0);
            return timeB - timeA;
        });
  }, [filteredOrders]);

  const completedOrders = useMemo(() => {
    return filteredOrders
        .filter(o => ['Completed', 'Shipped', 'Cancelled'].includes(o.status))
        .sort((a, b) => {
            const lastA = getLastMessage(a);
            const lastB = getLastMessage(b);
            const timeA = lastA ? parseTimestamp(lastA.timestamp).getTime() : 0;
            const timeB = lastB ? parseTimestamp(lastB.timestamp).getTime() : 0;
            return timeB - timeA;
        });
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderOrderList = (orderList: Order[]) => (
    <div className="flex flex-col">
        {orderList.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic text-sm">
                No conversations found.
            </div>
        ) : orderList.map((order) => {
            const lastMessage = getLastMessage(order);
            const orderName = formatOrderUniqueName(order.customerName, order.products, order.id);
            return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}?tab=chat`}
                  className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12 border shadow-sm">
                    <AvatarImage src={lastMessage?.user.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {order.customerName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="font-bold text-sm truncate">
                        {orderName}
                      </p>
                       {lastMessage && (
                        <p className="text-[10px] text-muted-foreground font-medium flex-shrink-0 ml-2 uppercase tracking-tighter">
                           {formatLastMessageTimestamp(lastMessage.timestamp)}
                        </p>
                      )}
                    </div>
                    {lastMessage ? (
                         <p className="text-xs text-muted-foreground truncate">
                            <span className="font-bold text-foreground/80">{lastMessage.isSystemMessage ? '' : `${lastMessage.user.name}: `}</span>
                            {lastMessage.text || (lastMessage.attachment ? 'Sent an attachment' : 'No message text')}
                        </p>
                    ) : (
                         <p className="text-xs text-muted-foreground truncate italic opacity-60">
                            No messages yet.
                        </p>
                    )}
                  </div>
                </Link>
            );
        })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Team Chats</h1>
            <p className="text-muted-foreground">Collaborate on order details and production.</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
            />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
        </TabsList>
        <Card className="mt-6">
            <CardContent className="p-0">
                <TabsContent value="active" className="mt-0">
                    {renderOrderList(activeOrders)}
                </TabsContent>
                <TabsContent value="completed" className="mt-0">
                    {renderOrderList(completedOrders)}
                </TabsContent>
            </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
