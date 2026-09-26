
"use client";

import { useState, useEffect, Suspense, useOptimistic, useTransition, useRef, useMemo } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useStock } from "@/hooks/use-stock";
import { notFound, useRouter, useSearchParams, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderAttachment, OrderStatus, type Order, Product, AppUser, BOMItem, SecondaryItem } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Hash, Palette, Ruler, Box, User, Image as ImageIcon, AlertTriangle, File, FileText, Edit, MoreVertical, ChevronsUpDown, Download, Trash2, Eye, Boxes, ShieldAlert, MessageSquare, Info, MapPin, Loader2, QrCode, X, Receipt, CreditCard, UploadCloud, CheckCircle2, PlayCircle, ListChecks, AlertCircle, Search, PlusCircle, Package, Plus, Cpu, ChevronLeft, ChevronRight, FlaskConical, ShoppingCart } from "lucide-react";
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
  DialogDescription,
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

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Find Bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        lines.forEach(p => {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.x);
        });

        const margin = 40;
        const width = canvas.width - margin * 2;
        const height = canvas.height - margin * 2;
        const scale = Math.min(width / (maxX - minX || 1), height / (maxY - minY || 1));

        const getX = (x: number) => margin + (x - minX) * scale;
        const getY = (y: number) => canvas.height - (margin + (y - minY) * scale); // Flip Y

        // Draw toolpath up to progress
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

        // Draw tool pointer
        if (limit > 0) {
            const current = lines[limit - 1];
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(getX(current.x), getY(current.y), 4, 0, Math.PI * 2);
            ctx.fill();
        }

    }, [lines, progress]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 relative bg-slate-900 rounded-lg overflow-hidden border">
                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={500} 
                    className="w-full h-full object-contain"
                />
            </div>
            <div className="p-4 bg-background border-t space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Machining Process</span>
                    <span className="text-primary">{Math.floor((progress / 100) * lines.length)} / {lines.length} Commands</span>
                </div>
                <Slider 
                    value={[progress]} 
                    onValueChange={(vals) => setProgress(vals[0])} 
                    max={100} 
                    step={1} 
                />
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

const AttachmentPreview = ({ att, order, onDelete, onImageClick, onPreview }: { att: OrderAttachment, order: Order, onDelete: () => void, onImageClick: (attachment: OrderAttachment) => void, onPreview: (attachment: OrderAttachment) => void }) => {
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
        toast({ title: "Main Image Updated", description: "Design thumbnail has been changed." });
    };

    return (
        <Card className={cn("group relative overflow-hidden transition-all", isMain && "ring-2 ring-primary shadow-lg")}>
            <CardContent className="p-0 aspect-video flex items-center justify-center bg-muted/50 relative">
                {isMain && (
                    <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-sm">
                        Thumbnail
                    </div>
                )}
                {isImage ? (
                    <div onClick={() => onImageClick(att)} className="relative w-full h-full cursor-pointer">
                        <Image src={att.url} alt={att.fileName} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                            <Eye className="h-8 w-8 text-white" />
                            {!isMain && (
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
                             {(isPdf || isCNC) && (
                                <Button size="sm" variant="outline" onClick={() => onPreview(att)} className="h-7 text-[10px] px-2 flex-1">
                                    <Eye className="h-3 w-3 mr-1" /> Preview
                                </Button>
                             )}
                             <Button size="sm" variant="outline" onClick={() => downloadFile(att.url, att.fileName)} className="h-7 text-[10px] px-2 flex-1"><Download className="h-3 w-3 mr-1" /> Download</Button>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-2 bg-background/95 flex justify-between items-center">
                 <p className="text-[10px] text-muted-foreground truncate flex-1" title={att.fileName}>{att.fileName}</p>
                 <div className="flex items-center gap-1">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete '{att.fileName}'.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </CardFooter>
        </Card>
    );
}

function StatusBadge({ status }: { status: OrderStatus }) {
    if (status === 'Pending') {
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Draft</Badge>;
    }
    return <Badge variant={statusVariantMap[status]}>{status}</Badge>;
}

function StatusChanger({ order, onStatusChange }: { order: Order; onStatusChange: (status: OrderStatus) => void }) {
  const statuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 h-auto py-1 px-2">
          <StatusBadge status={order.status} />
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map(status => (
          <DropdownMenuItem key={status} disabled={order.status === status} onClick={() => onStatusChange(status)}>
              {status === 'Pending' ? 'Draft' : status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ProductDetails = ({ product, order, productIndex, onImageClick, onAttachmentDelete, onDesignAttachmentDelete, isDesigner, onDesignUpload, onFilePreview }: { product: Product, order: Order, productIndex: number, onImageClick: (attachment: OrderAttachment) => void, onAttachmentDelete: (attachment: OrderAttachment) => void, onDesignAttachmentDelete: (attachment: OrderAttachment) => void, isDesigner: boolean, onDesignUpload: (file: File) => void, onFilePreview: (attachment: OrderAttachment) => void }) => {
    const { settings: colorSettings } = useColorSettings();
    const { items: secondaryItems, categories: secondaryCategories, loading: secondaryLoading, addSecondaryItem } = useSecondaryItems();
    const firestore = useFirestore();
    const { toast } = useToast();
    const allColorOptions = [...(colorSettings?.woodFinishes || []), ...(colorSettings?.customColors || [])];
    const designInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [itemSearch, setItemSearch] = useState("");
    const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
    const [isAddingNewCatalogItem, setIsAddingNewCatalogItem] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'pcs' });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            try {
                await onDesignUpload(e.target.files[0]);
            } finally {
                setIsUploading(false);
                if (designInputRef.current) designInputRef.current.value = "";
            }
        }
    };

    const updateProductBOM = async (newBOM: BOMItem[]) => {
        const orderRef = doc(firestore, 'orders', order.id);
        const updatedProducts = [...(order.products || [])];
        if (updatedProducts[productIndex]) {
            updatedProducts[productIndex].bomItems = newBOM;
            await updateDoc(orderRef, { products: updatedProducts });
            toast({ title: "BOM Saved" });
        }
    };

    const handleAddItem = (item: SecondaryItem) => {
        const currentBOM = product.bomItems || [];
        const exists = currentBOM.find(i => i.itemId === item.id);
        if (exists) {
            toast({ variant: "destructive", title: "Already added" });
            return;
        }
        const updated = [...currentBOM, { itemId: item.id, name: item.name, quantity: 1, unit: item.unit }];
        updateProductBOM(updated);
        setIsItemPopoverOpen(false);
    };

    const handleCreateNewCatalogItem = async () => {
        if (!newItem.name || !newItem.category) return;
        const success = await addSecondaryItem({
            name: newItem.name,
            category: newItem.category,
            unit: newItem.unit
        });
        if (success) {
            toast({ title: "Item Added to Catalog" });
            setIsAddingNewCatalogItem(false);
            setNewItem({ name: '', category: '', unit: 'pcs' });
        }
    };

    const handleRemoveBOMItem = (idx: number) => {
        const updated = (product.bomItems || []).filter((_, i) => i !== idx);
        updateProductBOM(updated);
    };

    const handleUpdateQty = (idx: number, qty: number) => {
        const updated = [...(product.bomItems || [])];
        updated[idx].quantity = qty;
        updateProductBOM(updated);
    };

    const filteredSecondaryItems = secondaryItems.filter(i => 
        i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
        i.category.toLowerCase().includes(itemSearch.toLowerCase())
    );

    const canEditBOM = (isDesigner || order.ownerId === order.id) && ['Designing', 'In Progress'].includes(order.status);

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
                        {product.colors?.includes("As Attached Picture") && <div className="flex items-center gap-3"><ImageIcon className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Color as attached picture.</span></div>}
                        {product.dimensions && <div className="flex items-center gap-3"><Ruler className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Dims: {product.dimensions.width}x{product.dimensions.height}x{product.dimensions.depth}cm</span></div>}
                    </CardContent></Card>
                
                <Card className={cn(canEditBOM && "border-primary/20 bg-primary/5")}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ListChecks className="h-5 w-5 text-primary" /> Bill of Materials
                            </CardTitle>
                        </div>
                        {canEditBOM && (
                            <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button size="sm" className="h-8">
                                        <PlusCircle className="h-4 w-4 mr-2" /> Add Item
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="end">
                                    <div className="p-2 border-b bg-muted/20">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                            <Input 
                                                placeholder="Search materials..." 
                                                className="h-8 pl-8 text-xs" 
                                                value={itemSearch}
                                                onChange={e => setItemSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <ScrollArea className="h-64">
                                        {secondaryLoading ? (
                                            <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>
                                        ) : filteredSecondaryItems.length === 0 ? (
                                            <div className="p-4 text-center">
                                                <p className="text-xs text-muted-foreground mb-4">No catalog items found.</p>
                                                <Button size="sm" variant="outline" className="w-full text-[10px]" onClick={() => setIsAddingNewCatalogItem(true)}>
                                                    <Package className="h-3 w-3 mr-1" /> Create New Catalog Item
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                {filteredSecondaryItems.map(item => (
                                                    <button 
                                                        key={item.id} 
                                                        type="button" 
                                                        className="w-full text-left p-3 hover:bg-muted border-b last:border-0 flex items-center gap-3"
                                                        onClick={() => handleAddItem(item)}
                                                    >
                                                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                                                            <Package className="h-4 w-4 opacity-60" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold truncate">{item.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{item.category} • {item.unit}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                                <div className="p-2">
                                                    <Button size="sm" variant="ghost" className="w-full text-[10px] border-t" onClick={() => setIsAddingNewCatalogItem(true)}>
                                                        <Plus className="h-3 w-3 mr-1" /> New Item to Catalog
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {product.bomItems && product.bomItems.length > 0 ? (
                                product.bomItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-background/80 shadow-sm group">
                                        <div className="min-w-0 flex-grow">
                                            <p className="text-xs font-bold truncate">{item.name}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase">{item.unit}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {canEditBOM ? (
                                                <Input 
                                                    type="number" 
                                                    className="h-7 w-16 text-right text-xs font-bold" 
                                                    defaultValue={item.quantity} 
                                                    onBlur={e => handleUpdateQty(i, parseFloat(e.target.value) || 0)}
                                                />
                                            ) : (
                                                <div className="text-sm font-bold text-primary">
                                                    {item.quantity} {item.unit}
                                                </div>
                                            )}
                                            {canEditBOM && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleRemoveBOMItem(i)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-8 text-center text-xs text-muted-foreground italic border-2 border-dashed rounded-lg">
                                    No material items defined yet.
                                </div>
                            )}
                        </div>
                        {product.billOfMaterials && (
                            <div className="mt-4 bg-background/80 p-4 rounded-md border text-sm whitespace-pre-wrap font-mono leading-relaxed italic">
                                {product.billOfMaterials}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {product.attachments && product.attachments.length > 0 && (
                    <Card><CardHeader><CardTitle>Customer Attachments</CardTitle></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {product.attachments.map((att) => <AttachmentPreview key={att.storagePath} att={att} order={order} onDelete={() => onAttachmentDelete(att)} onImageClick={onImageClick} onPreview={onFilePreview} />)}
                    </CardContent></Card>
                )}

                <Card className={cn(isDesigner && "border-primary/40 bg-primary/5")}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Design Attachments</CardTitle>
                        {isDesigner && (
                            <div>
                                <input type="file" ref={designInputRef} onChange={handleFileChange} className="hidden" />
                                <Button size="sm" variant="outline" className="h-8 border-primary text-primary" onClick={() => designInputRef.current?.click()} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <UploadCloud className="h-3 w-3 mr-2" />}
                                    Upload Technical File
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {product.designAttachments && product.designAttachments.length > 0 ? (
                            product.designAttachments.map((att) => <AttachmentPreview key={att.storagePath} att={att} order={order} onDelete={() => onDesignAttachmentDelete(att)} onImageClick={onImageClick} onPreview={onFilePreview} />)
                        ) : (
                            <div className="col-span-full py-8 text-center text-xs text-muted-foreground italic border-2 border-dashed rounded-lg">
                                No design files uploaded yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </AccordionContent>

            <Dialog open={isAddingNewCatalogItem} onOpenChange={setIsAddingNewCatalogItem}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Catalog Material</DialogTitle>
                        <DialogDescription>Add a new item to the organization-wide material catalog.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Item Name</Label>
                            <Input id="name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Hettich Soft Close Hinge" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={newItem.category} onValueChange={v => setNewItem({...newItem, category: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {secondaryCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="unit">Unit</Label>
                                <Select value={newItem.unit} onValueChange={v => setNewItem({...newItem, unit: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pcs">pcs</SelectItem>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="liter">liter</SelectItem>
                                        <SelectItem value="meters">meters</SelectItem>
                                        <SelectItem value="set">set</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddingNewCatalogItem(false)}>Cancel</Button>
                        <Button onClick={handleCreateNewCatalogItem}>Create Item</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AccordionItem>
    );
}

function DesignerProfile({ userId, users }: { userId: string, users: AppUser[] }) {
    const profile = users.find(u => u.id === userId); if (!profile) return null;
    return ( 
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 ring-2 ring-background shrink-0">
                        <AvatarImage src={profile.avatarUrl} />
                        <AvatarFallback className="text-[8px]">{profile.name?.split(" ").map(n => n[0]).join("") || '?'}</AvatarFallback>
                    </Avatar>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{profile.name}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider> 
    );
}

function OrderDetailPageContent() {
  const params = useParams(); const id = params.id as string;
  const router = useRouter(); 
  const { getOrderById, deleteOrder, updateOrder, removeAttachment, addAttachment, loading: ordersLoading } = useOrders();
  const { addStockItem } = useStock();
  const { getCustomerById, loading: customersLoading } = useCustomers();
  const { users, loading: allUsersLoading } = useUsers();
  const { markOrderNotificationsAsRead } = useNotifications();
  const { settings: brandSettings } = useBrandSettings();
  const { user, role } = useUser();
  const searchParams = useSearchParams(); const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [galleryOpen, setGalleryOpen] = useState(false); const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [finishDesignOpen, setFinishDesignOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<OrderAttachment | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  const orderData = getOrderById(id);
  const [optimisticOrder, setOptimisticOrder] = useOptimistic(orderData, (state, partial: Partial<Order>) => state ? { ...state, ...partial } : null);
  const order = optimisticOrder;

  useEffect(() => {
    if (order?.id) {
        markOrderNotificationsAsRead(order.id);
    }
  }, [order?.id, markOrderNotificationsAsRead]);

  if (ordersLoading || customersLoading || allUsersLoading || !order) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  
  const customer = getCustomerById(order.customerId);
  const canEdit = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);
  const canChangeStatus = ['Admin', 'Manager'].includes(role || '');
  const isDesigner = role === 'Designer';
  const canViewSensitiveData = role === 'Admin' || role === 'Sales';
  const prepaid = order.prepaidAmount || 0;
  const isPaid = order.paymentStatus === 'Paid';

  const rawImageAttachments = (order.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]).filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));
  const allImageAttachments = order.receiptAttachment ? [...rawImageAttachments, order.receiptAttachment] : rawImageAttachments;

    const handleCancel = () => { if (!orderData) return; startTransition(async () => { setOptimisticOrder({ status: "Cancelled" } as any); await updateOrder({ id: orderData.id, status: "Cancelled" }); toast({ title: "Order Cancelled", description: `Order ${order.uniqueName} cancelled.` }); }); }
    const handleDelete = () => { if (!orderData) return; const allAttachments = (orderData.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]); if(orderData.receiptAttachment) allAttachments.push(orderData.receiptAttachment); deleteOrder(orderData.id, allAttachments); toast({ title: "Order Deleted", description: `${order.uniqueName} deleted.` }); router.push("/orders"); };
    const handleToggleUrgent = () => { if (!orderData) return; startTransition(async () => { setOptimisticOrder({ isUrgent: !orderData.isUrgent } as any); await updateOrder({ id: orderData.id, isUrgent: !orderData.isUrgent }); }); };
    const handleStatusChange = (newStatus: OrderStatus) => { if (!orderData) return; startTransition(async () => { setOptimisticOrder({ status: newStatus } as any); await updateOrder({ id: orderData.id, status: newStatus }); }); };
    const handleImageClick = (clickedAttachment: OrderAttachment) => { const imageIndex = allImageAttachments.findIndex(img => img.url === clickedAttachment.url); if (imageIndex !== -1) { setGalleryStartIndex(imageIndex); setGalleryOpen(true); } }
    const handleFilePreview = (att: OrderAttachment) => { setPreviewAttachment(att); setPreviewOpen(true); };

    const startDesign = () => {
        if (!user) return;
        handleStatusChange('Designing');
        if (!order.assignedTo?.includes(user.id)) {
            updateOrder({ id: order.id, assignedTo: arrayUnion(user.id) as any });
        }
        toast({ title: "Design Started", description: "Status updated to Designing." });
    };

    const confirmFinishDesign = () => {
        handleStatusChange('Design Ready');
        setFinishDesignOpen(false);
        toast({ title: "Design Finished", description: "Status updated to Design Ready." });
    };

    const transferToStock = async () => {
        if (!order.products || order.products.length === 0) return;
        setIsTransferring(true);
        try {
            for (const product of order.products) {
                await addStockItem({
                    name: `Sample: ${product.productName}`,
                    category: 'Finished Samples',
                    description: product.description || `From sample order ${order.uniqueName}`,
                    unit: 'pcs',
                    currentQuantity: product.quantity || 1,
                    icon: 'FlaskConical'
                });
            }
            await updateOrder({ id: order.id, isTransferredToStock: true });
            toast({ title: "Inventory Updated", description: "Units added to Finished Samples." });
        } catch (e) {
            toast({ variant: "destructive", title: "Transfer Failed" });
        } finally {
            setIsTransferring(false);
        }
    };

    const downloadQRCode = async () => {
        const qrCanvas = document.getElementById('order-qr-code') as HTMLCanvasElement;
        if (!qrCanvas) return;

        const width = 2400;
        const height = 400;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Background
        ctx.fillStyle = '#FFFFFF'; 
        ctx.fillRect(0, 0, width, height);

        // 2. QR Code
        const qrSize = 320;
        const padding = 40;
        ctx.fillStyle = 'white';
        ctx.fillRect(padding, padding, qrSize, qrSize);
        ctx.drawImage(qrCanvas, padding + 10, padding + 10, qrSize - 20, qrSize - 20);

        // 3. Project Name and Info
        ctx.fillStyle = '#1A1C1E';
        ctx.font = 'bold 70px sans-serif';
        const projectName = order.uniqueName || "";
        ctx.fillText(projectName, padding + qrSize + 80, padding + 140);

        const dateObj = order.creationDate ? (typeof order.creationDate === 'string' ? new Date(order.creationDate) : (order.creationDate as any).toDate?.() || new Date()) : null;
        if (dateObj) {
            ctx.font = '40px sans-serif';
            ctx.fillStyle = '#666';
            const dateText = `Date: ${dateObj.toLocaleDateString()}`;
            ctx.fillText(dateText, padding + qrSize + 80, padding + 240);
        }

        // 4. Logo (Far Right)
        if (brandSettings?.logoUrl) {
            const logoImg = new (window as any).Image();
            logoImg.crossOrigin = "anonymous";
            logoImg.src = brandSettings.logoUrl;
            await new Promise((resolve) => {
                logoImg.onload = () => {
                    const aspect = logoImg.width / logoImg.height;
                    const h = 280;
                    const w = h * aspect;
                    ctx.drawImage(logoImg, width - w - padding - 20, (height - h) / 2, w, h);
                    resolve(null);
                };
                logoImg.onerror = () => resolve(null);
            });
        }

        // Download
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `footer-${order.id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const mainContent = (
        <div className="space-y-6">
            {order.isSample && order.status === 'Completed' && !order.isTransferredToStock && (
                <Card className="border-orange-200 bg-orange-50/30 mx-1">
                    <CardContent className="flex items-center justify-between p-4 gap-4">
                        <div className="flex items-center gap-3">
                            <FlaskConical className="h-6 w-6 text-orange-600" />
                            <div>
                                <p className="text-sm font-bold text-orange-900 uppercase tracking-tight">Sample Ready</p>
                                <p className="text-xs text-orange-700">Add this finished piece to shop inventory.</p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 font-bold" onClick={transferToStock} disabled={isTransferring}>
                            {isTransferring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="mr-2 h-4 w-4" />}
                            Transfer to Stock
                        </Button>
                    </CardContent>
                </Card>
            )}
            
            {order.isSample && order.isTransferredToStock && (
                <div className="mx-1 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2 text-green-700 text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 className="h-4 w-4" /> Units Transferred to Stock
                </div>
            )}

            {isDesigner && (order.status === 'In Progress' || order.status === 'Designing') && (
                <Card className="border-primary/40 bg-primary/5 mx-1">
                    <CardContent className="flex items-center justify-between p-3 gap-4">
                        <div className="flex items-center gap-2">
                            <Boxes className="h-5 w-5 text-primary" />
                            <span className="text-sm font-bold uppercase tracking-tight">Design Task</span>
                        </div>
                        {order.status === 'In Progress' && (
                            <Button size="sm" className="font-bold" onClick={startDesign}>
                                <PlayCircle className="mr-2 h-4 w-4" /> Start
                            </Button>
                        )}
                        {order.status === 'Designing' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 font-bold" onClick={() => setFinishDesignOpen(true)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Finish
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={(order.products && order.products[0]?.id) || undefined}>
                {(order.products || []).map((product, index) => (
                    <ProductDetails 
                        key={product.id} 
                        product={product} 
                        order={order} 
                        productIndex={index}
                        onImageClick={handleImageClick} 
                        onAttachmentDelete={(att) => removeAttachment(order.id, index, att, false)} 
                        onDesignAttachmentDelete={(att) => removeAttachment(order.id, index, att, true)} 
                        isDesigner={isDesigner || role === 'Admin'}
                        onDesignUpload={(file) => addAttachment(order.id, index, file, true)}
                        onFilePreview={handleFilePreview}
                    />
                ))}
            </Accordion>
        </div>
    );

  return (
    <div className="flex flex-col gap-4 -mt-4 md:-mt-6 lg:-mt-8">
      <div className="w-full">
        <div className="px-1 py-4 mt-2">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">{order.uniqueName}</h1>
                         {canChangeStatus && (
                            <div className="flex items-center gap-2">
                                <StatusChanger order={order} onStatusChange={handleStatusChange} />
                                {order.assignedTo && order.assignedTo.length > 0 && (
                                    <div className="flex -space-x-2 ml-1">
                                        {order.assignedTo.map(uid => <DesignerProfile key={uid} userId={uid} users={users} />)}
                                    </div>
                                )}
                            </div>
                         )}
                        {isDesigner && (
                            <div className="flex items-center gap-2">
                                <StatusBadge status={order.status} />
                                {order.assignedTo && order.assignedTo.length > 0 && (
                                    <div className="flex -space-x-2 ml-1">
                                        {order.assignedTo.map(uid => <DesignerProfile key={uid} userId={uid} users={users} />)}
                                    </div>
                                )}
                            </div>
                        )}
                        {order.isSample && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1"><FlaskConical className="h-3 w-3" /> Sample</Badge>}
                        {order.isUrgent && <Badge variant="destructive" className="animate-pulse">Urgent</Badge>}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setQrDialogOpen(true)} title="Order QR Code"><QrCode className="h-4 w-4" /></Button>
                    {canEdit && (
                        <>
                        <Link href={`/orders/${order.id}/edit`}><Button variant="outline" size="icon" className="h-9 w-9"><Edit className="h-4 w-4" /></Button></Link>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleToggleUrgent}>
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    <span>{order.isUrgent ? "Remove Urgency" : "Mark as Urgent"}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Cancel Order</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will cancel the order.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Back</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCancel}>Cancel Order</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Delete Order</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </>
                    )}
                </div>
            </div>
        </div>

        <div className="mt-2">
            {/* Desktop Unified View */}
            <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {mainContent}
                </div>
                <div className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Order Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3"><Hash className="h-4 w-4 text-muted-foreground"/><span className="text-sm">ID: {formatOrderId(order.id)}</span></div>
                            <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Created: {formatTimestamp(order.creationDate)}</span></div>
                            <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Deadline: {formatTimestamp(order.deadline)}</span></div>
                            {order.location && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Location: {order.location.town}</span></div>}
                            {canViewSensitiveData && (
                            <>
                                <Separator />
                                {order.withReceipt && (
                                    <Card className="p-3 bg-primary/5 border border-primary/10 rounded-md mb-4">
                                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase mb-2"><Receipt className="h-3 w-3"/> Official Receipt Mode</div>
                                        <div className="space-y-2">
                                        {order.products?.map((p, idx) => (
                                            <div key={p.id || idx} className="flex justify-between items-center text-[11px]">
                                                <span className="text-muted-foreground">{p.productName} ({p.quantity || 1} pcs)</span>
                                                <span className="font-medium">{formatCurrency((p.price || 0) * (p.quantity || 1))}</span>
                                            </div>
                                        ))}
                                        <Separator className="bg-primary/10" />
                                        <div className="flex justify-between text-sm"><span>Base Price:</span><span>{formatCurrency(order.incomeAmount)}</span></div>
                                        <div className="flex justify-between text-sm text-muted-foreground"><span>VAT (15%):</span><span>+{formatCurrency(order.vatAmount || 0)}</span></div>
                                        <div className="flex justify-between font-bold border-t border-primary/20 pt-1"><span>Total Payable:</span><span>{formatCurrency(order.totalWithVat || order.incomeAmount)}</span></div>
                                        {order.receiptAttachment && <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-[10px]" onClick={() => handleImageClick(order.receiptAttachment!)}><ImageIcon className="h-3 w-3 mr-1"/> View Receipt</Button>}
                                        </div>
                                    </Card>
                                )}
                                <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Pre-paid</span><span className="text-sm font-semibold">{formatCurrency(prepaid)}</span></div>
                                <div className="flex items-center justify-between gap-3 font-bold"><span className="text-sm">Balance Due</span><span className="text-sm">{formatCurrency((order.totalWithVat || order.incomeAmount) - prepaid)}</span></div>
                                <div className="flex items-center justify-between gap-3 mt-4"><span className="text-sm text-muted-foreground">Payment Mode</span><div className="flex items-center gap-1 font-medium text-sm"><CreditCard className="h-3 w-3"/> {order.paymentMethod || 'Cash'}</div></div>
                                {order.bankName && <p className="text-[10px] text-muted-foreground text-right">{order.bankName} - {order.bankAccountNumber}</p>}
                                <div className="flex items-center justify-between gap-3 mt-2"><span className="text-sm text-muted-foreground">Payment Status</span><Badge variant={isPaid ? 'default' : 'secondary'}>{order.paymentStatus || 'Unpaid'}</Badge></div>
                                <Separator />
                                <p className="text-sm text-muted-foreground pt-2">{order.paymentDetails}</p>
                            </>
                            )}
                        </CardContent>
                    </Card>
                    {canViewSensitiveData && customer ? (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Customer</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-muted-foreground"/> 
                                    <Link href={`/customers/${customer.id}`} className="font-bold text-sm hover:underline">{customer.name}</Link>
                                </div>
                                {(customer.phoneNumbers || []).map((p, idx) => (
                                    <p key={idx} className="text-xs text-muted-foreground">
                                        <span className="font-bold mr-1 opacity-70">{p.type}:</span>
                                        {p.number}
                                    </p>
                                ))}
                            </CardContent>
                        </Card>
                    ) : null}

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Team Discussion</h3>
                        </div>
                        <div className="h-[600px] rounded-xl border bg-card overflow-hidden shadow-sm">
                        <ChatInterface order={order} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Tabbed View */}
            <div className="lg:hidden">
                <Tabs defaultValue="specs" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="specs" className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4" /> Specifications
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="flex items-center gap-2 relative">
                            <MessageSquare className="h-4 w-4" /> Team Chat
                            {/* We could add a notification dot here if needed */}
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="specs" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                        {mainContent}
                        
                        <Card className="mt-8">
                            <CardHeader><CardTitle className="text-lg">Order Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">ID:</span><span className="font-mono">#{order.id.slice(-8).toUpperCase()}</span></div>
                                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Deadline:</span><span className="font-bold">{formatTimestamp(order.deadline)}</span></div>
                                <Separator />
                                {canViewSensitiveData && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span>Total:</span><span className="font-bold">{formatCurrency(order.totalWithVat || order.incomeAmount)}</span></div>
                                        <div className="flex justify-between text-destructive"><span>Balance:</span><span className="font-bold">{formatCurrency((order.totalWithVat || order.incomeAmount) - prepaid)}</span></div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="chat" className="animate-in slide-in-from-right-2 duration-300">
                        <ChatInterface order={order} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
      </div>

      <ImageGallery open={galleryOpen} onOpenChange={setGalleryOpen} images={allImageAttachments} startIndex={galleryStartIndex} />
      
      <FilePreviewDialog 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
        attachment={previewAttachment} 
      />

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogPortal>
            <DialogContent className="sm:max-w-sm overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" /> Order QR Code
                    </DialogTitle>
                    <DialogDescription>Use this code for workshop tracking.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-white rounded-3xl shadow-xl">
                        <QRCodeCanvas 
                            id="order-qr-code" 
                            value={`O:${order.id}`} 
                            size={200} 
                            level="H" 
                            includeMargin={false}
                        />
                    </div>
                    <p className="mt-6 text-sm font-bold text-slate-700 uppercase tracking-widest">{order.uniqueName}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">#{order.id.slice(-8).toUpperCase()}</p>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="outline" onClick={() => setQrDialogOpen(false)} className="flex-1">Close</Button>
                    <Button onClick={downloadQRCode} className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Download PNG
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogPortal>
    </Dialog>

    <Dialog open={finishDesignOpen} onOpenChange={setFinishDesignOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" /> Confirm Design Submission
                </DialogTitle>
                <DialogDescription>
                    Please ensure the following technical requirements are met for production.
                </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
                {order.products?.map((p, idx) => {
                    const hasBOM = p.bomItems && p.bomItems.length > 0;
                    const hasDocs = p.designAttachments && p.designAttachments.length > 0;
                    const hasTAP = p.designAttachments?.some(att => att.fileName.toLowerCase().endsWith('.tap'));
                    
                    return (
                        <div key={p.id || idx} className="p-4 border rounded-lg bg-muted/20 space-y-3">
                            <p className="font-bold text-sm truncate">{p.productName}</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2">
                                        <ListChecks className="h-3.5 w-3.5" /> Bill of Materials
                                    </span>
                                    {hasBOM ? <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Added</Badge> : <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">Missing</Badge>}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5" /> Technical Drawings
                                    </span>
                                    {hasDocs ? <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Attached</Badge> : <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">Missing</Badge>}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2">
                                        <Boxes className="h-3.5 w-3.5" /> CNC Files (.tap)
                                    </span>
                                    {hasTAP ? <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Ready</Badge> : <Badge variant="outline" className="opacity-50">Optional / Missing</Badge>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setFinishDesignOpen(false)} className="flex-1">Back to Design</Button>
                <Button onClick={confirmFinishDesign} className="flex-1 bg-green-600 hover:bg-green-700">
                    Confirm & Mark Ready
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
}

export default function OrderDetailPage() { return ( <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}><OrderDetailPageContent /></Suspense> ); }
