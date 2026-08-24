
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
import { Loader2, Paperclip, Send, Info, Mic, Square, Trash2, File as FileIcon, Download, Clock, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useState, useRef, useOptimistic, useTransition, useEffect } from "react"
import Image from "next/image"
import { Order, OrderChatMessage, OrderAttachment } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { compressImage, downloadFile } from "@/lib/utils"
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogHeader } from "../ui/dialog"
import { v4 as uuidv4 } from "uuid"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

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

const ChatAttachment = ({ attachment, onImageClick }: { attachment: OrderAttachment, onImageClick: (attachment: OrderAttachment) => void }) => {
    const isImage = attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = attachment.fileName.match(/\.(mp3|wav|ogg|webm)$/i);

    if (isImage) {
        return (
             <div onClick={() => onImageClick(attachment)} className="mt-2 block max-w-xs cursor-pointer group relative">
                <Image src={attachment.url} alt="User Upload" width={300} height={200} className="rounded-md object-cover"/>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                    <Eye className="text-white h-8 w-8" />
                </div>
            </div>
        )
    }
    if (isAudio) {
        return (
            <div className="mt-2 w-full max-w-sm">
                <audio controls src={attachment.url} className="w-full h-10" />
            </div>
        )
    }
    return (
        <button 
          onClick={() => downloadFile(attachment.url, attachment.fileName)}
          className="mt-2 flex items-center gap-2 p-2 bg-muted rounded-md max-w-xs hover:bg-muted/80 text-left w-full"
        >
            <FileIcon className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-foreground truncate flex-1">{attachment.fileName}</span>
            <Download className="h-4 w-4 text-muted-foreground" />
        </button>
    )
}

const UserMessage = ({ message, onImageClick }: { message: OrderChatMessage, onImageClick: (attachment: OrderAttachment) => void }) => (
    <div className="flex items-start gap-3 relative group">
        <UserAvatar message={message} />
        <div className="flex-1">
            <div className="flex items-center gap-2">
            <p className="font-semibold">{message.user.name}</p>
            <time className="text-xs text-muted-foreground flex items-center gap-1">
                {new Date(message.timestamp).toLocaleTimeString()}
                {(message as any).sending && <Clock className="h-3 w-3 animate-pulse" />}
            </time>
            </div>
            <div className={ (message as any).sending ? "opacity-70" : "" }>
                {message.text && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{message.text}</p>}
                {message.attachment && <ChatAttachment attachment={message.attachment} onImageClick={onImageClick}/>}
            </div>
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

/**
 * A modern, swipe-enabled fullscreen image gallery component.
 */
function ImageGallery({ open, onOpenChange, images, startIndex = 0 }: { open: boolean, onOpenChange: (open: boolean) => void, images: OrderAttachment[], startIndex: number }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Handle start index when gallery opens
  useEffect(() => {
    if (open && api) {
      api.scrollTo(startIndex, true);
    }
  }, [open, api, startIndex]);

  if (!images || images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 border-none bg-black/98 text-white overflow-hidden flex flex-col">
        <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 flex flex-row items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex flex-col text-left">
            <DialogTitle className="text-white text-sm font-bold truncate max-w-[200px] md:max-w-md">
              {images[current - 1]?.fileName}
            </DialogTitle>
            <p className="text-[10px] text-white/60">{current} of {images.length}</p>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10">
              <X className="h-6 w-6" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 w-full h-full">
          <Carousel setApi={setApi} className="w-full h-full" opts={{ startIndex }}>
            <CarouselContent className="h-screen m-0">
              {images.map((image, index) => (
                <CarouselItem key={image.url} className="h-screen p-0 flex items-center justify-center relative">
                    <div className="relative w-full h-full p-4 md:p-12">
                        <Image
                        src={image.url}
                        alt={image.fileName}
                        fill
                        className="object-contain"
                        priority={index === startIndex}
                        sizes="100vw"
                        />
                    </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {images.length > 1 && (
                <>
                <CarouselPrevious className="left-4 bg-black/20 hover:bg-black/40 text-white border-none h-12 w-12 hidden md:flex" />
                <CarouselNext className="right-4 bg-black/20 hover:bg-black/40 text-white border-none h-12 w-12 hidden md:flex" />
                </>
            )}
          </Carousel>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-end bg-gradient-to-t from-black/60 to-transparent gap-4 pointer-events-none">
           <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 pointer-events-auto"
            onClick={() => downloadFile(images[current - 1].url, images[current - 1].fileName)}
           >
             <Download className="mr-2 h-4 w-4" /> Download
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChatInterface({ order }: { order: Order }) {
  const { updateOrder } = useOrders();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileUrl = fileToUpload ? URL.createObjectURL(fileToUpload) : null;
  
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  const baseMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    baseMessages,
    (state, newMessage: OrderChatMessage) => [...state, newMessage]
  );

  const imageMessages = optimisticMessages
    .filter(m => m.attachment && m.attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i))
    .map(m => m.attachment as OrderAttachment);

  const handleImageClick = (clickedAttachment: OrderAttachment) => {
    const imageIndex = imageMessages.findIndex(img => img.url === clickedAttachment.url);
    if (imageIndex !== -1) {
        setGalleryStartIndex(imageIndex);
        setGalleryOpen(true);
    }
  }


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
    stream = await requestMicPermission();
    if (!stream) return;
    
    setFileToUpload(null);
    const mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        toast({ variant: "destructive", title: "Unsupported Format", description: "Your browser does not support WebM recording." });
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
      setAudioBlob(null);
      if (file.type.startsWith('image/')) {
        try {
            const compressedFile = await compressImage(file);
            setFileToUpload(compressedFile);
        } catch (error) {
            setFileToUpload(file);
        }
      } else {
        setFileToUpload(file);
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !audioBlob && !fileToUpload) || !user) return;

    const textToSend = inputValue;
    const currentAudioBlob = audioBlob;
    const currentFile = fileToUpload;

    setInputValue("");
    setAudioBlob(null);
    setFileToUpload(null);
    if(fileInputRef.current) fileInputRef.current.value = "";

    startTransition(async () => {
        addOptimisticMessage({
            id: uuidv4(),
            user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
            text: textToSend,
            timestamp: new Date().toISOString(),
            sending: true,
            attachment: currentFile ? { fileName: currentFile.name, url: URL.createObjectURL(currentFile), storagePath: '' } : undefined
        } as any);

        try {
            let newFile: File | undefined = undefined;
            if (currentAudioBlob) {
                newFile = new File([currentAudioBlob], `chat-audio-${Date.now()}.webm`, { type: 'audio/webm' });
            } else if (currentFile) {
                newFile = currentFile;
            }
            await updateOrder({ id: order.id }, { text: textToSend, file: newFile });
        } catch (error) {
            setInputValue(textToSend);
        }
    });
  };

  return (
    <>
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="py-3">
        <CardTitle className="font-headline text-lg">Team Chat</CardTitle>
        <CardDescription className="text-xs">Collaborate on this order.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 border-t border-b scroll-smooth">
         {optimisticMessages.map((message, index) => (
            <div key={`${message.id}-${message.timestamp}-${index}`}>
                {message.isSystemMessage ? <SystemMessage message={message} /> : <UserMessage message={message} onImageClick={handleImageClick} />}
            </div>
        ))}
      </CardContent>
      <CardFooter className="p-4 flex flex-col items-start gap-2">
         {fileToUpload && fileUrl && (
            <div className="w-full p-2 border rounded-md flex items-center justify-between gap-2 bg-muted/30">
                <div className="flex items-center gap-2 truncate">
                    {fileToUpload.type.startsWith('image/') ? (
                        <Image src={fileUrl} alt={fileToUpload.name} width={40} height={40} className="h-10 w-10 rounded-sm object-cover" />
                    ) : <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />}
                    <span className="text-sm truncate">{fileToUpload.name}</span>
                </div>
               <Button variant="ghost" size="icon" onClick={() => { setFileToUpload(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="relative w-full">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <Input 
            placeholder={isRecording ? "Recording..." : "Message or attach..."}
            className="pr-28 h-11"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isPending || isRecording}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isPending || isRecording}><Paperclip className="h-4 w-4" /></Button>
             <Button variant={isRecording ? "destructive" : "ghost"} size="icon" type="button" onClick={isRecording ? stopRecording : startRecording} disabled={isPending || !!fileToUpload}>
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" type="submit" disabled={isPending || (!inputValue.trim() && !audioBlob && !fileToUpload)}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
      
      <ImageGallery 
        open={galleryOpen} 
        onOpenChange={setGalleryOpen} 
        images={imageMessages} 
        startIndex={galleryStartIndex} 
      />
    </>
  )
}
