
"use client";

import { use, useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { notFound, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderAttachment, OrderStatus, type Order } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, Hash, Palette, Ruler, Box, User, Image as ImageIcon, AlertTriangle, File, Mic, Edit, MoreVertical } from "lucide-react";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/use-customers";
import { customColorOptions, woodFinishOptions } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useUser } from "@/hooks/use-user";


const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    "Pending": "outline",
    "In Progress": "secondary",
    "Designing": "secondary",
    "Manufacturing": "secondary",
    "Completed": "default",
    "Shipped": "default",
    "Cancelled": "destructive",
}

const allColorOptions = [...woodFinishOptions, ...customColorOptions];

const AttachmentPreview = ({ att }: { att: OrderAttachment }) => {
    const isImage = att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = att.fileName.match(/\.(mp3|wav|ogg|webm)$/i);

    if (isImage) {
        return (
            <Link href={att.url} target="_blank" rel="noopener noreferrer" className="relative group">
                <Image 
                    src={att.url} 
                    alt={att.fileName}
                    width={200}
                    height={150}
                    className="rounded-lg object-cover aspect-video"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <Button variant="secondary" size="sm">View</Button>
                </div>
            </Link>
        )
    }

    if (isAudio) {
        return (
             <div className="bg-muted rounded-lg flex flex-col items-center justify-center aspect-video p-4">
                <Mic className="h-10 w-10 text-muted-foreground" />
                <audio src={att.url} controls className="w-full mt-4 h-8" />
            </div>
        )
    }

    return (
        <Link href={att.url} target="_blank" rel="noopener noreferrer" className="relative group">
            <div className="bg-muted rounded-lg flex flex-col items-center justify-center aspect-video p-4 group-hover:bg-muted/80">
                <File className="h-10 w-10 text-muted-foreground" />
                <Button variant="link" size="sm" className="mt-2 text-center">View File</Button>
            </div>
        </Link>
    )
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = use(params);
  const { getOrderById, deleteOrder, updateOrder, loading: ordersLoading } = useOrders();
  const { getCustomerById, loading: customersLoading } = useCustomers();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  if (ordersLoading || customersLoading || userLoading) {
    return <div>Loading...</div>;
  }
  
  const order = getOrderById(id);
  
  if (!order) {
    notFound();
  }

  const customer = getCustomerById(order.customerId);
  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';

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

    const handleMarkAsComplete = () => {
        if (!order) return;
        updateOrder({ ...order, status: "Completed" });
        toast({
            title: "Order Completed",
            description: `Order ${formatOrderId(order.id)} has been marked as complete.`,
        });
    };
    
    const handleDuplicate = () => {
        if (!order) return;
        router.push(`/orders/new?duplicate=${order.id}`);
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
                      {order.status && <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>}
                      {order.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                    </div>
                </div>
                <p className="text-muted-foreground mt-1">
                  Detailed view of order from {order.customerName}.
                </p>
            </div>
            {canEdit && (
                <div className="flex items-center gap-2">
                    <Link href={`/orders/${order.id}/edit`}>
                        <Button>Edit Order</Button>
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
                            <DropdownMenuItem onClick={handleMarkAsComplete}>
                                Mark as Complete
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
                    <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {order.attachments.map((att, index) => (
                            <div key={index} className="group relative">
                               <AttachmentPreview att={att} />
                               <p className="text-xs text-muted-foreground truncate mt-1">{att.fileName}</p>
                            </div>
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
                </CardContent>
            </Card>

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
        </div>
      </div>
    </div>
  );
}
