
"use client";

import { useOrders } from "@/hooks/use-orders";
import { notFound, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, Hash, Palette, Ruler, Box, User, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { AIPrediction } from "@/components/app/ai-prediction";
import { ChatInterface } from "@/components/app/chat-interface";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { useCustomers } from "@/hooks/use-customers";

const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    "Pending": "outline",
    "In Progress": "secondary",
    "Designing": "secondary",
    "Manufacturing": "secondary",
    "Completed": "default",
    "Shipped": "default",
    "Cancelled": "destructive",
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { getOrderById, deleteOrder } = useOrders();
  const { getCustomerById } = useCustomers();
  const router = useRouter();
  const { toast } = useToast();
  
  const order = getOrderById(id);
  
  if (!order) {
    // Return loading or not found, but handle async nature
    const { loading: ordersLoading } = useOrders();
    if(ordersLoading) return <div>Loading order...</div>
    notFound();
  }

  const { customers, loading: customersLoading } = useCustomers();
  const customer = getCustomerById(order.customerId);

  const handleDelete = () => {
    deleteOrder(order.id);
    toast({
        title: "Order Deleted",
        description: `Order ${order.id} has been deleted.`,
    });
    router.push("/orders");
  };

  const prepaid = order.prepaidAmount || 0;
  const balance = order.incomeAmount - prepaid;


  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">
                        Order {order.id}
                    </h1>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>
                      {order.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                    </div>
                </div>
                <p className="text-muted-foreground mt-1">
                  Detailed view of order from {order.customerName}.
                </p>
            </div>
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
                        <DropdownMenuItem>Mark as Complete</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate Order</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                                Delete Order
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <AIPrediction order={order} />
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
                <CardContent className="space-y-3">
                    {order.material && <div className="flex items-center gap-3"><Box className="h-4 w-4 text-muted-foreground"/> <span className="text-sm">Material: {order.material}</span></div>}
                    {order.colors && order.colors.length > 0 && (
                        <div className="flex items-start gap-3">
                            <Palette className="h-4 w-4 text-muted-foreground mt-0.5"/>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-sm">Colors:</span>
                                {order.colors.map(color => <Badge key={color} variant="secondary">{color}</Badge>)}
                            </div>
                        </div>
                    )}
                    {order.colors?.includes("As Attached Picture") && (
                        <div className="flex items-center gap-3"><ImageIcon className="h-4 w-4 text-muted-foreground"/> <span className="text-sm">Color to be determined by attached picture.</span></div>
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
                        {order.attachments.map(att => (
                            <div key={att.fileName} className="group relative">
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
                                <p className="text-xs text-muted-foreground truncate mt-1">{att.fileName}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <ChatInterface orderId={order.id} />
        </div>
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Hash className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">ID: {order.id}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">Created: {new Date(order.creationDate).toLocaleDateString()}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">Deadline: {new Date(order.deadline).toLocaleDateString()}</span>
                    </div>
                    <Separator />
                     <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Total Price</span>
                        <span className="text-sm font-semibold">{formatCurrency(order.incomeAmount)}</span>
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

            {customersLoading ? (
                <Card><CardContent>Loading customer...</CardContent></Card>
            ) : customer ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Customer</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground"/> <span className="font-semibold">{customer.name}</span></div>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </CardContent>
                </Card>
            ) : (
                 <Card><CardContent>Customer not found.</CardContent></Card>
            )}
        </div>
      </div>
      <AlertDialog>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
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
    </div>
  );
}

    