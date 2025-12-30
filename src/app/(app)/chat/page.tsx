'use client';

import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Order, OrderChatMessage } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNowStrict } from 'date-fns';

function getLastMessage(order: Order): OrderChatMessage | null {
  if (!order.chatMessages || order.chatMessages.length === 0) {
    return null;
  }
  // The messages are already sorted by timestamp in the hook, so we can just take the last one.
  return order.chatMessages[order.chatMessages.length - 1];
}

function formatLastMessageTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();

    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);

    if (diffInDays < 1 && now.getDate() === date.getDate()) {
        // Today: show time
        return format(date, 'p');
    } else if (diffInDays < 7) {
        // This week: show day name
        return format(date, 'eee');
    } else {
        // Older: show date
        return format(date, 'PP');
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

    const timeA = lastMessageA ? new Date(lastMessageA.timestamp).getTime() : new Date(a.creationDate).getTime();
    const timeB = lastMessageB ? new Date(lastMessageB.timestamp).getTime() : new Date(b.creationDate).getTime();
    
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
