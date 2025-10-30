
"use client";

import { use, useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { notFound, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderAttachment, OrderStatus, type Order, type Customer } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, Hash, Palette, Ruler, Box, User, Image as ImageIcon, AlertTriangle, File, Mic, Edit, MoreVertical, ChevronsUpDown, Download, Trash2, Link as LinkIcon, Eye, Printer, Boxes, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { ChatInterface } from "@/components/app/chat-interface";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatOrderId, formatTimestamp } from "@/lib/utils";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/use-customers";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useUser } from "@/hooks/use-user";
import { useColorSettings } from "@/hooks/use-color-settings";
import { ScrollArea } from "@/components/ui/scroll-area";


const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    "Pending": "outline",
    "In Progress": "secondary",
    "Designing": "secondary",
    "Manufacturing": "secondary",
    "Completed": "default",
    "Shipped": "default",
    "Cancelled": "destructive",
}

const AttachmentPreview = ({ att, onDelete, onImageClick }: { att: OrderAttachment, onDelete: () => void, onImageClick: (attachment: OrderAttachment) => void }) => {
    const isImage = att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = att.fileName.match(/\.(mp3|wav|ogg|webm)$/i);
    const { toast } = useToast();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(att.url);
        toast({ title: "Link Copied", description: "Attachment URL copied to clipboard." });
    }

    return (
        <Card className="group relative overflow-hidden">
            <CardContent className="p-0 aspect-video flex items-center justify-center bg-muted">
                {isImage ? (
                    <div onClick={() => onImageClick(att)} className="relative w-full h-full cursor-pointer">
                        <Image 
                            src={att.url} 
                            alt={att.fileName}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Eye className="h-8 w-8 text-white" />
                        </div>
                    </div>
                ) : isAudio ? (
                    <div className="p-4 w-full">
                       <audio src={att.url} controls className="w-full h-10" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                        <File className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-center text-muted-foreground truncate w-full">{att.fileName}</p>
                         <Button size="sm" variant="outline" asChild className="mt-2">
                            <a href={att.url} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" /> Download</a>
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-2 bg-background/95 flex justify-between items-center">
                 <p className="text-xs text-muted-foreground truncate flex-1" title={att.fileName}>{att.fileName}</p>
                 <div className="flex items-center">
                    {!isAudio && (
                         <>
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                            <a href={att.url} download={att.fileName}><Download className="h-4 w-4" /></a>
                        </Button>
                        </>
                    )}
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the attachment '{att.fileName}'.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Delete Attachment</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </CardFooter>
        </Card>
    );
}

function StatusChanger({ order, onStatusChange }: { order: Order; onStatusChange: (status: OrderStatus) => void }) {
  const statuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Manufacturing", "Completed", "Shipped", "Cancelled"];

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
          <DropdownMenuItem
            key={status}
            disabled={order.status === status}
            onSelect={() => onStatusChange(status)}
          >
            {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OrderReceiptDialog({ order, customer }: { order: Order, customer: Customer | null }) {
    
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const receiptContent = document.getElementById('receipt-content')?.innerHTML;
            if (receiptContent) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Order Receipt - ${formatOrderId(order.id)}</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                @media print {
                                    body { -webkit-print-color-adjust: exact; }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="p-8">
                                ${receiptContent}
                            </div>
                        </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                // Delay print to ensure styles are applied
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    }
    
    const prepaid = order.prepaidAmount || 0;
    const balance = (order.incomeAmount || 0) - prepaid;

    return (
        <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Order Receipt: {formatOrderId(order.id)}</DialogTitle>
                <DialogDescription>
                    A summary of the order for printing or saving as a PDF.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[70vh]">
                <div id="receipt-content" className="bg-white text-black p-8 md:p-12 font-sans">
                    <header className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-3">
                        <Boxes className="h-10 w-10 text-slate-800" />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">OrderFlow</h1>
                            <p className="text-slate-500">Order Receipt</p>
                        </div>
                        </div>
                        <div className="text-right">
                        <h2 className="text-2xl font-bold">{formatOrderId(order.id)}</h2>
                        <p className="text-slate-500">
                            Order Date: {formatTimestamp(order.creationDate)}
                        </p>
                        </div>
                    </header>
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="font-semibold text-slate-600 mb-2 border-b pb-1">Billed To</h3>
                            {customer ? (
                                <>
                                <p className="font-bold text-lg">{customer.name}</p>
                                {customer.location?.town && <p>{customer.location.town}</p>}
                                {customer.email && <p>{customer.email}</p>}
                                <p>{customer.phoneNumbers?.find((p) => p.type === "Mobile")?.number}</p>
                                </>
                            ) : (
                                <p>Customer not found.</p>
                            )}
                        </div>
                        <div className="text-right">
                            <h3 className="font-semibold text-slate-600 mb-2 border-b pb-1">Payment Status</h3>
                            <Badge
                                className={`text-lg ${ balance <= 0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                {balance <= 0 ? "Paid in Full" : "Balance Due"}
                            </Badge>
                        </div>
                    </div>
                    <div className="mb-8">
                        <h3 className="font-semibold text-slate-600 mb-2 border-b pb-1">Order Summary</h3>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                <th className="text-left py-2 font-semibold">Description</th>
                                <th className="text-right py-2 font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                <td className="py-4 align-top">
                                    <p className="font-semibold">{order.material || "Custom Product"}</p>
                                    <p className="text-sm text-slate-600 max-w-prose">
                                    {order.description}
                                    </p>
                                </td>
                                <td className="text-right py-4 font-semibold">
                                    {formatCurrency(order.incomeAmount)}
                                </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mb-8">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="font-semibold">{formatCurrency(order.incomeAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Pre-paid Amount</span>
                                <span className="font-semibold text-green-600">-{formatCurrency(prepaid)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Balance Due</span>
                                <span>{formatCurrency(balance)}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-600 mb-2">Notes</h3>
                        <p className="text-sm text-slate-500">
                        Payment details: {order.paymentDetails || "Not specified."}
                        <br />
                        Thank you for your business!
                        </p>
                    </div>
                    <footer className="text-center mt-12 text-xs text-slate-400 border-t pt-4">
                        <p>OrderFlow Inc. | 123 Business Rd, Commerce City, USA</p>
                        <p>This is a computer-generated receipt and does not require a signature.</p>
                    </footer>
                </div>
            </ScrollArea>
            <DialogFooter className="p-4 bg-muted border-t">
                 <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={handlePrint}><Printer className="mr-2"/> Print or Save as PDF</Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = use(params);
  const { getOrderById, deleteOrder, updateOrder, loading: ordersLoading } = useOrders();
  const { getCustomerById, loading: customersLoading } = useCustomers();
  const { settings: colorSettings, loading: colorsLoading } = useColorSettings();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  
  if (ordersLoading || customersLoading || userLoading || colorsLoading) {
    return <div>Loading...</div>;
  }
  
  const order = getOrderById(id);
  
  if (!order) {
    notFound();
  }

  const allColorOptions = [
    ...(colorSettings?.woodFinishes || []),
    ...(colorSettings?.customColors || []),
  ];

  const customer = getCustomerById(order.customerId);
  const canEdit = user?.role === 'Admin';
  const canViewSensitiveData = user?.role === 'Admin' || (user?.role === 'Sales' && order.ownerId === user.id);

  const imageAttachments = order.attachments?.filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || [];

    const handleCancel = () => {
        if (!order) return;
        updateOrder({ ...order, status: "Cancelled" });
        toast({
            title: "Order Cancelled",
            description: `Order ${formatOrderId(order.id)} has been cancelled.`,
        });
    }

    const handleDelete = () => {
        if (!order) return;
        deleteOrder(order.id, order.attachments);
        toast({
            title: "Order Deleted",
            description: `${formatOrderId(order.id)} has been deleted.`,
        });
        router.push("/orders");
    };

    const handleToggleUrgent = () => {
        if (!order) return;
        updateOrder({ ...order, isUrgent: !order.isUrgent });
        toast({
            title: `Urgency ${order.isUrgent ? "Removed" : "Added"}`,
            description: `${formatOrderId(order.id)} has been updated.`,
        });
    };

    const handleStatusChange = (newStatus: OrderStatus) => {
        if (!order) return;
        updateOrder({ ...order, status: newStatus });
        toast({
            title: "Status Updated",
            description: `Order ${formatOrderId(order.id)} status changed to ${newStatus}.`
        });
    };
    
    const handleDuplicate = () => {
        if (!order) return;
        router.push(`/orders/new?duplicate=${order.id}`);
    }

    const handleDeleteAttachment = (attachmentToDelete: OrderAttachment) => {
        if (!order) return;
        const updatedAttachments = order.attachments?.filter(
            (att) => att.storagePath !== attachmentToDelete.storagePath
        );
        updateOrder({ ...order, attachments: updatedAttachments }, [], [attachmentToDelete]);
        toast({
            title: "Attachment Deleted",
            description: `${attachmentToDelete.fileName} has been removed.`,
        });
    };

    const handleImageClick = (clickedAttachment: OrderAttachment) => {
        const imageIndex = imageAttachments.findIndex(img => img.url === clickedAttachment.url);
        if (imageIndex !== -1) {
            setGalleryStartIndex(imageIndex);
            setGalleryOpen(true);
        }
    }


  const prepaid = order.prepaidAmount || 0;
  const balance = (order.incomeAmount || 0) - prepaid;


  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">
                        {formatOrderId(order.id)}
                    </h1>
                    <div className="flex items-center gap-2">
                        {canEdit ? (
                           <StatusChanger order={order} onStatusChange={handleStatusChange} />
                        ) : (
                          order.status && <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>
                        )}
                        {order.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                    </div>
                </div>
                <p className="text-muted-foreground mt-1">
                  {canViewSensitiveData ? `Detailed view of order from ${order.customerName}.` : 'Detailed view of order.'}
                </p>
            </div>
            {canEdit && (
                <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Printer />
                            </Button>
                        </DialogTrigger>
                        { canViewSensitiveData ? (
                            <OrderReceiptDialog order={order} customer={customer} />
                         ) : (
                             <DialogContent><DialogHeader><DialogTitle>Access Denied</DialogTitle></DialogHeader><p>You do not have permission to view receipt details.</p></DialogContent>
                         )}
                    </Dialog>
                    <Link href={`/orders/${order.id}/edit`}>
                        <Button>
                          <Edit className="mr-2" />
                          Edit Order
                        </Button>
                    </Link>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleToggleUrgent}>
                                <AlertTriangle className="mr-2 h-4 w-4" /> 
                                <span>{order.isUrgent ? "Remove Urgency" : "Mark as Urgent"}</span>
                            </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDuplicate}>
                                Duplicate Order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                    Cancel Order
                                </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will cancel the order. This can be undone by changing the order status.
                                            To delete the order permanently, use the 'Delete Order' option.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Back</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCancel}>Cancel Order</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                        Delete Order
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the order
                                            and remove its data from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Order Description</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{order.description}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {order.material && <div className="flex items-center gap-3"><Box className="h-4 w-4 text-muted-foreground"/> <span className="text-sm">Material: {order.material}</span></div>}
                    
                    {order.colors && order.colors.length > 0 && order.colors[0] !== 'As Attached Picture' && (
                        <div className="flex items-start gap-3">
                            <Palette className="h-4 w-4 text-muted-foreground mt-1"/>
                             <div className="w-full">
                                <span className="text-sm">Colors:</span>
                                <Carousel opts={{ align: "start", dragFree: true }} className="w-full mt-2">
                                    <CarouselContent className="-ml-2">
                                        {order.colors.map(colorName => {
                                            const colorOption = allColorOptions.find(c => c.name === colorName);
                                            if (!colorOption) return (
                                                <CarouselItem key={colorName}  className="basis-1/3 md:basis-1/4 lg:basis-1/5 pl-2">
                                                    <Badge variant="secondary">{colorName}</Badge>
                                                </CarouselItem>
                                            );

                                            if ('imageUrl' in colorOption) {
                                                return (
                                                    <CarouselItem key={colorName} className="basis-1/3 md:basis-1/4 lg:basis-1/5 pl-2">
                                                        <div className="flex flex-col items-center gap-2" title={colorName}>
                                                            <Image src={colorOption.imageUrl} alt={colorName} width={100} height={100} className="rounded-md object-cover h-24 w-full"/>
                                                            <span className="text-xs font-medium text-center truncate w-full">{colorName}</span>
                                                        </div>
                                                    </CarouselItem>
                                                )
                                            }

                                            if ('colorValue' in colorOption) {
                                                return (
                                                    <CarouselItem key={colorName} className="basis-1/3 md:basis-1/4 lg:basis-1/5 pl-2">
                                                        <div className="flex flex-col items-center gap-2" title={colorName}>
                                                            <div style={{ backgroundColor: colorOption.colorValue }} className="h-24 w-full rounded-md border" />
                                                            <span className="text-xs font-medium text-center truncate w-full">{colorName}</span>
                                                        </div>
                                                    </CarouselItem>
                                                )
                                            }
                                            return null;
                                        })}
                                    </CarouselContent>
                                    <CarouselPrevious className="ml-12" />
                                    <CarouselNext className="mr-12" />
                                </Carousel>
                             </div>
                        </div>
                    )}

                    {order.colors?.includes("As Attached Picture") && (
                        <div className="flex items-center gap-3"><ImageIcon className="h-4 w-4 text-muted-foreground"/> <span className="text-sm">Color as attached picture.</span></div>
                    )}

                    {order.dimensions && <div className="flex items-center gap-3"><Ruler className="h-4 w-4 text-muted-foreground"/> <span className="text-sm">Dims: {order.dimensions.width}x{order.dimensions.height}x{order.dimensions.depth}cm</span></div>}
                </CardContent>
            </Card>

             {order.attachments && order.attachments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Attachments</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {order.attachments.map((att) => (
                           <AttachmentPreview 
                                key={att.storagePath} 
                                att={att} 
                                onDelete={() => handleDeleteAttachment(att)}
                                onImageClick={handleImageClick}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}

            <ChatInterface order={order} />
        </div>
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Hash className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">ID: {formatOrderId(order.id)}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">Created: {formatTimestamp(order.creationDate)}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">Deadline: {formatTimestamp(order.deadline)}</span>
                    </div>
                    
                    {canViewSensitiveData && (
                        <>
                        <Separator />
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">Total Price</span>
                            <span className="text-sm font-semibold">{formatCurrency(order.incomeAmount || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">Pre-paid</span>
                            <span className="text-sm font-semibold">{formatCurrency(prepaid)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 font-bold">
                            <span className="text-sm">Balance Due</span>
                            <span className="text-sm">{formatCurrency(balance)}</span>
                        </div>
                        <Separator />
                        <p className="text-sm text-muted-foreground pt-2">{order.paymentDetails}</p>
                        </>
                    )}
                </CardContent>
            </Card>

            {canViewSensitiveData ? (
                <>
                    {customer ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Customer</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground"/> <Link href={`/customers/${customer.id}`} className="font-semibold hover:underline">{customer.name}</Link></div>
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                                <p className="text-sm text-muted-foreground">{customer.phoneNumbers?.find(p => p.type === 'Mobile')?.number}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card><CardContent className="p-6">Customer not found or loading...</CardContent></Card>
                    )}
                </>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-muted-foreground" /> Access Restricted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">You do not have permission to view customer and pricing information for this order.</p>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
      
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-6xl p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Image Gallery</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[80vh] w-full">
            <Carousel
              opts={{ align: "start", loop: true, startIndex: galleryStartIndex }}
              className="w-full"
            >
              <CarouselContent>
                {imageAttachments.map((att, index) => (
                  <CarouselItem key={index}>
                    <div className="relative h-[calc(80vh-4rem)]">
                      <Image
                        src={att.url}
                        alt={att.fileName}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex justify-between items-center bg-background p-2 border-t">
                      <p className="text-sm text-muted-foreground">{att.fileName}</p>
                      <a href={att.url} download={att.fileName} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </a>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </ScrollArea>
           <DialogFooter className="p-4 border-t bg-muted">
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    