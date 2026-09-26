
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
import { Loader2, Paperclip, Send, Info, Mic, Square, Trash2, File as FileIcon, Download, Clock, X, Eye } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useState, useRef, useOptimistic, useTransition, useEffect } from "react"
import Image from "next/image"
import { Order, OrderChatMessage, OrderAttachment } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { compressImage, downloadFile, cn } from "@/lib/utils"
import { Dialog, DialogContent } from "../ui/dialog"
import { v4 as uuidv4 } from "uuid"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

function ImageGallery({ open, onOpenChange, images, startIndex = 0 }: { open: boolean, onOpenChange: (open: boolean) => void, images: OrderAttachment[], startIndex: number }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => setCurrent(api.selectedScrollSnap() + 1));
  }, [api]);

  useEffect(() => {
    if (open && api) api.scrollTo(startIndex, true);
  }, [open, api, startIndex]);

  if (!images || images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 border-none bg-black/95 text-white overflow-hidden flex flex-col [&>button]:hidden z-[100]">
        <header className="absolute top-0 left-0 right-0 z-[110] p-4 flex flex-row items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex flex-col text-left">
            <h2 className="text-white text-sm font-bold truncate max-w-[200px] md:max-w-md">
              {images[current - 1]?.fileName}
            </h2>
            <p className="text-[10px] text-white/60">{current} of {images.length}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10" onClick={() => onOpenChange(false)}>
            <X className="h-6 w-6" />
          </Button>
        </header>

        <div className="flex-1 w-full h-full relative">
          <Carousel setApi={setApi} className="w-full h-full" opts={{ startIndex, loop: true }}>
            <CarouselContent className="h-screen m-0">
              {images.map((image, index) => (
                <CarouselItem key={image.url} className="h-screen p-0 flex items-center justify-center">
                    <div className="relative w-full h-full">
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

        <footer className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-end bg-gradient-to-t from-black/80 to-transparent gap-4 pointer-events-none z-[110]">
           <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 pointer-events-auto rounded-full px-6"
            onClick={() => downloadFile(images[current - 1].url, images[current - 1].fileName)}
           >
             <Download className="mr-2 h-4 w-4" /> Download
           </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

const UserAvatar = ({ message }: { message: OrderChatMessage }) => {
    if (message.isSystemMessage) {
        return (
            <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted">
                    <Info className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>
        );
    }
    return (
        <Avatar className="h-8 w-8">
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
    <div className="flex items-start gap-3 relative group animate-in fade-in slide-in-from-bottom-1">
        <UserAvatar message={message} />
        <div className="flex-1">
            <div className="flex items-center gap-2">
            <p className="font-bold text-xs">{message.user.name}</p>
            <time className="text-[10px] text-muted-foreground flex items-center gap-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {(message as any).sending && <Clock className="h-2 w-2 animate-pulse" />}
            </time>
            </div>
            <div className={cn("mt-0.5", (message as any).sending ? "opacity-70" : "" )}>
                {message.text && <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{message.text}</p>}
                {message.attachment && <ChatAttachment attachment={message.attachment} onImageClick={onImageClick}/>}
            </div>
        </div>
    </div>
);

const SystemMessage = ({ message }: { message: OrderChatMessage }) => (
    <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground my-6 bg-muted/20 py-1.5 rounded-full px-4 mx-auto w-fit border border-dashed">
        <Info className="h-3 w-3" />
        <span className="italic font-medium uppercase tracking-tight">{message.text}</span>
        <time className="opacity-60">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
    </div>
);

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

    const textToSend = inputValue.trim();
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
            let fileToPass: File | undefined = undefined;
            if (currentAudioBlob) {
                fileToPass = new File([currentAudioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
            } else if (currentFile) {
                fileToPass = currentFile;
            }
            
            await updateOrder({ id: order.id }, { text: textToSend, file: fileToPass });
        } catch (error) {
            console.error("Message send error:", error);
            toast({
                variant: "destructive",
                title: "Failed to send message",
                description: "There was a problem delivering your message. Please try again."
            });
            setInputValue(textToSend);
        }
    });
  };

  return (
    <>
    <div className="flex flex-col h-[500px] md:h-[600px] lg:h-[650px] border-none md:border md:rounded-xl md:shadow-sm bg-transparent lg:bg-card overflow-hidden relative">
      <div className="flex-1 overflow-y-auto space-y-5 p-4 lg:p-6 scroll-smooth bg-muted/5">
         {optimisticMessages.length === 0 ? (
             <div className="h-full flex items-center justify-center text-center p-8">
                 <div className="space-y-3 opacity-30 grayscale">
                     <Send className="h-12 w-12 mx-auto" />
                     <p className="text-sm font-bold uppercase tracking-widest">Start the conversation</p>
                 </div>
             </div>
         ) : optimisticMessages.map((message, index) => (
            <div key={`${message.id}-${message.timestamp}-${index}`}>
                {message.isSystemMessage ? <SystemMessage message={message} /> : <UserMessage message={message} onImageClick={handleImageClick} />}
            </div>
        ))}
      </div>
      
      {/* Messaging Input Area */}
      <div className="p-4 bg-background border-t border-border/50 z-30 shrink-0">
         {fileToUpload && fileUrl && (
            <div className="w-full mb-3 p-2 border rounded-xl flex items-center justify-between gap-2 bg-muted/40 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 truncate">
                    {fileToUpload.type.startsWith('image/') ? (
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden border">
                            <Image src={fileUrl} alt={fileToUpload.name} fill className="object-cover" />
                        </div>
                    ) : <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />}
                    <span className="text-xs font-bold truncate">{fileToUpload.name}</span>
                </div>
               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFileToUpload(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="relative w-full flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          <div className="relative flex-grow">
            <Input 
                placeholder={isRecording ? "Recording audio..." : "Type your message..."}
                className={cn(
                    "h-12 shadow-sm rounded-2xl bg-muted/30 border-none pr-20",
                    isRecording && "animate-pulse ring-2 ring-destructive/20"
                )}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isPending || isRecording}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                <Button variant="ghost" size="icon" type="button" className="h-10 w-10 text-muted-foreground" onClick={() => fileInputRef.current?.click()} disabled={isPending || isRecording}><Paperclip className="h-5 w-5" /></Button>
                <Button 
                    variant={isRecording ? "destructive" : "ghost"} 
                    size="icon" 
                    type="button" 
                    className={cn("h-10 w-10", isRecording ? "rounded-full" : "text-muted-foreground")}
                    onClick={isRecording ? stopRecording : startRecording} 
                    disabled={isPending || !!fileToUpload}
                >
                    {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
                </Button>
            </div>
          </div>

          <Button 
            variant="default" 
            size="icon" 
            type="submit" 
            className="h-12 w-12 rounded-2xl shadow-md shrink-0" 
            disabled={isPending || (!inputValue.trim() && !audioBlob && !fileToUpload)}
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
      
    <ImageGallery 
        open={galleryOpen} 
        onOpenChange={setGalleryOpen} 
        images={imageMessages} 
        startIndex={galleryStartIndex} 
    />
    </>
  )
}
