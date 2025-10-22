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
import { Paperclip, Send } from "lucide-react"

const messages = [
  {
    user: { name: "Maria Garcia", avatar: "https://picsum.photos/seed/avatar2/40/40" },
    text: "Can we get an update on the design mockups for #ORD-003?",
    time: "3:40 PM",
  },
  {
    user: { name: "Emily White", avatar: "https://picsum.photos/seed/avatar4/40/40" },
    text: "Just finishing them up! I'll upload them here shortly. I had a question about the color palette.",
    time: "3:42 PM",
  },
  {
    user: { name: "Maria Garcia", avatar: "https://picsum.photos/seed/avatar2/40/40" },
    text: "Sure, what's up?",
    time: "3:43 PM",
  },
]

export function ChatInterface({ orderId }: { orderId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Team Chat</CardTitle>
        <CardDescription>Channel for order #{orderId}</CardDescription>
      </CardHeader>
      <CardContent className="h-96 overflow-y-auto space-y-4 p-4 border-t border-b">
        {messages.map((message, index) => (
          <div key={index} className="flex items-start gap-3">
            <Avatar>
              <AvatarImage src={message.user.avatar} />
              <AvatarFallback>
                {message.user.name.split(" ").map((n) => n[0])}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{message.user.name}</p>
                <time className="text-xs text-muted-foreground">{message.time}</time>
              </div>
              <p className="text-sm text-muted-foreground">{message.text}</p>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="p-4">
        <div className="relative w-full">
          <Input placeholder="Type a message..." className="pr-20" />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <Button variant="ghost" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
