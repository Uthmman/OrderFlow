
"use client";

import { Suspense, useState } from "react";
import { useRouter, notFound, useParams } from "next/navigation";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Box, Ruler, Download, File, Image as ImageIcon, PlusCircle, ArrowLeft, Printer, Share2, FileText, Eye, X } from "lucide-react";
import Image from "next/image";
import { OrderAttachment } from "@/lib/types";
import { OrderTable } from "@/components/app/order-table";
import { useOrders } from "@/hooks/use-orders";
import { CustomerProvider } from "@/hooks/use-customers";
import { downloadFile } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ScrollArea } from "@/components/ui/scroll-area";

function AttachmentCard({ attachment, onImageClick }: { attachment: OrderAttachment, onImageClick: (att: OrderAttachment) => void }) {
    const isImage = attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isPdf = attachment.fileName.toLowerCase().endsWith('.pdf');
    const { toast } = useToast();

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: attachment.fileName,
                    url: attachment.url
                });
            } catch (err) {
                // Ignore cancel
            }
        } else {
            try {
                await navigator.clipboard.writeText(attachment.url);
                toast({ title: "Link Copied", description: "Attachment URL copied to clipboard." });
            } catch (err) {
                toast({ variant: 'destructive', title: "Error", description: "Could not copy link." });
            }
        }
    };

    const handlePrint = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(attachment.url, '_blank');
    };

    return (
        <div className="w-full">
            <Card className="hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => isImage && onImageClick(attachment)}>
                <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                        {isImage ? (
                            <Image src={attachment.url} alt={attachment.fileName} fill className="object-cover" />
                        ) : isPdf ? (
                            <FileText className="h-5 w-5 text-red-600" />
                        ) : (
                            <File className="h-5 w-5" />
                        )}
                        {isImage && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-4 w-4 text-white" />
                            </div>
                        )}
                    </div>
                    <div className="flex-grow truncate">
                        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                    </div>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadFile(attachment.url, attachment.fileName); }}
                            title="Download"
                        >
                            <Download className="h-4 w-4"/>
                        </Button>
                        {isPdf && (
                            <>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity" 
                                    onClick={handlePrint}
                                    title="Print"
                                >
                                    <Printer className="h-4 w-4"/>
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity" 
                                    onClick={handleShare}
                                    title="Share"
                                >
                                    <Share2 className="h-4 w-4"/>
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function ProductDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { getProductById, loading: productsLoading } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  if (productsLoading || ordersLoading) {
    return <div className="text-center py-16">Loading product details...</div>;
  }

  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const primaryAttachment = product.attachments?.[0] || product.designAttachments?.[0];
  const allAttachments = [...(product.attachments || []), ...(product.designAttachments || [])];
  const allImageAttachments = allAttachments.filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));
  
  const productOrders = orders.filter(order => 
    order.products && Array.isArray(order.products) && order.products.some(p => p.productName === product.productName)
  );

  const handleImageClick = (clickedAttachment: OrderAttachment) => {
    const index = allImageAttachments.findIndex(img => img.url === clickedAttachment.url);
    if (index !== -1) {
        setGalleryStartIndex(index);
        setGalleryOpen(true);
    }
  };

  const handleDownload = (e: React.MouseEvent, url: string, fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile(url, fileName);
  };


  return (
    <>
    <div className="flex flex-col gap-8">
       <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto"><ArrowLeft className="mr-2"/> Back to Catalog</Button>
            <Button onClick={() => router.push(`/orders/new?fromProduct=${product.id}`)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2"/> Create Order from This Product
            </Button>
       </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>{product.productName}</CardTitle>
                    <CardDescription>{product.category}</CardDescription>
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
                    {product.material && product.material.length > 0 && (
                        <div className="flex items-center gap-3">
                            <Box className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Materials:</span>
                            <div className="flex flex-wrap gap-1">
                                {product.material.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}
                            </div>
                        </div>
                    )}
                    {product.dimensions && (
                        <div className="flex items-center gap-3">
                            <Ruler className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Dimensions: {product.dimensions.width} x {product.dimensions.height} x {product.dimensions.depth} cm</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader className="p-0">
                <div 
                    className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative cursor-pointer"
                    onClick={() => primaryAttachment && handleImageClick(primaryAttachment)}
                >
                    {primaryAttachment?.url ? (
                        <Image src={primaryAttachment.url} alt={product.productName} fill className="object-contain" />
                    ) : (
                        <p className="text-muted-foreground">No primary image</p>
                    )}
                </div>
            </CardHeader>
             <CardContent className="p-4">
                <h3 className="font-semibold mb-4">All Attachments</h3>
                {allAttachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {allAttachments.map((att, i) => <AttachmentCard key={i} attachment={att} onImageClick={handleImageClick}/>)}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No attachments for this product.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>A list of all orders that include this product.</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerProvider>
            <OrderTable orders={productOrders} preferenceKey="orderSortPreference" />
          </CustomerProvider>
        </CardContent>
      </Card>
    </div>

    <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-screen h-screen md:max-w-6xl md:w-[95vw] md:h-[90vh] p-0 flex flex-col overflow-hidden bg-black/95 text-white border-none md:rounded-lg">
          <DialogHeader className="p-4 md:p-6 shrink-0 border-b border-white/10 flex flex-row items-center justify-between">
            <DialogTitle className="text-white">Product Gallery</DialogTitle>
             <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <X className="h-5 w-5" />
                </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex-1 relative w-full h-full">
            <Carousel
              opts={{ align: "start", loop: true, startIndex: galleryStartIndex }}
              className="w-full h-full flex flex-col"
            >
              <CarouselContent className="h-full">
                {allImageAttachments.map((att, index) => (
                  <CarouselItem key={index} className="h-full flex flex-col p-0">
                    <div className="flex-1 relative w-full h-[60vh] md:h-full flex items-center justify-center p-2">
                      <Image
                        src={att.url}
                        alt={att.fileName}
                        fill
                        className="object-contain"
                        sizes="100vw"
                        priority
                      />
                    </div>
                    <div className="flex justify-between items-center bg-black/50 backdrop-blur p-4 border-t border-white/10 shrink-0">
                      <p className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{att.fileName}</p>
                      <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10" onClick={(e) => handleDownload(e, att.url, att.fileName)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 bg-black/20 border-white/20 text-white hover:bg-black/40" />
              <CarouselNext className="right-4 bg-black/20 border-white/20 text-white hover:bg-black/40" />
            </Carousel>
          </div>
        </DialogContent>
    </Dialog>
    </>
  );
}


export default function ProductDetailPage() {
    return (
        <Suspense fallback={<div>Loading product details...</div>}>
            <ProductDetailContent />
        </Suspense>
    )
}
