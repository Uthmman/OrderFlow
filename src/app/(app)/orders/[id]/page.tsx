
"use client";

import { useState, useEffect, Suspense, useOptimistic, useTransition } from "react";
import { useOrders } from "@/hooks/use-orders";
import { notFound, useRouter, useSearchParams, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderAttachment, OrderStatus, type Order, type Customer, Product, AppUser } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Hash, Palette, Ruler, Box, User, Image as ImageIcon, AlertTriangle, File, FileText, Edit, MoreVertical, ChevronsUpDown, Download, Trash2, Link as LinkIcon, Eye, Printer, Boxes, ShieldAlert, MessageSquare, Info, MapPin, UploadCloud, Loader2, CheckCircle, PlusCircle, Search, Star, Share2, QrCode, X, RefreshCw } from "lucide-react";
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
  DialogClose,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/use-customers";
import { useUser, useUsers } from "@/hooks/use-user";
import { useColorSettings } from "@/hooks/use-color-settings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { QRCodeSVG } from "qrcode.react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const AttachmentPreview = ({ att, onDelete, onImageClick }: { att: OrderAttachment, onDelete: () => void, onImageClick: (attachment: OrderAttachment) => void }) => {
    const isImage = att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = att.fileName.match(/\.(mp3|wav|ogg|webm)$/i);
    const isPdf = att.fileName.toLowerCase().endsWith('.pdf');
    const { toast } = useToast();

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (navigator.share) {
            try { await navigator.share({ title: att.fileName, url: att.url }); } catch (err) {}
        } else {
             navigator.clipboard.writeText(att.url);
             toast({ title: "Link Copied" });
        }
    };

    return (
        <Card className="group relative overflow-hidden">
            <CardContent className="p-0 aspect-video flex items-center justify-center bg-muted/50">
                {isImage ? (
                    <div onClick={() => onImageClick(att)} className="relative w-full h-full cursor-pointer">
                        <Image src={att.url} alt={att.fileName} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Eye className="h-8 w-8 text-white" />
                        </div>
                    </div>
                ) : isAudio ? (
                    <div className="p-4 w-full"><audio src={att.url} controls className="w-full h-10" /></div>
                ) : (
                    <div className="flex flex-col items-center gap-2 p-4 w-full">
                        {isPdf ? <FileText className="h-10 w-10 text-red-600" /> : <File className="h-10 w-10 text-muted-foreground" />}
                        <p className="text-xs text-center text-muted-foreground truncate w-full px-2">{att.fileName}</p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full mt-2">
                             <Button size="sm" variant="outline" onClick={() => downloadFile(att.url, att.fileName)} className="h-7 text-[10px] px-2 flex-1"><Download className="h-3 w-3 mr-1" /> Download</Button>
                             <Button size="sm" variant="outline" onClick={handleShare} className="h-7 text-[10px] px-2 flex-1"><Share2 className="h-3 w-3 mr-1" /> Share</Button>
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

function StatusChanger({ order, onStatusChange }: { order: Order; onStatusChange: (status: OrderStatus) => void }) {
  const statuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 h-auto py-1 px-2">
          <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map(status => (
          <DropdownMenuItem key={status} disabled={order.status === status} onClick={() => onStatusChange(status)}>{status}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ProductDetails = ({ product, order, onImageClick, onAttachmentDelete, onDesignAttachmentDelete }: { product: Product, order: Order, onImageClick: (attachment: OrderAttachment) => void, onAttachmentDelete: (attachment: OrderAttachment) => void, onDesignAttachmentDelete: (attachment: OrderAttachment) => void }) => {
    const { settings: colorSettings } = useColorSettings();
    const allColorOptions = [...(colorSettings?.woodFinishes || []), ...(colorSettings?.customColors || [])];
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
                {product.attachments && product.attachments.length > 0 && (
                    <Card><CardHeader><CardTitle>Customer Attachments</CardTitle></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {product.attachments.map((att) => <AttachmentPreview key={att.storagePath} att={att} onDelete={() => onAttachmentDelete(att)} onImageClick={onImageClick} />)}
                    </CardContent></Card>
                )}
                {product.designAttachments && product.designAttachments.length > 0 && (
                     <Card><CardHeader><CardTitle>Design Attachments</CardTitle></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {product.designAttachments.map((att) => <AttachmentPreview key={att.storagePath} att={att} onDelete={() => onDesignAttachmentDelete(att)} onImageClick={onImageClick} />)}
                    </CardContent></Card>
                )}
            </AccordionContent>
        </AccordionItem>
    );
}

function DesignerProfile({ userId, users }: { userId: string, users: AppUser[] }) {
    const profile = users.find(u => u.id === userId); if (!profile) return null;
    return ( <TooltipProvider><Tooltip><TooltipTrigger asChild><Avatar className="h-6 w-6 ring-2 ring-background shrink-0"><AvatarImage src={profile.avatarUrl} /><AvatarFallback className="text-[8px]">{profile.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar></TooltipTrigger><TooltipContent><p className="text-xs">{profile.name}</p></TooltipContent></Tooltip></TooltipProvider> );
}

function OrderDetailPageContent() {
  const params = useParams(); const id = params.id as string;
  const { getOrderById, deleteOrder, updateOrder, removeAttachment, loading: ordersLoading } = useOrders();
  const { getCustomerById, loading: customersLoading } = useCustomers();
  const { users, loading: allUsersLoading } = useUsers();
  const { user, role } = useUser();
  const router = useRouter(); const searchParams = useSearchParams(); const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [galleryOpen, setGalleryOpen] = useState(false); const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  const orderData = getOrderById(id);
  const [optimisticOrder, setOptimisticOrder] = useOptimistic(orderData, (state, partial: Partial<Order>) => state ? { ...state, ...partial } : null);
  const order = optimisticOrder;

  if (ordersLoading || customersLoading || allUsersLoading || !order) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  
  const defaultTab = searchParams.get('tab') || 'details';
  const customer = getCustomerById(order.customerId);
  const canEdit = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);
  const canChangeStatus = ['Admin', 'Manager'].includes(role || '');
  const isDesigner = role === 'Designer';
  const canViewSensitiveData = role === 'Admin';
  const prepaid = order.prepaidAmount || 0; const balance = (order.incomeAmount || 0) - prepaid;
  const isPaid = (balance <= 0 && order.incomeAmount > 0) || order.paymentStatus === 'Paid';

  const allImageAttachments = (order.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]).filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || [];

    const handleCancel = () => { if (!orderData) return; startTransition(async () => { setOptimisticOrder({ status: "Cancelled" }); await updateOrder({ id: orderData.id, status: "Cancelled" }); toast({ title: "Order Cancelled", description: `Order ${order.uniqueName} cancelled.` }); }); }
    const handleDelete = () => { if (!orderData) return; const allAttachments = (orderData.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]); deleteOrder(orderData.id, allAttachments); toast({ title: "Order Deleted", description: `${order.uniqueName} deleted.` }); router.push("/orders"); };
    const handleToggleUrgent = () => { if (!orderData) return; startTransition(async () => { setOptimisticOrder({ isUrgent: !orderData.isUrgent }); await updateOrder({ id: orderData.id, isUrgent: !orderData.isUrgent }); }); };
    const handleStatusChange = (newStatus: OrderStatus) => { if (!orderData) return; startTransition(async () => { setOptimisticOrder({ status: newStatus }); await updateOrder({ id: orderData.id, status: newStatus }); }); };
    const handleImageClick = (clickedAttachment: OrderAttachment) => { const imageIndex = allImageAttachments.findIndex(img => img.url === clickedAttachment.url); if (imageIndex !== -1) { setGalleryStartIndex(imageIndex); setGalleryOpen(true); } }

  return (
    <>
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-4 flex-wrap"><h1 className="text-3xl font-bold font-headline tracking-tight">{order.uniqueName}</h1>
                     {canChangeStatus && <div className="flex items-center gap-2"><StatusChanger order={order} onStatusChange={handleStatusChange} />{order.assignedTo && order.assignedTo.length > 0 && <div className="flex -space-x-2 ml-2">{order.assignedTo.map(uid => <DesignerProfile key={uid} userId={uid} users={users} />)}</div>}</div>}
                    {isDesigner && <div className="flex items-center gap-2"><Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>{order.assignedTo && order.assignedTo.length > 0 && <div className="flex -space-x-2 ml-1">{order.assignedTo.map(uid => <DesignerProfile key={uid} userId={uid} users={users} />)}</div>}</div>}
                    {order.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                </div>
                 <h2 className="text-lg text-muted-foreground mt-1">{order.customerName} - {formatProductDisplay(order.products)}</h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="icon" onClick={() => setQrDialogOpen(true)} title="Order QR Code"><QrCode className="h-4 w-4" /></Button>
                {canEdit && (<>
                    <Link href={`/orders/${order.id}/edit`}><Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button></Link>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleToggleUrgent}><AlertTriangle className="mr-2 h-4 w-4" /><span>{order.isUrgent ? "Remove Urgency" : "Mark as Urgent"}</span></DropdownMenuItem>
                            <DropdownMenuSeparator /><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Cancel Order</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will cancel the order.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={handleCancel}>Cancel Order</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            <AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Delete Order</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DropdownMenuContent></DropdownMenu>
                    </>)}
            </div>
        </div>
      </div>
       <Tabs defaultValue={defaultTab} className="w-full lg:hidden"><TabsList><TabsTrigger value="details"><Info className="mr-2" /> Details</TabsTrigger><TabsTrigger value="chat"><MessageSquare className="mr-2" /> Chat</TabsTrigger></TabsList>
            <TabsContent value="details" className="mt-6"><div className="grid gap-8 grid-cols-1"><div className="space-y-8">{(order.products && order.products[0]?.billOfMaterials) && <Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" /> Bill of Materials</CardTitle></CardHeader><CardContent><div className="bg-background/80 p-4 rounded-md border text-sm whitespace-pre-wrap font-mono leading-relaxed">{order.products[0].billOfMaterials}</div></CardContent></Card>}
                       <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={(order.products && order.products[0]?.id) || undefined}>{(order.products || []).map((product, index) => <ProductDetails key={product.id} product={product} order={order} onImageClick={handleImageClick} onAttachmentDelete={(att) => removeAttachment(order.id, index, att, false)} onDesignAttachmentDelete={(att) => removeAttachment(order.id, index, att, true)} />)}</Accordion></div>
                    <div className="space-y-8"><Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-3"><Hash className="h-4 w-4 text-muted-foreground"/><span className="text-sm">ID: {formatOrderId(order.id)}</span></div><div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Created: {formatTimestamp(order.creationDate)}</span></div><div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Deadline: {formatTimestamp(order.deadline)}</span></div>{order.location && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Location: {order.location.town}</span></div>}
                                {canViewSensitiveData && (<><Separator /><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Total Price</span><span className="text-sm font-semibold">{formatCurrency(order.incomeAmount || 0)}</span></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Pre-paid</span><span className="text-sm font-semibold">{formatCurrency(prepaid)}</span></div><div className="flex items-center justify-between gap-3 font-bold"><span className="text-sm">Balance Due</span><span className="text-sm">{formatCurrency(balance)}</span></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Payment Status</span><Badge variant={isPaid ? 'default' : 'secondary'}>{order.paymentStatus || 'Unpaid'}</Badge></div><Separator /><p className="text-sm text-muted-foreground pt-2">{order.paymentDetails}</p></>)}
                            </CardContent></Card>
                        {canViewSensitiveData ? (customer ? <Card><CardHeader><CardTitle>Customer</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground"/> <Link href={`/customers/${customer.id}`} className="font-semibold hover:underline">{customer.name}</Link></div><p className="text-sm text-muted-foreground">{customer.email}</p><p className="text-sm text-muted-foreground">{customer.phoneNumbers?.find(p => p.type === 'Mobile')?.number}</p></CardContent></Card> : <Card><CardContent className="p-6">Customer not found.</CardContent></Card>) : <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="text-muted-foreground" /> Access Restricted</CardTitle></CardHeader></Card>}
                    </div></div></TabsContent>
            <TabsContent value="chat" className="mt-6"><ChatInterface order={order} /></TabsContent></Tabs>
        <div className="hidden lg:grid lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-8">{(order.products && order.products[0]?.billOfMaterials) && <Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" /> Bill of Materials</CardTitle></CardHeader><CardContent><div className="bg-background/80 p-4 rounded-md border text-sm whitespace-pre-wrap font-mono leading-relaxed">{order.products[0].billOfMaterials}</div></CardContent></Card>}
          <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={(order.products && order.products[0]?.id) || undefined}>
            {(order.products || []).map((product, index) => <ProductDetails key={product.id} product={product} order={order} onImageClick={handleImageClick} onAttachmentDelete={(att) => removeAttachment(order.id, index, att, false)} onDesignAttachmentDelete={(att) => removeAttachment(order.id, index, att, true)} />)}
          </Accordion>
        </div>
            <div className="space-y-8"><Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-3"><Hash className="h-4 w-4 text-muted-foreground"/><span className="text-sm">ID: {formatOrderId(order.id)}</span></div><div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Created: {formatTimestamp(order.creationDate)}</span></div><div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Deadline: {formatTimestamp(order.deadline)}</span></div>{order.location && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Location: {order.location.town}</span></div>}
                        {canViewSensitiveData && (<><Separator /><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Total Price</span><span className="text-sm font-semibold">{formatCurrency(order.incomeAmount || 0)}</span></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Pre-paid</span><span className="text-sm font-semibold">{formatCurrency(prepaid)}</span></div><div className="flex items-center justify-between gap-3 font-bold"><span className="text-sm">Balance Due</span><span className="text-sm">{formatCurrency(balance)}</span></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Payment Status</span><Badge variant={isPaid ? 'default' : 'secondary'}>{order.paymentStatus || 'Unpaid'}</Badge></div><Separator /><p className="text-sm text-muted-foreground pt-2">{order.paymentDetails}</p></>)}
                    </CardContent></Card>
                {canViewSensitiveData ? (customer ? <Card><CardHeader><CardTitle>Customer</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground"/> <Link href={`/customers/${customer.id}`} className="font-semibold hover:underline">{customer.name}</Link></div><p className="text-sm text-muted-foreground">{customer.email}</p><p className="text-sm text-muted-foreground">{customer.phoneNumbers?.find(p => p.type === 'Mobile')?.number}</p></CardContent></Card> : <Card><CardContent className="p-6">Customer not found.</CardContent></Card>) : <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="text-muted-foreground" /> Access Restricted</CardTitle></CardHeader></Card>}
                 <ChatInterface order={order} /></div></div>
      <ImageGallery open={galleryOpen} onOpenChange={setGalleryOpen} images={allImageAttachments} startIndex={galleryStartIndex} />
    </div>
    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Order QR Code</DialogTitle><DialogDescription>Scan this code using the internal OrderFlow scanner.</DialogDescription></DialogHeader>
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg"><QRCodeSVG id="order-qr-code" value={`ORDERFLOW-ORDER:${order.id}`} size={200} level="H" includeMargin={true} /><p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{order.uniqueName}</p></div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2"><Button variant="outline" onClick={() => setQrDialogOpen(false)} className="flex-1">Close</Button></DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function OrderDetailPage() { return ( <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}><OrderDetailPageContent /></Suspense> ); }
