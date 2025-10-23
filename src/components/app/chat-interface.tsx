
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Paperclip, Send } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useUser } from "@/firebase"
import { useState } from "react"
import Image from "next/image"
import { Order, OrderChatMessage } from "@/lib/types"

const UserAvatar = ({ message }: { message: OrderChatMessage }) => (
    <Avatar>
        <AvatarImage src={message.user.avatarUrl} />
        <AvatarFallback>
            {message.user.name.split(" ").map((n) => n[0])}
        </AvatarFallback>
    </Avatar>
);

const UserMessage = ({ message }: { message: OrderChatMessage }) => (
     <div className="flex items-start gap-3">
        <UserAvatar message={message} />
        <div>
            <div className="flex items-center gap-2">
            <p className="font-semibold">{message.user.name}</p>
            <time className="text-xs text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString()}</time>
            </div>
            <p className="text-sm text-muted-foreground">{message.text}</p>
            {message.imageUrl && (
                <div className="mt-2">
                    <Image src={message.imageUrl} alt="User Upload" width={300} height={300} className="rounded-md"/>
                </div>
            )}
        </div>
    </div>
);


export function ChatInterface({ order }: { order: Order }) {
  const { user } = useUser();
  const { updateOrder } = useOrders();
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || loading) return;

    setLoading(true);

    const userMessage: OrderChatMessage = {
        user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
        },
        text: inputValue,
        timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = [...(order.chatMessages || []), userMessage];
    
    try {
        await updateOrder({ ...order, chatMessages: updatedMessages });
        setInputValue("");
    } catch (error) {
        console.error("Error sending message:", error);
        // Optionally, show a toast notification for the error
    } finally {
        setLoading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Team Chat</CardTitle>
        <CardDescription>Chat about order #{order.id.slice(-5)}</CardDescription>
      </CardHeader>
      <CardContent className="h-96 overflow-y-auto space-y-4 p-4 border-t border-b">
        {(order.chatMessages || []).map((message, index) => (
            <UserMessage key={index} message={message} />
        ))}
      </CardContent>
      <CardFooter className="p-4">
        <form onSubmit={handleSendMessage} className="relative w-full">
          <Input 
            placeholder="Send a message..." 
            className="pr-20"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <Button variant="ghost" size="icon" type="button" disabled>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  )
}
