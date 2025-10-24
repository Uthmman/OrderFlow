
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
import { Loader2, Paperclip, Send, Info, Mic, Square, Trash2 } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useUser } from "@/firebase/auth/use-user"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Order, OrderChatMessage } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

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
            {message.text && <p className="text-sm text-muted-foreground">{message.text}</p>}
            {message.imageUrl && (
                <div className="mt-2">
                    <Image src={message.imageUrl} alt="User Upload" width={300} height={300} className="rounded-md"/>
                </div>
            )}
             {message.audioUrl && (
                <div className="mt-2">
                    <audio controls src={message.audioUrl} className="w-full max-w-sm" />
                </div>
            )}
        </div>
    </div>
);

const SystemMessage = ({ message }: { message: OrderChatMessage }) => (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground my-2">
        <Info className="h-3 w-3" />
        <span>{message.text}</span>
        <time>({new Date(message.timestamp).toLocaleTimeString()})</time>
    </div>
);


export function ChatInterface({ order }: { order: Order }) {
  const { user } = useUser();
  const { updateOrder } = useOrders();
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            setAudioBlob(blob);
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setAudioBlob(null);
    } catch (err) {
        console.error("Error starting recording:", err);
        toast({
            variant: "destructive",
            title: "Microphone Error",
            description: "Could not access microphone. Please check permissions."
        })
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !audioBlob) || !user || loading) return;

    setLoading(true);
    
    const userMessage: OrderChatMessage = {
        user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
        },
        text: inputValue,
        timestamp: new Date().toISOString(),
        audioUrl: audioUrl || undefined
    };
    
    const updatedMessages = [...(order.chatMessages || []), userMessage];
    
    try {
        await updateOrder({ ...order, chatMessages: updatedMessages });
        setInputValue("");
        setAudioBlob(null);
    } catch (error) {
        console.error("Error sending message:", error);
         toast({
            variant: "destructive",
            title: "Send Error",
            description: "Could not send message.",
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Team Chat</CardTitle>
        <CardDescription>Collaborate and track changes for this order.</CardDescription>
      </CardHeader>
      <CardContent className="h-96 overflow-y-auto space-y-4 p-4 border-t border-b">
        {(order.chatMessages || []).map((message, index) => {
            if(message.isSystemMessage) {
                return <SystemMessage key={index} message={message} />;
            }
            return <UserMessage key={index} message={message} />;
        })}
      </CardContent>
      <CardFooter className="p-4 flex flex-col items-start gap-2">
         {audioUrl && !isRecording && (
            <div className="w-full p-2 border rounded-md flex items-center justify-between">
               <audio controls src={audioUrl} className="flex-1" />
               <Button variant="ghost" size="icon" onClick={() => setAudioBlob(null)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="relative w-full">
          <Input 
            placeholder={isRecording ? "Recording in progress..." : "Send a message or record audio..."}
            className="pr-28"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading || isRecording}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <Button variant="ghost" size="icon" type="button" disabled>
              <Paperclip className="h-4 w-4" />
            </Button>
             <Button 
                variant={isRecording ? "destructive" : "ghost"} 
                size="icon" 
                type="button" 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
              >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" type="submit" disabled={loading || (!inputValue.trim() && !audioBlob)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  )
}
