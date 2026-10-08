
"use client";

import { useState, useEffect, Suspense, useOptimistic, useRef, useMemo } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useStock } from "@/hooks/use-stock";
import { notFound, useRouter, useSearchParams, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderAttachment, OrderStatus, type Order, Product, AppUser, BOMItem, SecondaryItem } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Hash, 
  Palette, 
  Ruler, 
  Box, 
  User, 
  ImageIcon, 
  AlertTriangle, 
  File, 
  FileText, 
  Edit, 
  MoreVertical, 
  ChevronsUpDown, 
  Download, 
  Trash2, 
  Eye, 
  Boxes, 
  ShieldAlert, 
  MessageSquare, 
  Info, 
  MapPin, 
  Loader2, 
  QrCode, 
  X, 
  Receipt, 
  Banknote, 
  CreditCard, 
  UploadCloud, 
  CheckCircle2, 
  PlayCircle, 
  ListChecks, 
  AlertCircle, 
  Search, 
  PlusCircle, 
  Package, 
  Plus, 
  Cpu, 
  ChevronLeft, 
  ChevronRight, 
  FlaskConical, 
  ShoppingCart,
  Phone
} from "lucide-react";
import Image from "next/image";
import { ChatInterface } from "@/components/app/chat-interface";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatOrderId, formatOrderUniqueName, formatTimestamp, formatProductDisplay, downloadFile } from "@/lib/utils";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogPortal,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/use-customers";
import { useUser, useUsers } from "@/hooks/use-user";
import { useColorSettings } from "@/hooks/use-color-settings";
import { useBrandSettings } from "@/hooks/use-brand-settings";
import { useNotifications } from "@/hooks/use-notifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { QRCodeCanvas } from "qrcode.react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useSecondaryItems } from "@/hooks/use-secondary-items";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useFirestore } from "@/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { v4 as uuidv4 } from "uuid";
import { Skeleton } from "@/components/ui/skeleton";

const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    "Pending": "outline",
    "In Progress": "secondary",
    "Designing": "secondary",
    "Design Ready": "secondary",
    "Manufacturing": "secondary",
    "Painting": "secondary",
    "Completed": "default",
    "Shipped": "default",
    "Cancelled": "destructive",
}

function OrderSkeleton() {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-start px-1 py-4">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-10 w-2/3 md:w-1/2" />
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-32 rounded-full" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[300px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

function TAPVisualizer({ content }: { content: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [progress, setProgress] = useState(100);
    
    const lines = useMemo(() => {
        const result: { x: number, y: number, type: 'move' | 'cut' }[] = [];
        let curX = 0;
        let curY = 0;
        
        content.split('\n').forEach(line => {
            const cmd = line.trim().toUpperCase();
            const xMatch = cmd.match(/X([-+]?[0-9]*\.?[0-9]+)/);
            const yMatch = cmd.match(/Y([-+]?[0-9]*\.?[0-9]+)/);
            
            if (xMatch || yMatch) {
                if (xMatch) curX = parseFloat(xMatch[1]);
                if (yMatch) curY = parseFloat(yMatch[1]);
                const type = cmd.includes('G0') ? 'move' : 'cut';
                result.push({ x: curX, y: curY, type });
            }
        });
        return result;
    }, [content]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || lines.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        lines.forEach(p => {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });

        const margin = 40;
        const width = canvas.width - margin * 2;
        const height = canvas.height - margin * 2;
        const scale = Math.min(width / (maxX - minX || 1), height / (maxY - minY || 1));

        const getX = (x: number) => margin + (x - minX) * scale;
        const getY = (y: number) => canvas.height - (margin + (y - minY) * scale);

        const limit = Math.floor((progress / 100) * lines.length);
        
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < limit; i++) {
            const p = lines[i];
            const px = getX(p.x);
            const py = getY(p.y);
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.strokeStyle = lines[i].type === 'move' ? '#94a3b8' : '#2563eb';
                ctx.setLineDash(lines[i].type === 'move' ? [2, 2] : []);
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px, py);
            }
        }
    }, [lines, progress]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 relative bg-slate-900 rounded-lg overflow-hidden border">
                <canvas ref={canvasRef} width={800} height={500} className="w-full h-full object-contain" />
            </div>
            <div className="p-4 bg-background border-t space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Machining Process</span>
                    <span className="text-primary">{Math.floor((progress / 100) * lines.length)} / {lines.length} Commands</span>
                </div>
                <Slider value={[progress]} onValueChange={(vals) => setProgress(vals[0])} max={100} step={1} />
            </div>
        </div>
    );
}

function FilePreviewDialog({ open, onOpenChange, attachment }: { open: boolean, onOpenChange: (open: boolean) => void, attachment: OrderAttachment | null }) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isPdf = attachment?.fileName.toLowerCase().endsWith('.pdf');
    const isCNC = attachment?.fileName.toLowerCase().endsWith('.tap');

    useEffect(() => {
        if (open && isCNC && attachment?.url) {
            setLoading(true);
            fetch(attachment.url)
                .then(res => res.text())
                .then(text => setContent(text))
                .catch(() => setContent("Failed to load CNC file content."))
                .finally(() => setLoading(false));
        }
    }, [open, isCNC, attachment]);

    if (!attachment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        {isPdf ? <FileText className="h-5 w-5 text-red-600" /> : <Cpu className="h-5 w-5 text-blue-600" />}
                        {attachment.fileName}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 bg-muted/20 relative">
                    {isPdf ? (
                        <iframe src={attachment.url} className="w-full h-full border-none" title="PDF Preview" />
                    ) : isCNC ? (
                        content ? (
                            <TAPVisualizer content={content} />
                        ) : (
                             <div className="p-12 flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 opacity-20" /></div>
                        )
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Preview not available for this file type.
                        </div>
                    )}
                </div>
                <DialogFooter className="p-4 border-t bg-background">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={() => downloadFile(attachment.url, attachment.fileName)}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
                        <Image src={image.url} alt={image.fileName} fill className="object-contain" priority={index === startIndex} sizes="100vw" />
                    </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AttachmentPreview = ({ att, order, onDelete, onImageClick, onPreview, canDelete }: { att: OrderAttachment, order: Order, onDelete: () => void, onImageClick: (attachment: OrderAttachment) => void, onPreview: (attachment: OrderAttachment) => void, canDelete: boolean }) => {
    const isImage = att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = att.fileName.match(/\.(mp3|wav|ogg|webm)$/i);
    const isPdf = att.fileName.toLowerCase().endsWith('.pdf');
    const isCNC = att.fileName.toLowerCase().endsWith('.tap');
    const { updateOrder } = useOrders();
    const { toast } = useToast();
    
    const isMain = order.mainImageUrl === att.url;

    const setAsMain = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateOrder({ id: order.id, mainImageUrl: att.url });
        toast({ title: "Main Image Updated" });
    };

    return (
        <Card className={cn("group relative overflow-hidden transition-all", isMain && "ring-2 ring-primary shadow-lg")}>
            <CardContent className="p-0 aspect-video flex items-center justify-center bg-muted/50 relative">
                {isMain && <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest">Thumbnail</div>}
                {isImage ? (
                    <div onClick={() => onImageClick(att)} className="relative w-full h-full cursor-pointer">
                        <Image src={att.url} alt={att.fileName} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                            <Eye className="h-8 w-8 text-white" />
                            {!isMain && canDelete && (
                                <Button size="sm" variant="secondary" onClick={setAsMain} className="h-7 text-[9px] font-bold uppercase rounded-full">Set as Main</Button>
                            )}
                        </div>
                    </div>
                ) : isAudio ? (
                    <div className="p-4 w-full"><audio src={att.url} controls className="w-full h-10" /></div>
                ) : (
                    <div className="flex flex-col items-center gap-2 p-4 w-full">
                        {isPdf ? <FileText className="h-10 w-10 text-red-600" /> : isCNC ? <Cpu className="h-10 w-10 text-blue-600" /> : <File className="h-10 w-10 text-muted-foreground" />}
                        <p className="text-xs text-center text-muted-foreground truncate w-full px-2">{att.fileName}</p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full mt-2">
                             {(isPdf || isCNC) && <Button size="sm" variant="outline" onClick={() => onPreview(att)} className="h-7 text-[10px] px-2 flex-1"><Eye className="h-3 w-3 mr-1" /> Preview</Button>}
                             <Button size="sm" variant="outline" onClick={() => downloadFile(att.url, att.fileName)} className="h-7 text-[10px] px-2 flex-1"><Download className="h-3 w-3 mr-1" /> Download</Button>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-2 bg-background/95 flex justify-between items-center">
                 <p className="text-[10px] text-muted-foreground truncate flex-1">{att.fileName}</p>
                 {canDelete && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 v-6 text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Attachment?</AlertDialogTitle><AlertDialogDescription>This will permanently delete '{att.fileName}'.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
            </CardFooter>
        </Card>
    );
}

const ProductDetails = ({ product, order, productIndex, onImageClick, onAttachmentDelete, onDesignAttachmentDelete, isDesigner, onDesignUpload, onFilePreview, canEdit }: { product: Product, order: Order, productIndex: number, onImageClick: (attachment: OrderAttachment) => void, onAttachmentDelete: (attachment: OrderAttachment) => void, onDesignAttachmentDelete: (attachment: OrderAttachment) => void, isDesigner: boolean, onDesignUpload: (file: File, progressKey?: string) => Promise<any>, onFilePreview: (attachment: OrderAttachment) => void, canEdit: boolean }) => {
    const { settings: colorSettings } = useColorSettings();
    const { items: secondaryItems, categories: secondaryCategories, loading: secondaryLoading } = useSecondaryItems();
    const { uploadFile, uploadProgress } = useOrders();
    const firestore = useFirestore();
    const { toast } = useToast();
    const allColorOptions = [...(colorSettings?.woodFinishes || []), ...(colorSettings?.customColors || [])];
    const designInputRef = useRef<HTMLInputElement>(null);
    const [activeUploads, setActiveUploads] = useState<{ id: string; name: string; type: string; progressKey: string }[]>([]);
    const [itemSearch, setItemSearch] = useState("");
    const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            for (const file of files) {
                const taskId = uuidv4();
                const progressKey = `${file.name}-${taskId}`;
                let type = 'other';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.name.toLowerCase().endsWith('.pdf')) type = 'pdf';
                else if (file.name.toLowerCase().endsWith('.tap')) type = 'cnc';
                setActiveUploads(prev => [...prev, { id: taskId, name: file.name, type, progressKey }]);
                try { await onDesignUpload(file, progressKey); } finally { setActiveUploads(prev => prev.filter(u => u.id !== taskId)); }
            }
            if (designInputRef.current) designInputRef.current.value = "";
        }
    };

    const handleAddItem = async (item: SecondaryItem) => {
        const currentBOM = product.bomItems || [];
        if (currentBOM.find(i => i.itemId === item.id)) { toast({ variant: "destructive", title: "Already added" }); return; }
        const updated = [...currentBOM, { itemId: item.id, name: item.name, quantity: 1, unit: item.unit, imageUrl: item.imageUrl }];
        const orderRef = doc(firestore, 'orders', order.id);
        const updatedProducts = [...(order.products || [])];
        if (updatedProducts[productIndex]) {
            updatedProducts[productIndex].bomItems = updated;
            await updateDoc(orderRef, { products: updatedProducts });
            toast({ title: "BOM Saved" });
        }
        setIsItemPopoverOpen(false);
    };

    const handleRemoveBOMItem = async (idx: number) => {
        const updated = (product.bomItems || []).filter((_, i) => i !== idx);
        const orderRef = doc(firestore, 'orders', order.id);
        const updatedProducts = [...(order.products || [])];
        if (updatedProducts[productIndex]) {
            updatedProducts[productIndex].bomItems = updated;
            await updateDoc(orderRef, { products: updatedProducts });
            toast({ title: "Item Removed" });
        }
    };

    const handleUpdateQty = async (idx: number, qty: number) => {
        const updated = [...(product.bomItems || [])];
        updated[idx].quantity = qty;
        const orderRef = doc(firestore, 'orders', order.id);
        const updatedProducts = [...(order.products || [])];
        if (updatedProducts[productIndex]) {
            updatedProducts[productIndex].bomItems = updated;
            await updateDoc(orderRef, { products: updatedProducts });
        }
    };

    const filteredSecondaryItems = secondaryItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.category.toLowerCase().includes(itemSearch.toLowerCase()));
    const { user } = useUser();
    const canEditBOM = (isDesigner || order.ownerId === user?.id || canEdit) && ['Designing', 'In Progress'].includes(order.status);
    const allAttachments = [...(product.attachments || []).map(a => ({ ...a, origin: 'customer' })), ...(product.designAttachments || []).map(a => ({ ...a, origin: 'design' }))];
    const imageAttachments = allAttachments.filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));
    const pdfAttachments = allAttachments.filter(att => att.fileName.toLowerCase().endsWith('.pdf'));
    const cncAttachments = allAttachments.filter(att => att.fileName.toLowerCase().endsWith('.tap'));

    return (
        <AccordionItem value={product.id}>
            <AccordionTrigger className="font-bold text-lg">{product.productName || "Unnamed Product"}</AccordionTrigger>
            <AccordionContent className="space-y-8 pl-2">
                <Card><CardHeader><CardTitle>Description</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{product.description}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Specifications</CardTitle></CardHeader><CardContent className="space-y-4">
                        {product.material && <div className="flex items-center gap-3"><Box className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Materials: {Array.isArray(product.material) ? product.material.join(', ') : product.material}</span></div>}
                        {product.colors && product.colors.length > 0 && product.colors[0] !== 'As Attached Picture' && (
                            <div className="flex items-start gap-3"><Palette className="h-4 w-4 text-muted-foreground mt-1"/><div className="w-full"><span className="text-sm">Colors:</span><ScrollArea className="w-full mt-2 whitespace-nowrap"><div className="flex gap-4 pb-4">{product.colors.map(colorName => {
                                const colorOption = allColorOptions.find(c => c.name === colorName);
                                if (!colorOption) return <Badge key={colorName} variant="secondary">{colorName}</Badge>;
                                if ('imageUrl' in colorOption) return <div key={colorName} className="flex flex-col items-center gap-2 min-w-[100px]"><Image src={colorOption.imageUrl} alt={colorName} width={100} height={100} className="rounded-md object-cover h-24 w-full"/><span className="text-xs font-medium text-center truncate w-full">{colorName}</span></div>;
                                if ('colorValue' in colorOption) return <div key={colorName} className="flex flex-col items-center gap-2 min-w-[100px]"><div style={{ backgroundColor: colorOption.colorValue }} className="h-24 w-full rounded-md border" /><span className="text-xs font-medium text-center truncate w-full">{colorName}</span></div>;
                                return null;
                            })}</div></ScrollArea></div></div>
                        )}
                        {product.dimensions && <div className="flex items-center gap-3"><Ruler className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Dims: {product.dimensions.width}x{product.dimensions.height}x{product.dimensions.depth}cm</span></div>}
                    </CardContent></Card>
                <Card className={cn(canEditBOM && "border-primary/20 bg-primary/5")}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Bill of Materials</CardTitle></div>
                        {canEditBOM && (
                            <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                                <PopoverTrigger asChild><Button size="sm" className="h-8"><PlusCircle className="h-4 w-4 mr-2" /> Add Item</Button></PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="end">
                                    <div className="p-2 border-b bg-muted/20"><div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" /><Input placeholder="Search materials..." className="h-8 pl-8 text-xs" value={itemSearch} onChange={e => setItemSearch(e.target.value)}/></div></div>
                                    <ScrollArea className="h-64">
                                        {secondaryLoading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div> : filteredSecondaryItems.map(item => (
                                            <button key={item.id} type="button" className="w-full text-left p-3 hover:bg-muted border-b last:border-0 flex items-center gap-3" onClick={() => handleAddItem(item)}>
                                                <div className="h-10 w-10 rounded-md bg-muted shrink-0 relative overflow-hidden border">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <Package className="h-4 w-4 opacity-60" />}</div>
                                                <div className="min-w-0"><p className="text-xs font-bold truncate">{item.name}</p><p className="text-[10px] text-muted-foreground">{item.category} • {item.unit}</p></div>
                                            </button>
                                        ))}
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {product.bomItems?.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-background/80 shadow-sm group">
                                    <div className="flex items-center gap-3 min-w-0 flex-grow">
                                        <div className="h-10 w-10 rounded bg-muted shrink-0 relative overflow-hidden border">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <Package className="h-5 w-5 m-auto opacity-20" />}</div>
                                        <div className="min-w-0"><p className="text-xs font-bold truncate">{item.name}</p><p className="text-[9px] text-muted-foreground uppercase">{item.unit}</p></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canEditBOM ? <Input type="number" className="h-7 w-16 text-right text-xs font-bold" defaultValue={item.quantity} onBlur={e => handleUpdateQty(i, parseFloat(e.target.value) || 0)} /> : <div className="text-sm font-bold text-primary">{item.quantity} {item.unit}</div>}
                                        {canEditBOM && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleRemoveBOMItem(i)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                    </div>
                                </div>
                            )) || <div className="col-span-full py-8 text-center text-xs text-muted-foreground italic border-2 border-dashed rounded-lg">No material items defined yet.</div>}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Technical Documentation</h3>
                        {(isDesigner || canEdit) && (
                            <div>
                                <input type="file" resize-multiple="true" multiple onChange={handleFileChange} className="hidden" ref={designInputRef} />
                                <Button size="sm" variant="outline" className="h-8 border-primary text-primary" onClick={() => designInputRef.current?.click()} disabled={activeUploads.length > 0}>
                                    {activeUploads.length > 0 ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <UploadCloud className="h-3 w-3 mr-2" />}
                                    Upload Technical File
                                </Button>
                            </div>
                        )}
                    </div>
                    {imageAttachments.length > 0 && (
                        <Card><CardHeader className="py-4"><CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Visual References</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{imageAttachments.map((att, i) => (
                            <AttachmentPreview key={i} att={att} order={order} onDelete={() => att.origin === 'customer' ? onAttachmentDelete(att) : onDesignAttachmentDelete(att)} onImageClick={onImageClick} onPreview={onFilePreview} canDelete={canEdit}/>
                        ))}</CardContent></Card>
                    )}
                    {pdfAttachments.length > 0 && (
                        <Card><CardHeader className="py-4"><CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Technical Drawings (PDF)</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{pdfAttachments.map((att, i) => (
                            <AttachmentPreview key={i} att={att} order={order} onDelete={() => att.origin === 'customer' ? onAttachmentDelete(att) : onDesignAttachmentDelete(att)} onImageClick={onImageClick} onPreview={onFilePreview} canDelete={canEdit}/>
                        ))}</CardContent></Card>
                    )}
                    {cncAttachments.length > 0 && (
                        <Card><CardHeader className="py-4"><CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2"><Cpu className="h-4 w-4" /> CNC Programs (.TAP)</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{cncAttachments.map((att, i) => (
                            <AttachmentPreview key={i} att={att} order={order} onDelete={() => att.origin === 'customer' ? onAttachmentDelete(att) : onDesignAttachmentDelete(att)} onImageClick={onImageClick} onPreview={onFilePreview} canDelete={canEdit}/>
                        ))}</CardContent></Card>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};

function StatusBadge({ status }: { status: OrderStatus }) {
    if (status === 'Pending') return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Draft</Badge>;
    return <Badge variant={statusVariantMap[status]}>{status}</Badge>;
}

function StatusChanger({ order, onStatusChange }: { order: Order; onStatusChange: (status: OrderStatus) => void }) {
  const statuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 h-auto py-1 px-2 hover:bg-muted/50 transition-colors">
          <StatusBadge status={order.status} />
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map(status => (
          <DropdownMenuItem key={status} disabled={order.status === status} onClick={() => onStatusChange(status)}>{status === 'Pending' ? 'Draft' : status}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesignerProfile({ userId, users }: { userId: string, users: AppUser[] }) {
    const profile = users.find(u => u.id === userId); if (!profile) return null;
    return ( 
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Avatar className="h-6 w-6 ring-2 ring-background shrink-0"><AvatarImage src={profile.avatarUrl} /><AvatarFallback className="text-[8px]">{profile.name?.split(" ").map(n => n[0]).join("") || '?'}</AvatarFallback></Avatar></TooltipTrigger><TooltipContent><p className="text-xs">{profile.name}</p></TooltipContent></Tooltip></TooltipProvider> 
    );
}

function OrderDetailPageContent() {
  const params = useParams(); const id = params.id as string;
  const router = useRouter(); 
  const { getOrderById, updateOrder, removeAttachment, addAttachment, loading: ordersLoading } = useOrders();
  const { getCustomerById, loading: customersLoading } = useCustomers();
  const { users, loading: allUsersLoading } = useUsers();
  const { markOrderNotificationsAsRead } = useNotifications();
  const { user, role } = useUser();
  const searchParams = useSearchParams(); const { toast } = useToast();
  const [galleryOpen, setGalleryOpen] = useState(false); const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<OrderAttachment | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'specs');
  
  const orderData = getOrderById(id);
  const [optimisticOrder, setOptimisticOrder] = useOptimistic(orderData, (state, partial: Partial<Order>) => state ? { ...state, ...partial } : null);
  const order = optimisticOrder;

  useEffect(() => { if (order?.id) markOrderNotificationsAsRead(order.id); }, [order?.id, markOrderNotificationsAsRead]);

  const handleStatusChange = (newStatus: OrderStatus) => { if (orderData) { setOptimisticOrder({ status: newStatus } as any); updateOrder({ id: orderData.id, status: newStatus }); } };
  
  const handleImageClick = (clickedAttachment: OrderAttachment) => { 
    const rawImageAttachments = (order?.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]).filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));
    const allImageAttachments = order?.receiptAttachment ? [...rawImageAttachments, order.receiptAttachment] : rawImageAttachments;
    const imageIndex = allImageAttachments.findIndex(img => img.url === clickedAttachment.url); 
    if (imageIndex !== -1) { setGalleryStartIndex(imageIndex); setGalleryOpen(true); } 
  };

  if (ordersLoading || customersLoading || allUsersLoading || !order) return <OrderSkeleton />;
  const canEdit = (role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id)) && role !== 'AdminView';
  const isDesigner = role === 'Designer' || role === 'Admin';
  const allImageAttachments = (order.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]).filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));

  const downloadQRCode = async () => {
    const qrCanvas = document.getElementById('order-qr-code') as HTMLCanvasElement;
    if (!qrCanvas) return;
    const pngUrl = qrCanvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `order-qr-${order.id}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="flex flex-col gap-4 -mt-4 md:-mt-6 lg:-mt-8 animate-in fade-in duration-700">
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8 py-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">{order.uniqueName}</h1>
                        <StatusChanger order={order} onStatusChange={handleStatusChange} />
                        {order.assignedTo?.map(uid => <DesignerProfile key={uid} userId={uid} users={users} />)}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setQrDialogOpen(true)}><QrCode className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-6">
                    {order.products?.map((p, idx) => (
                        <ProductDetails key={p.id} product={p} order={order} productIndex={idx} onImageClick={handleImageClick} onAttachmentDelete={(att) => removeAttachment(order.id, idx, att, false)} onDesignAttachmentDelete={(att) => removeAttachment(order.id, idx, att, true)} isDesigner={isDesigner} onDesignUpload={(file, pk) => addAttachment(order.id, idx, file, true, pk)} onFilePreview={(att) => { setPreviewAttachment(att); setPreviewOpen(true); }} canEdit={canEdit} />
                    ))}
                </div>
            </div>
            <div className="space-y-8 py-4">
                <Card><CardHeader><CardTitle className="text-lg">Info</CardTitle></CardHeader><CardContent className="space-y-2"><div className="text-sm">Created: {formatTimestamp(order.creationDate)}</div><div className="text-sm">Deadline: {formatTimestamp(order.deadline)}</div><Separator /><div className="text-lg font-bold">Total: {formatCurrency(order.totalWithVat || order.incomeAmount)}</div></CardContent></Card>
                <div className="h-[500px] border rounded-xl overflow-hidden"><ChatInterface order={order} /></div>
            </div>
        </div>
        <div className="lg:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2"><TabsTrigger value="specs">Specs</TabsTrigger><TabsTrigger value="chat">Chat</TabsTrigger></TabsList>
                <TabsContent value="specs" className="space-y-6">{order.products?.map((p, idx) => <ProductDetails key={p.id} product={p} order={order} productIndex={idx} onImageClick={handleImageClick} onAttachmentDelete={(att) => removeAttachment(order.id, idx, att, false)} onDesignAttachmentDelete={(att) => removeAttachment(order.id, idx, att, true)} isDesigner={isDesigner} onDesignUpload={(file, pk) => addAttachment(order.id, idx, file, true, pk)} onFilePreview={(att) => { setPreviewAttachment(att); setPreviewOpen(true); }} canEdit={canEdit} />)}</TabsContent>
                <TabsContent value="chat" className="h-[calc(100vh-210px)]"><ChatInterface order={order} /></TabsContent>
            </Tabs>
        </div>
        <ImageGallery open={galleryOpen} onOpenChange={setGalleryOpen} images={allImageAttachments} startIndex={galleryStartIndex} />
        <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} attachment={previewAttachment} />

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
            <DialogPortal>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Order QR Code</DialogTitle>
                        <DialogDescription>Scan this code in the workshop to open this order instantly.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
                        <div className="p-4 bg-white rounded-3xl shadow-xl">
                            <QRCodeCanvas id="order-qr-code" value={`O:${order.id}`} size={200} level="H" includeMargin={false} />
                        </div>
                        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-center truncate w-full px-4">{order.uniqueName}</p>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setQrDialogOpen(false)} className="flex-1">Close</Button>
                        <Button onClick={downloadQRCode} className="flex-1"><Download className="mr-2 h-4 w-4" /> Download PNG</Button>
                    </DialogFooter>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    </div>
  );
}

export default function OrderDetailPage() { return ( <Suspense fallback={<OrderSkeleton />}><OrderDetailPageContent /></Suspense> ); }
