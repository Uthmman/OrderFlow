

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
import { Loader2, Paperclip, Send, Info, Mic, Square, Trash2, User as UserIcon, File as FileIcon } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Order, OrderChatMessage, OrderAttachment } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { compressImage } from "@/lib/utils"

const UserAvatar = ({ message }: { message: OrderChatMessage }) => {
    if (message.isSystemMessage) {
        return (
            <Avatar>
                <AvatarFallback>
                    <Info className="h-5 w-5" />
                </AvatarFallback>
            </Avatar>
        );
    }
    return (
        <Avatar>
            <AvatarImage src={message.user.avatarUrl} />
            <AvatarFallback>
                {message.user.name?.split(" ").map((n) => n[0])}
            </AvatarFallback>
        </Avatar>
    )
};

const ChatAttachment = ({ attachment }: { attachment: OrderAttachment }) => {
    const isImage = attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = attachment.fileName.match(/\.(mp3|wav|ogg|webm)$/i);

    if (isImage) {
        return (
            <Link href={attachment.url} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-xs">
                <Image src={attachment.url} alt="User Upload" width={300} height={200} className="rounded-md object-cover"/>
            </Link>
        )
    }
    if (isAudio) {
        return (
            <div className="mt-2 w-full max-w-sm">
                <audio controls src={attachment.url} className="w-full h-10" />
            </div>
        )
    }
    // Fallback for other file types
    return (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 p-2 bg-muted rounded-md max-w-xs hover:bg-muted/80">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-foreground truncate">{attachment.fileName}</span>
        </a>
    )
}

const UserMessage = ({ message }: { message: OrderChatMessage }) => (
    <div className="flex items-start gap-3">
        <UserAvatar message={message} />
        <div>
            <div className="flex items-center gap-2">
            <p className="font-semibold">{message.user.name}</p>
            <time className="text-xs text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString()}</time>
            </div>
            {message.text && <p className="text-sm text-muted-foreground">{message.text}</p>}
            {message.attachment && <ChatAttachment attachment={message.attachment} />}
        </div>
    </div>
);

const SystemMessage = ({ message }: { message: OrderChatMessage }) => (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground my-2">
        <Info className="h-3 w-3" />
        <span className="italic">{message.text}</span>
        <time>({new Date(message.timestamp).toLocaleTimeString()})</time>
    </div>
);


export function ChatInterface({ order }: { order: Order }) {
  const { updateOrder } = useOrders();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;
  const fileUrl = fileToUpload ? URL.createObjectURL(fileToUpload) : null;


  const requestMicPermission = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return stream;
    } catch (err) {
        console.error("Microphone access denied:", err);
        toast({
            variant: "destructive",
            title: "Microphone Access Denied",
            description: "To record audio, you must allow microphone access in your browser settings."
        });
        return null;
    }
  };

  const startRecording = async () => {
    let stream: MediaStream | null;
    // We request permission only when the user clicks the button.
    stream = await requestMicPermission();
    
    if (!stream) return;
    
    setFileToUpload(null); // Clear file if starting audio recording
    
    // Check for WAV support
    const mimeType = 'audio/wav';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error(`${mimeType} is not supported on this browser.`);
        toast({
            variant: "destructive",
            title: "Unsupported Format",
            description: "Your browser does not support WAV recording. Please try a different browser.",
        });
        return;
    }

    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setAudioBlob(null);
  };


  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(null); // Clear audio if a file is selected
      if (file.type.startsWith('image/')) {
        try {
            const compressedFile = await compressImage(file);
            setFileToUpload(compressedFile);
        } catch (error) {
            console.error("Image compression failed:", error);
            toast({
                variant: "destructive",
                title: "Compression Failed",
                description: "Could not compress the image.",
            });
            setFileToUpload(file); // Fallback to original file
        }
      } else {
        setFileToUpload(file);
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !audioBlob && !fileToUpload) || loading || !user) return;

    setLoading(true);

    try {
        let newFile: File | undefined = undefined;

        if (audioBlob) {
            newFile = new File([audioBlob], `chat-audio-${Date.now()}.wav`, { type: 'audio/wav' });
        } else if (fileToUpload) {
            newFile = fileToUpload;
        }
        
        await updateOrder(order, { text: inputValue, file: newFile });

    } catch (error) {
        console.error("Error sending message:", error);
        toast({
            variant: "destructive",
            title: "Send Error",
            description: (error as Error).message || "Could not send message.",
        });
    }


    setInputValue("");
    setAudioBlob(null);
    setFileToUpload(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Team Chat</CardTitle>
        <CardDescription>Collaborate and track changes for this order.</CardDescription>
      </CardHeader>
      <CardContent className="h-96 overflow-y-auto space-y-4 p-4 border-t border-b">
         {(order.chatMessages || []).map((message) => {
          if (message.isSystemMessage) {
            return <SystemMessage key={message.id} message={message} />;
          }
          return <UserMessage key={message.id} message={message} />;
        })}
      </CardContent>
      <CardFooter className="p-4 flex flex-col items-start gap-2">
         {audioUrl && !isRecording && (
            <div className="w-full p-2 border rounded-md flex items-center justify-between">
               <audio controls src={audioUrl} className="flex-1 h-10" />
               <Button variant="ghost" size="icon" onClick={() => setAudioBlob(null)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
        )}
         {fileToUpload && fileUrl && (
            <div className="w-full p-2 border rounded-md flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                    {fileToUpload.type.startsWith('image/') ? (
                        <Image src={fileUrl} alt={fileToUpload.name} width={40} height={40} className="h-10 w-10 rounded-sm object-cover" />
                    ) : (
                        <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{fileToUpload.name}</span>
                </div>
               <Button variant="ghost" size="icon" onClick={() => { setFileToUpload(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="relative w-full">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Input 
            placeholder={isRecording ? "Recording in progress..." : "Send a message or attach a file..."}
            className="pr-28"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading || isRecording}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <Button 
                variant="ghost" 
                size="icon" 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isRecording}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
             <Button 
                variant={isRecording ? "destructive" : "ghost"} 
                size="icon" 
                type="button" 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading || !!fileToUpload}
              >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" type="submit" disabled={loading || (!inputValue.trim() && !audioBlob && !fileToUpload)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  )
}
