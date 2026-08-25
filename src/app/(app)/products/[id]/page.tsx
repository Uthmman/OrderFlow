
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, notFound, useParams } from "next/navigation";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, Ruler, Download, File, ArrowLeft, Printer, Share2, FileText, Eye, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { OrderAttachment } from "@/lib/types";
import { OrderTable } from "@/components/app/order-table";
import { useOrders } from "@/hooks/use-orders";
import { CustomerProvider } from "@/hooks/use-customers";
import { downloadFile } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
          <div className="flex flex-col text-left"><h2 className="text-white text-sm font-bold truncate max-w-[200px] md:max-w-md">{images[current - 1]?.fileName}</h2><p className="text-[10px] text-white/60">{current} of {images.length}</p></div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10" onClick={() => onOpenChange(false)}><X className="h-6 w-6" /></Button>
        </header>
        <div className="flex-1 w-full h-full relative">
          <Carousel setApi={setApi} className="w-full h-full" opts={{ startIndex, loop: true }}>
            <CarouselContent className="h-screen m-0">{images.map((image, index) => (
                <CarouselItem key={image.url} className="h-screen p-0 flex items-center justify-center">
                    <div className="relative w-full h-full"><Image src={image.url} alt={image.fileName} fill className="object-contain" priority={index === startIndex} sizes="100vw" /></div>
                </CarouselItem>
              ))}</CarouselContent>
            {images.length > 1 && <><CarouselPrevious className="left-4 bg-black/20 hover:bg-black/40 text-white border-none h-12 w-12 hidden md:flex" /><CarouselNext className="right-4 bg-black/20 hover:bg-black/40 text-white border-none h-12 w-12 hidden md:flex" /></>}
          </Carousel>
        </div>
        <footer className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-end bg-gradient-to-t from-black/80 to-transparent gap-4 pointer-events-none z-[110]">
           <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 pointer-events-auto rounded-full px-6" onClick={() => downloadFile(images[current - 1].url, images[current - 1].fileName)}><Download className="mr-2 h-4 w-4" /> Download</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentCard({ attachment, onImageClick }: { attachment: OrderAttachment, onImageClick: (att: OrderAttachment) => void }) {
    const isImage = attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isPdf = attachment.fileName.toLowerCase().endsWith('.pdf');
    const { toast } = useToast();
    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (navigator.share) { try { await navigator.share({ title: attachment.fileName, url: attachment.url }); } catch (err) {} }
        else { try { await navigator.clipboard.writeText(attachment.url); toast({ title: "Link Copied" }); } catch (err) {} }
    };
    return (
        <Card className="hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => isImage && onImageClick(attachment)}>
            <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    {isImage ? <Image src={attachment.url} alt={attachment.fileName} fill className="object-cover" /> : isPdf ? <FileText className="h-5 w-5 text-red-600" /> : <File className="h-5 w-5" />}
                    {isImage && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Eye className="h-4 w-4 text-white" /></div>}
                </div>
                <div className="flex-grow truncate min-w-0"><p className="text-[11px] font-medium truncate">{attachment.fileName}</p></div>
                <div className="flex items-center gap-0.5 flex-wrap" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 hover:opacity-100" onClick={e => { e.preventDefault(); downloadFile(attachment.url, attachment.fileName); }}><Download className="h-3.5 w-3.5"/></Button>
                    {isPdf && <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 hover:opacity-100" onClick={handleShare}><Share2 className="h-3.5 w-3.5"/></Button>}
                </div>
            </CardContent>
        </Card>
    )
}

function ProductDetailContent() {
  const params = useParams(); const id = params.id as string;
  const router = useRouter(); const { getProductById, loading: productsLoading } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();
  const [galleryOpen, setGalleryOpen] = useState(false); const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  if (productsLoading || ordersLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  const product = getProductById(id);
  if (!product) notFound();

  const primaryAttachment = product.attachments?.[0] || product.designAttachments?.[0];
  const allAttachments = [...(product.attachments || []), ...(product.designAttachments || [])];
  const allImageAttachments = allAttachments.filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));
  const productOrders = orders.filter(order => order.products?.some(p => p.productName === product.productName));

  return (
    <>
    <div className="flex flex-col gap-8">
       <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
            <Button onClick={() => router.push(`/orders/new?fromProduct=${product.id}`)} className="w-full sm:w-auto"><Eye className="mr-2 h-4 w-4"/> Create Order from This Product</Button>
       </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 space-y-8">
            <Card><CardHeader><CardTitle>{product.productName}</CardTitle><CardDescription>{product.category}</CardDescription></CardHeader><CardContent><p className="text-muted-foreground">{product.description}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Specifications</CardTitle></CardHeader><CardContent className="space-y-4">
                    {product.material && product.material.length > 0 && <div className="flex items-center gap-3"><Box className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Materials:</span><div className="flex flex-wrap gap-1">{product.material.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}</div></div>}
                    {product.dimensions && <div className="flex items-center gap-3"><Ruler className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Dims: {product.dimensions.width} x {product.dimensions.height} x {product.dimensions.depth} cm</span></div>}
                </CardContent></Card>
        </div>
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader className="p-0">
              <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative cursor-pointer overflow-hidden" onClick={() => {
                  if (primaryAttachment && allImageAttachments.some(i => i.url === primaryAttachment.url)) {
                      const idx = allImageAttachments.findIndex(i => i.url === primaryAttachment.url);
                      setGalleryStartIndex(idx);
                      setGalleryOpen(true);
                  }
              }}>
                {primaryAttachment?.url ? <Image src={primaryAttachment.url} alt={product.productName} fill className="object-contain" /> : <p className="text-muted-foreground">No image</p>}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Attachments</h3>
              {allAttachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allAttachments.map((att, i) => <AttachmentCard key={i} attachment={att} onImageClick={att => { const idx = allImageAttachments.findIndex(img => img.url === att.url); if (idx !== -1) { setGalleryStartIndex(idx); setGalleryOpen(true); } }}/>)}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No attachments.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <Card><CardHeader><CardTitle>Order History</CardTitle></CardHeader><CardContent><CustomerProvider><OrderTable orders={productOrders} preferenceKey="orderSortPreference" /></CustomerProvider></CardContent></Card>
    </div>
    <ImageGallery open={galleryOpen} onOpenChange={setGalleryOpen} images={allImageAttachments} startIndex={galleryStartIndex} />
    </>
  );
}
export default function ProductDetailPage() { return ( <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}><ProductDetailContent /></Suspense> ); }
