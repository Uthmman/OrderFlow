
"use client";

import { useState, useRef, useEffect, Suspense, useOptimistic, useTransition } from "react";
import { useOrders } from "@/hooks/use-orders";
import { notFound, useRouter, useSearchParams, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderAttachment, OrderStatus, type Order, type Customer, Product, AppUser } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Hash, Palette, Ruler, Box, User, Image as ImageIcon, AlertTriangle, File, FileText, Edit, MoreVertical, ChevronsUpDown, Download, Trash2, Link as LinkIcon, Eye, Printer, Boxes, ShieldAlert, MessageSquare, Info, MapPin, UploadCloud, Loader2, CheckCircle, PlusCircle, Search, Star, Share2, QrCode, X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/use-customers";
import { cn } from "@/lib/utils";
import { useUser, useUsers } from "@/hooks/use-user";
import { useColorSettings } from "@/hooks/use-color-settings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { useSecondaryItems } from "@/hooks/use-secondary-items";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { QRCodeSVG } from "qrcode.react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";


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

const AttachmentPreview = ({ att, onDelete, onImageClick }: { att: OrderAttachment, onDelete: () => void, onImageClick: (attachment: OrderAttachment) => void }) => {
    const isImage = att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = att.fileName.match(/\.(mp3|wav|ogg|webm)$/i);
    const isPdf = att.fileName.toLowerCase().endsWith('.pdf');
    const { toast } = useToast();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(att.url);
        toast({ title: "Link Copied", description: "Attachment URL copied to clipboard." });
    }

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({ title: att.fileName, url: att.url });
            } catch (err) {}
        } else {
            copyToClipboard();
        }
    };

    const handlePrint = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(att.url, '_blank');
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        downloadFile(att.url, att.fileName);
    };

    return (
        <Card className="group relative overflow-hidden">
            <CardContent className="p-0 aspect-video flex items-center justify-center bg-muted/50">
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
                    <div className="flex flex-col items-center gap-2 p-4 w-full">
                        {isPdf ? <FileText className="h-10 w-10 text-red-600" /> : <File className="h-10 w-10 text-muted-foreground" />}
                        <p className="text-xs text-center text-muted-foreground truncate w-full px-2">{att.fileName}</p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full mt-2">
                             <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 text-[10px] px-2 flex-1">
                                <Download className="h-3 w-3 mr-1" /> Download
                            </Button>
                            {isPdf && (
                                <>
                                    <Button size="sm" variant="outline" onClick={handlePrint} className="h-7 text-[10px] px-2 flex-1">
                                        <Printer className="h-3 w-3 mr-1" /> Print
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleShare} className="h-7 text-[10px] px-2 flex-1">
                                        <Share2 className="h-3 w-3 mr-1" /> Share
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-2 bg-background/95 flex justify-between items-center">
                 <p className="text-[10px] text-muted-foreground truncate flex-1" title={att.fileName}>{att.fileName}</p>
                 <div className="flex items-center">
                    {!isAudio && !isImage && (
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                            <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                    )}
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80 hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
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
          <DropdownMenuItem
            key={status}
            disabled={order.status === status}
            onClick={() => onStatusChange(status)}
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
                            <title>Order Receipt - ${order.uniqueName}</title>
                            <script src="https://cdn.tailwindcss.com"><\/script>
                            <style>
                                @media print {
                                    body { -webkit-print-color-adjust: exact; }
                                    .no-print { display: none; }
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
                <DialogTitle>Order Receipt: {order.uniqueName}</DialogTitle>
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
                        <h2 className="text-2xl font-bold">{order.uniqueName}</h2>
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
                                {(order.products || []).map((product, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="py-4 align-top">
                                            <p className="font-semibold">{product.productName}</p>
                                            <p className="text-sm text-slate-600 max-w-prose">
                                            {product.description}
                                            </p>
                                        </td>
                                        <td className="text-right py-4 font-semibold">
                                            {index === 0 ? formatCurrency(order.incomeAmount) : ''}
                                        </td>
                                    </tr>
                                ))}
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

const ProductDetails = ({ product, order, onImageClick, onAttachmentDelete, onDesignAttachmentDelete }: { product: Product, order: Order, onImageClick: (attachment: OrderAttachment) => void, onAttachmentDelete: (attachment: OrderAttachment) => void, onDesignAttachmentDelete: (attachment: OrderAttachment) => void }) => {
    const { settings: colorSettings, loading: colorsLoading } = useColorSettings();
    const allColorOptions = [
        ...(colorSettings?.woodFinishes || []),
        ...(colorSettings?.customColors || []),
    ];

    return (
        <AccordionItem value={product.id}>
            <AccordionTrigger className="font-bold text-lg">{product.productName || "Unnamed Product"}</AccordionTrigger>
            <AccordionContent className="space-y-8 pl-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Product Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{product.description}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Specifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {product.material && (
                            <div className="flex items-center gap-3">
                                <Box className="h-4 w-4 text-muted-foreground"/> 
                                <span className="text-sm">Materials: {Array.isArray(product.material) ? product.material.join(', ') : product.material}</span>
                            </div>
                        )}
                        
                        {product.colors && product.colors.length > 0 && product.colors[0] !== 'As Attached Picture' && (
                            <div className="flex items-start gap-3">
                                <Palette className="h-4 w-4 text-muted-foreground mt-1"/>
                                <div className="w-full">
                                    <span className="text-sm">Colors:</span>
                                    <ScrollArea className="w-full mt-2 whitespace-nowrap">
                                        <div className="flex gap-4 pb-4">
                                            {product.colors.map(colorName => {
                                                const colorOption = allColorOptions.find(c => c.name === colorName);
                                                if (!colorOption) return (
                                                    <Badge key={colorName} variant="secondary">{colorName}</Badge>
                                                );

                                                if ('imageUrl' in colorOption) {
                                                    return (
                                                        <div key={colorName} className="flex flex-col items-center gap-2 min-w-[100px]" title={colorName}>
                                                            <Image src={colorOption.imageUrl} alt={colorName} width={100} height={100} className="rounded-md object-cover h-24 w-full"/>
                                                            <span className="text-xs font-medium text-center truncate w-full">{colorName}</span>
                                                        </div>
                                                    )
                                                }

                                                if ('colorValue' in colorOption) {
                                                    return (
                                                        <div key={colorName} className="flex flex-col items-center gap-2 min-w-[100px]" title={colorName}>
                                                            <div style={{ backgroundColor: colorOption.colorValue }} className="h-24 w-full rounded-md border" />
                                                            <span className="text-xs font-medium text-center truncate w-full">{colorName}</span>
                                                        </div>
                                                    )
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}

                        {product.colors?.includes("As Attached Picture") && (
                            <div className="flex items-center gap-3"><ImageIcon className="h-4 w-4 text-muted-foreground"/> <span className="text-sm">Color as attached picture.</span></div>
                        )}

                        {product.dimensions && <div className="flex items-center gap-3"><Ruler className="h-4 w-4 text-muted-foreground"/> <span className="text-sm">Dims: {product.dimensions.width}x{product.dimensions.height}x{product.dimensions.depth}cm</span></div>}
                    </CardContent>
                </Card>

                {product.attachments && product.attachments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Attachments</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {product.attachments.map((att) => (
                            <AttachmentPreview 
                                    key={att.storagePath} 
                                    att={att} 
                                    onDelete={() => onAttachmentDelete(att)}
                                    onImageClick={onImageClick}
                                />
                            ))}
                        </CardContent>
                    </Card>
                )}

                {product.designAttachments && product.designAttachments.length > 0 && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Design Attachments</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {product.designAttachments.map((att) => (
                            <AttachmentPreview 
                                    key={att.storagePath} 
                                    att={att} 
                                    onDelete={() => onDesignAttachmentDelete(att)}
                                    onImageClick={onImageClick}
                                />
                            ))}
                        </CardContent>
                    </Card>
                )}
            </AccordionContent>
        </AccordionItem>
    );
}

const UNIT_CHOICES = [
    { label: "piece(pc)", value: "piece(pc)" },
    { label: "liter(l)", value: "liter(l)" },
    { label: "Meter(m)", value: "Meter(m)" },
    { label: "Box", value: "Box" },
];

function FinishDesignDialog({ open, onOpenChange, order, productIndex, onFinished }: { open: boolean, onOpenChange: (open: boolean) => void, order: Order, productIndex: number, onFinished: (bom: string, attachments: OrderAttachment[], mainImageUrl?: string) => void }) {
    const { addAttachment, uploadProgress } = useOrders();
    const { items: secondaryItems, categories: secondaryCategories, loading: secondaryLoading, addSecondaryItem } = useSecondaryItems();
    const { role } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [bom, setBom] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [bomEstimatedTotal, setBomEstimatedTotal] = useState(0);
    const { toast } = useToast();
    const [uploadedFiles, setUploadedFiles] = useState<OrderAttachment[]>([]);
    const [mainImageUrl, setMainImageUrl] = useState<string | undefined>(order.mainImageUrl);
    
    const [isAddingNewToCatalog, setIsAddingNewToCatalog] = useState(false);
    const [newCatalogItem, setNewCatalogItem] = useState({ name: '', unit: 'piece(pc)', category: '', price: 0, quantity: 1 });

    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

    const isAdmin = role === 'Admin';

    useEffect(() => {
        if (!open) {
            setUploadedFiles([]);
            setBom('');
            setIsUploading(false);
            setItemSearch('');
            setBomEstimatedTotal(0);
            setItemQuantities({});
            setMainImageUrl(order.mainImageUrl);
            setIsAddingNewToCatalog(false);
            setNewCatalogItem({ name: '', unit: 'piece(pc)', category: '', price: 0, quantity: 1 });
        }
    }, [open, order.mainImageUrl]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const uploadPromises = Array.from(files).map(file => 
                addAttachment(order.id, productIndex, file, true)
            );
            
            const results = await Promise.all(uploadPromises);
            const newAttachments = results.filter((res): res is OrderAttachment => res !== undefined);

            if (newAttachments.length > 0) {
                setUploadedFiles(prev => [...prev, ...newAttachments]);
                if (!mainImageUrl) {
                    const firstImage = newAttachments.find(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));
                    if (firstImage) setMainImageUrl(firstImage.url);
                }
                toast({
                    title: `${newAttachments.length} file(s) uploaded`,
                    description: "The design files have been staged.",
                });
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Upload Failed",
                description: (error as Error).message || "Could not upload design files.",
            });
        } finally {
            setIsUploading(false);
            if (event.target) {
                event.target.value = '';
            }
        }
    };
    
    const handleSubmit = () => {
        if (uploadedFiles.length === 0) {
            toast({
                variant: "destructive",
                title: "No Files Uploaded",
                description: "Please upload at least one design file."
            });
            return;
        }
        if (!bom.trim()) {
            toast({
                variant: "destructive",
                title: "BOM Required",
                description: "Please provide the Bill of Materials."
            });
            return;
        }

        onFinished(bom, uploadedFiles, mainImageUrl);
        onOpenChange(false);
    }
    
    const handleRemoveFile = (fileToRemove: OrderAttachment) => {
        setUploadedFiles(prev => prev.filter(file => file.url !== fileToRemove.url));
        if (mainImageUrl === fileToRemove.url) setMainImageUrl(undefined);
    }

    const filteredItems = secondaryItems.filter(item => 
        item.name.toLowerCase().includes(itemSearch.toLowerCase())
    );

    const handleQuantityChange = (itemId: string, val: string) => {
        const num = parseInt(val) || 0;
        setItemQuantities(prev => ({ ...prev, [itemId]: num }));
    };

    const handleAddItemToBOM = (item: any, overrideQty?: number) => {
        const itemId = item.id || 'custom-' + Date.now();
        const qty = overrideQty !== undefined ? overrideQty : (itemQuantities[itemId] !== undefined ? itemQuantities[itemId] : 1);
        
        if (qty <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid Quantity",
                description: "Please enter a quantity greater than 0."
            });
            return;
        }

        setBom(prev => {
            const newItemLine = `- ${item.name}${item.unit ? ` (${item.unit})` : ''}: ${qty}`;
            return prev ? `${prev}\n${newItemLine}` : newItemLine;
        });
        
        if (isAdmin && item.price) {
            setBomEstimatedTotal(prev => prev + (item.price! * qty));
        }

        toast({
            title: "Item Added",
            description: `${item.name} (${qty}) added to BOM.`
        });
    };

    const handleAddNewToCatalog = async () => {
        if (!newCatalogItem.name.trim() || !newCatalogItem.category) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please fill in all required fields." });
            return;
        }
        const success = await addSecondaryItem({
            name: newCatalogItem.name,
            unit: newCatalogItem.unit,
            price: newCatalogItem.price,
            category: newCatalogItem.category
        });

        if (success) {
            toast({ title: "Catalog Updated", description: `${newCatalogItem.name} added to shared catalog.` });
            handleAddItemToBOM(newCatalogItem, newCatalogItem.quantity);
            setIsAddingNewToCatalog(false);
            setNewCatalogItem({ name: '', unit: 'piece(pc)', category: '', price: 0, quantity: 1 });
        }
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Finish Design & Submit BOM</DialogTitle>
                    <DialogDescription>
                        Upload final design files and provide the Bill of Materials.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div 
                        className="border-2 border-dashed border-muted rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
                                <p className="text-muted-foreground">Uploading files...</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                                <p className="font-semibold">Click to upload or drag & drop</p>
                                <p className="text-xs text-muted-foreground">PDF, AI, PSD, PNG, etc.</p>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </div>
                     {Object.keys(uploadProgress).length > 0 && (
                        <div className="space-y-2 pt-4">
                            <h4 className="text-sm font-medium">Uploading...</h4>
                            {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                <div key={fileName} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="truncate">{fileName}</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Staged Files (Select Star for Main Icon):</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-60 overflow-y-auto pr-2">
                                {uploadedFiles.map(file => {
                                    const isImage = file.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                                    const isMain = mainImageUrl === file.url;
                                    return (
                                        <div key={file.url} className={cn("relative group border rounded-md p-1 bg-muted/50 overflow-hidden", isMain && "ring-2 ring-primary border-primary")}>
                                            <div className="aspect-video relative mb-1 flex items-center justify-center bg-background rounded-sm">
                                                {isImage ? (
                                                    <Image src={file.url} alt={file.fileName} fill className="object-cover" />
                                                ) : (
                                                    <File className="h-8 w-8 text-muted-foreground" />
                                                )}
                                                {isImage && (
                                                    <button 
                                                        onClick={() => setMainImageUrl(isMain ? undefined : file.url)}
                                                        className={cn("absolute top-1 right-1 p-1 rounded-full shadow-sm transition-colors", 
                                                            isMain ? "bg-primary text-white" : "bg-white/80 text-gray-400 hover:text-primary")}
                                                    >
                                                        <Star className={cn("h-4 w-4", isMain && "fill-current")} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-1 px-1">
                                                <span className="text-[10px] truncate max-w-[80%] font-medium">{file.fileName}</span>
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveFile(file)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Item Catalog (Secondary Source)</Label>
                            <div className="flex gap-2 mb-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search materials..." 
                                        value={itemSearch} 
                                        onChange={(e) => setItemSearch(e.target.value)}
                                        className="h-8 pl-7 text-xs"
                                    />
                                </div>
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsAddingNewToCatalog(true)}>
                                    <PlusCircle className="h-3 w-3 mr-1" /> New
                                </Button>
                            </div>

                            {isAddingNewToCatalog ? (
                                <div className="p-3 border rounded-md bg-muted/20 space-y-3">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider">New Catalog Item</h5>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex gap-2">
                                            <Input placeholder="Item Name" value={newCatalogItem.name} onChange={e => setNewCatalogItem({...newCatalogItem, name: e.target.value})} className="h-8 text-xs flex-1" />
                                            <Input type="number" placeholder="Qty" value={newCatalogItem.quantity} onChange={e => setNewCatalogItem({...newCatalogItem, quantity: Number(e.target.value)})} className="h-8 text-xs w-16" min={1} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select value={newCatalogItem.unit} onValueChange={val => setNewCatalogItem({...newCatalogItem, unit: val})}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Select Unit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {UNIT_CHOICES.map(u => (
                                                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select value={newCatalogItem.category} onValueChange={val => setNewCatalogItem({...newCatalogItem, category: val})}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {secondaryCategories.map(c => (
                                                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {isAdmin && <Input type="number" placeholder="Unit Price" value={newCatalogItem.price} onChange={e => setNewCatalogItem({...newCatalogItem, price: Number(e.target.value)})} className="h-8 text-xs" />}
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setIsAddingNewToCatalog(false)}>Cancel</Button>
                                        <Button size="sm" className="h-7 text-[10px]" onClick={handleAddNewToCatalog}>Add & Pick</Button>
                                    </div>
                                </div>
                            ) : (
                                <ScrollArea className="h-64 border rounded-md p-2 bg-muted/20">
                                    {secondaryLoading ? (
                                        <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/></div>
                                    ) : filteredItems.length === 0 ? (
                                        <p className="text-center text-[10px] text-muted-foreground py-8">No materials found.</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {filteredItems.map(item => (
                                                <div 
                                                    key={item.id} 
                                                    className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-primary/5 transition-colors group" 
                                                >
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="truncate text-[11px] font-bold">{item.name}</p>
                                                        <div className="flex items-center gap-2 text-[9px] opacity-60">
                                                            <span>Unit: {item.unit || 'pc'}</span>
                                                            {isAdmin && item.price && (
                                                                <span className="font-semibold text-primary">{formatCurrency(item.price)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Input 
                                                            type="number" 
                                                            className="h-7 w-12 text-[10px] px-1" 
                                                            defaultValue={1}
                                                            min={1}
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                        />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-primary hover:bg-primary hover:text-white"
                                                            onClick={() => handleAddItemToBOM(item)}
                                                        >
                                                            <PlusCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            )}
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="bom">Bill of Materials (BOM)</Label>
                            <Textarea 
                                id="bom"
                                placeholder="List materials and quantities here..."
                                value={bom}
                                onChange={(e) => setBom(e.target.value)}
                                className="flex-1 text-sm resize-none"
                            />
                            {isAdmin && (
                                <div className="p-3 bg-primary/5 border border-primary/10 rounded-md mt-2">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Estimated BOM Total</p>
                                    <p className="text-xl font-bold text-primary">{formatCurrency(bomEstimatedTotal)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isUploading}>Submit Design & BOM</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function PaintUsageDialog({ open, onOpenChange, onSubmit }: { open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (paintUsage: string) => void }) {
    const [paintUsage, setPaintUsage] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        if (!paintUsage.trim()) {
            toast({
                variant: "destructive",
                title: "Paint Usage Required",
                description: "Please provide the paint usage details."
            });
            return;
        }
        onSubmit(paintUsage);
        onOpenChange(false);
        setPaintUsage('');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Paint Usage</DialogTitle>
                    <DialogDescription>
                        Enter the paint usage details for this completed order.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="paint-usage">Paint Usage Details</Label>
                        <Textarea 
                            id="paint-usage"
                            placeholder="e.g., 2L of White Gloss..."
                            value={paintUsage}
                            onChange={(e) => setPaintUsage(e.target.value)}
                            rows={6}
                            className="mt-2"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Submit Paint Usage</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function DesignerProfile({ userId, users }: { userId: string, users: AppUser[] }) {
    const profile = users.find(u => u.id === userId);
    if (!profile) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 ring-2 ring-background shrink-0">
                        <AvatarImage src={profile.avatarUrl} />
                        <AvatarFallback className="text-[8px]">{profile.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">{profile.name}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function OrderQRDialog({ open, onOpenChange, order }: { open: boolean, onOpenChange: (open: boolean) => void, order: Order }) {
    const qrValue = `ORDERFLOW-ORDER:${order.id}`;
    
    const downloadQR = () => {
        const svg = document.getElementById("order-qr-code");
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new (window as any).Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `QR-${order.uniqueName}.png`;
            downloadLink.href = `${pngFile}`;
            downloadLink.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Order QR Code</DialogTitle>
                    <DialogDescription>
                        Scan this code using the internal OrderFlow scanner.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
                    <QRCodeSVG 
                        id="order-qr-code"
                        value={qrValue} 
                        size={200} 
                        level="H"
                        includeMargin={true}
                    />
                    <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{order.uniqueName}</p>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Close</Button>
                    <Button onClick={downloadQR} className="flex-1">
                        <Download className="mr-2 h-4 w-4" /> Download QR
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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

function OrderDetailPageContent() {
  const params = useParams();
  const id = params.id as string;
  const { getOrderById, deleteOrder, updateOrder, removeAttachment, loading: ordersLoading } = useOrders();
  const { getCustomerById, loading: customersLoading } = useCustomers();
  const { settings: colorSettings, loading: colorsLoading } = useColorSettings();
  const { users, loading: allUsersLoading } = useUsers();
  const { user, loading: userLoading, role } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [finishDesignDialogOpen, setFinishDesignDialogOpen] = useState(false);
  const [paintUsageDialogOpen, setPaintUsageDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  const orderData = getOrderById(id);

  const [optimisticOrder, setOptimisticOrder] = useOptimistic(
    orderData,
    (state, partial: Partial<Order>) => state ? { ...state, ...partial } : null
  );

  const order = optimisticOrder;

  if (ordersLoading || customersLoading || userLoading || colorsLoading || allUsersLoading || !order) {
    return <div>Loading...</div>;
  }
  
  const defaultTab = searchParams.get('tab') || 'details';

  const customer = getCustomerById(order.customerId);
  const canEdit = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);
  const canChangeStatus = ['Admin', 'Manager'].includes(role || '');
  const isDesigner = role === 'Designer';
  const canViewSensitiveData = role === 'Admin';
  
  const prepaid = order.prepaidAmount || 0;
  const balance = (order.incomeAmount || 0) - prepaid;
  const isPaid = (balance <= 0 && order.incomeAmount > 0) || order.paymentStatus === 'Paid';

  const allImageAttachments = (order.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]).filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || [];

    const handleCancel = () => {
        if (!orderData) return;
        startTransition(async () => {
            setOptimisticOrder({ status: "Cancelled" });
            await updateOrder({ ...orderData, status: "Cancelled" });
            toast({ title: "Order Cancelled", description: `Order ${order.uniqueName} has been cancelled.` });
        });
    }

    const handleDelete = () => {
        if (!orderData) return;
        const allAttachments = (orderData.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]);
        deleteOrder(orderData.id, allAttachments);
        toast({ title: "Order Deleted", description: `${order.uniqueName} has been deleted.` });
        router.push("/orders");
    };

    const handleToggleUrgent = () => {
        if (!orderData) return;
        startTransition(async () => {
            setOptimisticOrder({ isUrgent: !orderData.isUrgent });
            await updateOrder({ ...orderData, isUrgent: !orderData.isUrgent });
        });
    };

    const handleStatusChange = (newStatus: OrderStatus) => {
        if (!orderData) return;
        if (newStatus === 'Completed' && orderData.status === 'Painting') {
            setPaintUsageDialogOpen(true);
        } else {
            startTransition(async () => {
                setOptimisticOrder({ status: newStatus });
                await updateOrder({ ...orderData, status: newStatus });
            });
        }
    };
    
    const handlePaintUsageSubmit = (paintUsage: string) => {
        if (!orderData) return;
        const updatedProducts = [...(orderData.products || [])];
        if (updatedProducts.length > 0) {
            const currentBOM = updatedProducts[0].billOfMaterials || '';
            updatedProducts[0].billOfMaterials = `${currentBOM}\n\n--- Paint Usage ---\n${paintUsage}`;
        }
        startTransition(async () => {
            setOptimisticOrder({ status: 'Completed' });
            await updateOrder({ ...orderData, products: updatedProducts, status: 'Completed' }, {
                text: `Paint Usage Submitted:\n${paintUsage}`,
            });
        });
    };

     const handleTogglePaidStatus = () => {
        if (!orderData) return;
        startTransition(async () => {
            if (isPaid) {
                setOptimisticOrder({ paymentStatus: 'Balance Due', prepaidAmount: 0 });
                await updateOrder({ ...orderData, paymentStatus: 'Balance Due', prepaidAmount: 0 });
            } else {
                setOptimisticOrder({ paymentStatus: 'Paid', prepaidAmount: orderData.incomeAmount });
                await updateOrder({ ...orderData, paymentStatus: 'Paid', prepaidAmount: orderData.incomeAmount });
            }
        });
    }

    const handleDesignerStatusChange = async (newStatus: OrderStatus) => {
        if (!orderData || !user) return;
        startTransition(async () => {
            const updatedAssignedTo = Array.from(new Set([...(orderData.assignedTo || []), user.id]));
            setOptimisticOrder({ status: newStatus, assignedTo: updatedAssignedTo });
            await updateOrder({ ...orderData, status: newStatus, assignedTo: updatedAssignedTo });
        });
    }

    const handleDesignFinished = (bom: string, attachments: OrderAttachment[], mainImageUrl?: string) => {
        if (!orderData || !orderData.products || orderData.products.length === 0) return;
        const updatedProducts = [...orderData.products];
        updatedProducts[0].billOfMaterials = bom;
        startTransition(async () => {
            setOptimisticOrder({ status: 'Design Ready', mainImageUrl });
            await updateOrder({ ...orderData, products: updatedProducts, status: 'Design Ready', mainImageUrl }, {
                text: `Bill of Materials Submitted:\n${bom}`,
            });
        });
    };
    
    const handleDuplicate = () => {
        if (!order) return;
        router.push(`/orders/new?duplicate=${order.id}`);
    }

    const handleDeleteAttachment = (productIndex: number, attachmentToDelete: OrderAttachment) => {
        if (!orderData) return;
        removeAttachment(orderData.id, productIndex, attachmentToDelete, false);
    };

    const handleDeleteDesignAttachment = (productIndex: number, attachmentToDelete: OrderAttachment) => {
        if (!orderData) return;
        removeAttachment(orderData.id, productIndex, attachmentToDelete, true);
    }

    const handleImageClick = (clickedAttachment: OrderAttachment) => {
        const imageIndex = allImageAttachments.findIndex(img => img.url === clickedAttachment.url);
        if (imageIndex !== -1) {
            setGalleryStartIndex(imageIndex);
            setGalleryOpen(true);
        }
    }


  const orderDetailsContent = (
     <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={(order.products && order.products[0]?.id) || undefined}>
        {(order.products || []).map((product, index) => (
            <ProductDetails 
                key={product.id}
                product={product}
                order={order}
                onImageClick={handleImageClick}
                onAttachmentDelete={(att) => handleDeleteAttachment(index, att)}
                onDesignAttachmentDelete={(att) => handleDeleteDesignAttachment(index, att)}
            />
        ))}
    </Accordion>
  )

  const bomContent = (order.products && order.products[0]?.billOfMaterials) ? (
    <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" /> Bill of Materials</CardTitle>
            <CardDescription>Required materials for this order production.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="bg-background/80 p-4 rounded-md border text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {order.products[0].billOfMaterials}
            </div>
        </CardContent>
    </Card>
  ) : null;


  return (
    <>
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">
                        {order.uniqueName}
                    </h1>
                     {canChangeStatus && (
                        <div className="flex items-center gap-2">
                            <StatusChanger order={order} onStatusChange={handleStatusChange} />
                            {order.assignedTo && order.assignedTo.length > 0 && (
                                <div className="flex items-center gap-1.5 ml-2">
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Team:</span>
                                    <div className="flex -space-x-2">
                                        {order.assignedTo.map(uid => (
                                            <DesignerProfile key={uid} userId={uid} users={users} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {isDesigner && (
                        <div className="flex items-center gap-2">
                            <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>
                            {order.assignedTo && order.assignedTo.length > 0 && (
                                <div className="flex items-center gap-1.5 ml-1">
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Team:</span>
                                    <div className="flex -space-x-2">
                                        {order.assignedTo.map(uid => (
                                            <DesignerProfile key={uid} userId={uid} users={users} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {order.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                </div>
                 <h2 className="text-lg text-muted-foreground mt-1">
                    {order.customerName} - {formatProductDisplay(order.products)}
                </h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="icon" onClick={() => setQrDialogOpen(true)} title="Order QR Code">
                    <QrCode className="h-4 w-4" />
                </Button>
                {isDesigner && order.status === 'In Progress' && (
                    <Button onClick={() => handleDesignerStatusChange('Designing')} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 animate-spin" /> : null}
                        Start Design
                    </Button>
                )}
                 {isDesigner && order.status === 'Designing' && (
                    <Button onClick={() => setFinishDesignDialogOpen(true)}>
                        Design Finished
                    </Button>
                )}
                {canEdit && (
                    <>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Printer />
                            </Button>
                        </DialogTrigger>
                        { canViewSensitiveData ? (
                            <OrderReceiptDialog order={order} customer={customer} />
                         ) : (
                             <DialogContent>
                               <DialogHeader><DialogTitle>Access Denied</DialogTitle></DialogHeader>
                               <p>You do not have permission to view receipt details.</p>
                             </DialogContent>
                         )}
                    </Dialog>
                    <Link href={`/orders/${order.id}/edit`}>
                        <Button variant="outline" size="icon"><Edit /></Button>
                    </Link>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleToggleUrgent}>
                                <AlertTriangle className="mr-2 h-4 w-4" /> 
                                <span>{order.isUrgent ? "Remove Urgency" : "Mark as Urgent"}</span>
                            </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDuplicate}>Duplicate Order</DropdownMenuItem>
                             {canViewSensitiveData && (
                                <DropdownMenuItem onClick={handleTogglePaidStatus}>
                                    {isPaid ? <RefreshCw className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    <span>{isPaid ? "Mark as Unpaid" : "Mark as Paid"}</span>
                                </DropdownMenuItem>
                            )}
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

       <Tabs defaultValue={defaultTab} className="w-full lg:hidden">
            <TabsList>
                <TabsTrigger value="details"><Info className="mr-2" /> Details</TabsTrigger>
                <TabsTrigger value="chat"><MessageSquare className="mr-2" /> Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-6">
                <div className="grid gap-8 grid-cols-1">
                    <div className="space-y-8">
                       {bomContent}
                       {orderDetailsContent}
                    </div>
                    <div className="space-y-8">
                        <Card>
                            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3"><Hash className="h-4 w-4 text-muted-foreground"/><span className="text-sm">ID: {formatOrderId(order.id)}</span></div>
                                <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Created: {formatTimestamp(order.creationDate)}</span></div>
                                <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Deadline: {formatTimestamp(order.deadline)}</span></div>
                                {order.testDate && <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Test Date: {formatTimestamp(order.testDate)}</span></div>}
                                {order.paidDate && <div className="flex items-center gap-3"><CheckCircle className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Paid on: {formatTimestamp(order.paidDate)}</span></div>}
                                {order.location && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Location: {order.location.town}</span></div>}
                                
                                {canViewSensitiveData && (
                                    <>
                                    <Separator />
                                    <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Total Price</span><span className="text-sm font-semibold">{formatCurrency(order.incomeAmount || 0)}</span></div>
                                    <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Pre-paid</span><span className="text-sm font-semibold">{formatCurrency(prepaid)}</span></div>
                                    <div className="flex items-center justify-between gap-3 font-bold"><span className="text-sm">Balance Due</span><span className="text-sm">{formatCurrency(balance)}</span></div>
                                    <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Payment Status</span><Badge variant={isPaid ? 'default' : 'secondary'}>{order.paymentStatus || 'Unpaid'}</Badge></div>
                                      {!isPaid && <Button size="sm" className="w-full" onClick={handleTogglePaidStatus}><CheckCircle className="mr-2 h-4 w-4" /> Mark as Fully Paid</Button>}
                                    <Separator />
                                    <p className="text-sm text-muted-foreground pt-2">{order.paymentDetails}</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        {canViewSensitiveData ? (
                            customer ? (
                                <Card>
                                    <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground"/> <Link href={`/customers/${customer.id}`} className="font-semibold hover:underline">{customer.name}</Link></div>
                                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                                        <p className="text-sm text-muted-foreground">{customer.phoneNumbers?.find(p => p.type === 'Mobile')?.number}</p>
                                    </CardContent>
                                </Card>
                            ) : <Card><CardContent className="p-6">Customer not found.</CardContent></Card>
                        ) : (
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="text-muted-foreground" /> Access Restricted</CardTitle></CardHeader>
                                <CardContent><p className="text-sm text-muted-foreground">Permissions required.</p></CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="chat" className="mt-6"><ChatInterface order={order} /></TabsContent>
        </Tabs>

        <div className="hidden lg:grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {bomContent}
                {orderDetailsContent}
            </div>
            <div className="space-y-8">
                 <Card>
                    <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3"><Hash className="h-4 w-4 text-muted-foreground"/><span className="text-sm">ID: {formatOrderId(order.id)}</span></div>
                        <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Created: {formatTimestamp(order.creationDate)}</span></div>
                        <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Deadline: {formatTimestamp(order.deadline)}</span></div>
                         {order.testDate && <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Test Date: {formatTimestamp(order.testDate)}</span></div>}
                        {order.paidDate && <div className="flex items-center gap-3"><CheckCircle className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Paid on: {formatTimestamp(order.paidDate)}</span></div>}
                        {order.location && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground"/><span className="text-sm">Location: {order.location.town}</span></div>}
                        
                        {canViewSensitiveData && (
                            <>
                            <Separator />
                            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Total Price</span><span className="text-sm font-semibold">{formatCurrency(order.incomeAmount || 0)}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Pre-paid</span><span className="text-sm font-semibold">{formatCurrency(prepaid)}</span></div>
                            <div className="flex items-center justify-between gap-3 font-bold"><span className="text-sm">Balance Due</span><span className="text-sm">{formatCurrency(balance)}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Payment Status</span><Badge variant={isPaid ? 'default' : 'secondary'}>{order.paymentStatus || 'Unpaid'}</Badge></div>
                             {!isPaid && <Button size="sm" className="w-full" onClick={handleTogglePaidStatus}><CheckCircle className="mr-2 h-4 w-4" /> Mark as Fully Paid</Button>}
                            <Separator />
                            <p className="text-sm text-muted-foreground pt-2">{order.paymentDetails}</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                {canViewSensitiveData ? (
                    customer ? (
                        <Card>
                            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground"/> <Link href={`/customers/${customer.id}`} className="font-semibold hover:underline">{customer.name}</Link></div>
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                                <p className="text-sm text-muted-foreground">{customer.phoneNumbers?.find(p => p.type === 'Mobile')?.number}</p>
                            </CardContent>
                        </Card>
                    ) : <Card><CardContent className="p-6">Customer not found.</CardContent></Card>
                ) : (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="text-muted-foreground" /> Access Restricted</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">Permissions required.</p></CardContent>
                    </Card>
                )}
                 <ChatInterface order={order} />
            </div>
        </div>
      
      <ImageGallery 
        open={galleryOpen} 
        onOpenChange={setGalleryOpen} 
        images={allImageAttachments} 
        startIndex={galleryStartIndex} 
      />
    </div>
    <FinishDesignDialog 
        open={finishDesignDialogOpen}
        onOpenChange={setFinishDesignDialogOpen}
        order={orderData!}
        productIndex={0}
        onFinished={handleDesignFinished}
    />
     <PaintUsageDialog
        open={paintUsageDialogOpen}
        onOpenChange={setPaintUsageDialogOpen}
        onSubmit={handlePaintUsageSubmit}
    />
    <OrderQRDialog 
        open={qrDialogOpen} 
        onOpenChange={setQrDialogOpen} 
        order={order} 
    />
    </>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderDetailPageContent />
    </Suspense>
  )
}
