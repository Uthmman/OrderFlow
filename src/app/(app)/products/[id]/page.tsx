
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, notFound, useParams } from "next/navigation";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Box, Ruler, Download, File, Image as ImageIcon, PlusCircle, ArrowLeft, Printer, Share2, FileText, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { OrderAttachment } from "@/lib/types";
import { OrderTable } from "@/components/app/order-table";
import { useOrders } from "@/hooks/use-orders";
import { CustomerProvider } from "@/hooks/use-customers";
import { downloadFile } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * A modern, responsive fullscreen image gallery component.
 */
function ImageGallery({ open, onOpenChange, images, startIndex = 0 }: { open: boolean, onOpenChange: (open: boolean) => void, images: OrderAttachment[], startIndex: number }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  
  useEffect(() => {
    if (open) setCurrentIndex(startIndex);
  }, [open, startIndex]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const goNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 border-none bg-black/98 text-white overflow-hidden flex flex-col">
        <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 flex flex-row items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex flex-col text-left">
            <DialogTitle className="text-white text-sm font-bold truncate max-w-[200px] md:max-w-md">
              {currentImage.fileName}
            </DialogTitle>
            <p className="text-[10px] text-white/60">{currentIndex + 1} of {images.length}</p>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10">
              <X className="h-6 w-6" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 relative w-full h-full flex items-center justify-center">
          {images.length > 1 && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goPrev}
                className="absolute left-4 z-50 h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 hidden md:flex"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goNext}
                className="absolute right-4 z-50 h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 hidden md:flex"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          <div className="relative w-full h-full p-4 md:p-12">
            <Image
              src={currentImage.url}
              alt={currentImage.fileName}
              fill
              className="object-contain"
              priority
              sizes="100vw"
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent gap-4">
           <div className="flex-1 md:hidden flex justify-center gap-8">
              <Button variant="ghost" size="icon" onClick={goPrev} disabled={images.length <= 1} className="text-white">
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goNext} disabled={images.length <= 1} className="text-white">
                <ChevronRight className="h-8 w-8" />
              </Button>
           </div>
           <div className="hidden md:block flex-1" />
           <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => downloadFile(currentImage.url, currentImage.fileName)}
           >
             <Download className="mr-2 h-4 w-4" /> Download
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
            } catch (err) {}
        } else {
            try {
                await navigator.clipboard.writeText(attachment.url);
                toast({ title: "Link Copied", description: "Attachment URL copied to clipboard." });
            } catch (err) {}
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity" onClick={handlePrint} title="Print"><Printer className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity" onClick={handleShare} title="Share"><Share2 className="h-4 w-4"/></Button>
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
                <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
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

    <ImageGallery 
        open={galleryOpen} 
        onOpenChange={setGalleryOpen} 
        images={allImageAttachments} 
        startIndex={galleryStartIndex} 
    />
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
