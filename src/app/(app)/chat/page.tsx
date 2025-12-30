
'use client';

import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Order, OrderChatMessage } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';

function getLastMessage(order: Order): OrderChatMessage | null {
  if (!order.chatMessages || order.chatMessages.length === 0) {
    return null;
  }
  // The messages are already sorted by timestamp in the hook, so we can just take the last one.
  return order.chatMessages[order.chatMessages.length - 1];
}

function parseTimestamp(timestamp: any): Date {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
    return parseISO(timestamp);
}


function formatLastMessageTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    const date = parseTimestamp(timestamp);

    if (isToday(date)) {
        return format(date, 'p'); // e.g., 4:30 PM
    } else if (isThisWeek(date, { weekStartsOn: 1 /* Monday */ })) {
        return format(date, 'eee'); // e.g., 'Wed'
    } else {
        return format(date, 'MMM d'); // e.g., 'Jul 23'
    }
}


export default function ChatPage() {
  const { orders, loading } = useOrders();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const sortedOrders = [...orders].sort((a, b) => {
    const lastMessageA = getLastMessage(a);
    const lastMessageB = getLastMessage(b);

    const timeA = lastMessageA ? parseTimestamp(lastMessageA.timestamp).getTime() : parseTimestamp(a.creationDate).getTime();
    const timeB = lastMessageB ? parseTimestamp(lastMessageB.timestamp).getTime() : parseTimestamp(b.creationDate).getTime();
    
    return timeB - timeA;
  });


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Team Chats</h1>
        <p className="text-muted-foreground">
          An overview of all order conversations.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {sortedOrders.map((order) => {
              const lastMessage = getLastMessage(order);
              const productName = order.products?.[0]?.productName || 'Custom Order';
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={lastMessage?.user.avatarUrl} />
                    <AvatarFallback>
                        {order.customerName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between">
                      <p className="font-semibold truncate">
                        {order.customerName} - {productName}
                      </p>
                       {lastMessage && (
                        <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                           {formatLastMessageTimestamp(lastMessage.timestamp)}
                        </p>
                      )}
                    </div>
                    {lastMessage ? (
                         <p className="text-sm text-muted-foreground truncate">
                            <span className="font-medium">{lastMessage.isSystemMessage ? '' : `${lastMessage.user.name}: `}</span>
                            {lastMessage.text || (lastMessage.attachment ? 'Sent an attachment' : 'No message text')}
                        </p>
                    ) : (
                         <p className="text-sm text-muted-foreground truncate italic">
                            No messages yet.
                        </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
