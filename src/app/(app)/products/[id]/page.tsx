
"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, notFound, useParams } from "next/navigation"
import { useProducts } from "@/hooks/use-products"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Box, Ruler, Download, File, ArrowLeft, Share2, FileText, Eye, X, Loader2, QrCode, Edit, Trash2, UploadCloud, Plus, ChevronLeft, ChevronRight, CheckCircle2, DollarSign, ListChecks, History, Cpu } from "lucide-react"
import Image from "next/image"
import { OrderAttachment } from "@/lib/types"
import { OrderTable } from "@/components/app/order-table"
import { useOrders } from "@/hooks/use-orders"
import { CustomerProvider } from "@/hooks/use-customers"
import { downloadFile, compressImage, cn, formatCurrency, formatTimestamp } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogPortal } from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { QRCodeCanvas } from "qrcode.react"
import { useUser } from "@/hooks/use-user"
import { uploadFileFlow, deleteFileFlow } from "@/ai/flows/backblaze-flow"
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
import { Separator } from "@/components/ui/separator";

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
            <h2 className="text-white text-sm font-bold truncate max-w-[200px] md:max-w-md">{images[current - 1]?.fileName}</h2>
            <p className="text-[10px] text-white/60">{current} of {images.length}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10" onClick={() => onOpenChange(false)}><X className="h-6 w-6" /></Button>
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
            {images.length > 1 && (
              <>
                <CarouselPrevious className="left-4 bg-black/20 hover:bg-black/40 text-white border-none h-12 w-12 hidden md:flex" />
                <CarouselNext className="right-4 bg-black/20 hover:bg-black/40 text-white border-none h-12 w-12 hidden md:flex" />
              </>
            )}
          </Carousel>
        </div>
        <footer className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-end bg-gradient-to-t from-black/80 to-transparent gap-4 pointer-events-none z-[110]">
           <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 pointer-events-auto rounded-full px-6" onClick={() => downloadFile(images[current - 1].url, images[current - 1].fileName)}>
             <Download className="mr-2 h-4 w-4" /> Download
           </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentCard({ attachment, onImageClick, onDelete, canDelete }: { attachment: OrderAttachment, onImageClick: (att: OrderAttachment) => void, onDelete: () => void, canDelete: boolean }) {
    const isImage = attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isPdf = attachment.fileName.toLowerCase().endsWith('.pdf');
    const isCNC = attachment.fileName.toLowerCase().endsWith('.tap');
    const { toast } = useToast();
    
    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (navigator.share) { 
          try { await navigator.share({ title: attachment.fileName, url: attachment.url }); } catch (err) {} 
        } else { 
          try { await navigator.clipboard.writeText(attachment.url); toast({ title: "Link Copied" }); } catch (err) {} 
        }
    };

    return (
        <Card className="hover:bg-muted/50 transition-colors group cursor-pointer relative" onClick={() => isImage && onImageClick(attachment)}>
            <CardContent className="p-2 flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    {isImage ? (
                        <Image src={attachment.url} alt={attachment.fileName} fill className="object-cover" />
                    ) : isPdf ? (
                        <FileText className="h-5 w-5 text-red-600" />
                    ) : isCNC ? (
                        <Cpu className="h-5 w-5 text-blue-600" />
                    ) : (
                        <File className="h-5 w-5" />
                    )}
                    {isImage && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Eye className="h-4 w-4 text-white" /></div>}
                </div>
                <div className="flex-grow truncate min-w-0">
                    <p className="text-[10px] font-bold truncate leading-tight">{attachment.fileName}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                        {isImage ? 'Image' : isPdf ? 'PDF Drawing' : isCNC ? 'CNC Program' : 'File'}
                    </p>
                </div>
                <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={handleShare}><Share2 className="h-3.5 w-3.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={e => { e.preventDefault(); downloadFile(attachment.url, attachment.fileName); }}><Download className="h-3.5 w-3.5"/></Button>
                    {canDelete && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5"/></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently remove this file from the product catalog.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function ProductDetailContent() {
  const params = useParams(); const id = params.id as string;
  const router = useRouter(); 
  const { getProductById, updateProduct, loading: productsLoading } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();
  const { role } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [galleryOpen, setGalleryOpen] = useState(false); 
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  if (productsLoading || ordersLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  const product = getProductById(id);
  if (!product) notFound();

  const allAttachments = [...(product.attachments || []), ...(product.designAttachments || [])];
  
  // Categorize files
  const imageAttachments = allAttachments.filter(att => att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i));
  const pdfAttachments = allAttachments.filter(att => att.fileName.toLowerCase().endsWith('.pdf'));
  const cncAttachments = allAttachments.filter(att => att.fileName.toLowerCase().endsWith('.tap'));
  const otherAttachments = allAttachments.filter(att => {
      const isImg = att.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
      const isP = att.fileName.toLowerCase().endsWith('.pdf');
      const isC = att.fileName.toLowerCase().endsWith('.tap');
      return !isImg && !isP && !isC;
  });

  const activeImage = imageAttachments[activeImageIndex] || imageAttachments[0];
  const productOrders = orders.filter(order => order.products?.some(p => p.productName === product.productName));

  const canEdit = ['Admin', 'Manager', 'Sales', 'Designer'].includes(role || '');
  const canViewPrice = role === 'Admin' || role === 'Sales';
  const canDeleteFiles = role === 'Admin' || role === 'Manager';

  // Set initial gallery index to match the main image if it exists
  useEffect(() => {
    if (product.mainImageUrl && imageAttachments.length > 0) {
      const mainIdx = imageAttachments.findIndex(att => att.url === product.mainImageUrl);
      if (mainIdx !== -1) {
          setActiveImageIndex(mainIdx);
      }
    }
  }, [product.mainImageUrl, imageAttachments.length]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const files = Array.from(e.target.files);
      const newAttachments = [...(product.attachments || [])];
      
      try {
        for (const file of files) {
          let fileToUpload = file;
          if (file.type.startsWith('image/')) {
            try {
                fileToUpload = await compressImage(file);
            } catch (e) { console.warn("Compression skipped", e); }
          }
          const base64 = await fileToBase64(fileToUpload);
          const uploadResult = await uploadFileFlow({
            fileContent: base64,
            contentType: fileToUpload.type,
            fileName: file.name
          });
          newAttachments.push({
            fileName: file.name,
            url: uploadResult.url,
            storagePath: uploadResult.fileName
          });
        }
        await updateProduct(product.id, { attachments: newAttachments });
        toast({ title: "Files Uploaded", description: `${files.length} items added to catalog.` });
      } catch (err) {
        toast({ variant: "destructive", title: "Upload Failed", description: (err as Error).message });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAttachment = async (attachment: OrderAttachment) => {
    try {
        const updatedAttachments = (product.attachments || []).filter(att => att.url !== attachment.url);
        await updateProduct(product.id, { attachments: updatedAttachments });
        if (attachment.storagePath) await deleteFileFlow({ fileName: attachment.storagePath });
        toast({ title: "Deleted", description: "File removed from catalog." });
    } catch (e) {
        toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const setMainImage = async (url: string) => {
      try {
          await updateProduct(product.id, { mainImageUrl: url });
          toast({ title: "Main Image Updated", description: "This image is now the primary visual for this product." });
      } catch (e) {
          toast({ variant: "destructive", title: "Failed to update main image" });
      }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('product-qr-code') as HTMLCanvasElement;
    if (canvas) {
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `product-qr-${product.id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
  };

  const nextImage = () => setActiveImageIndex(prev => (prev + 1) % imageAttachments.length);
  const prevImage = () => setActiveImageIndex(prev => (prev - 1 + imageAttachments.length) % imageAttachments.length);

  return (
    <>
    <div className="flex flex-col gap-8">
       <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                <Button variant="outline" size="icon" onClick={() => setQrDialogOpen(true)} title="Product QR Code"><QrCode className="h-4 w-4" /></Button>
                {canEdit && (
                    <Button variant="outline" size="icon" onClick={() => router.push(`/products/${product.id}/edit`)} title="Edit Product">
                        <Edit className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <Button onClick={() => router.push(`/orders/new?fromProduct=${product.id}`)} className="w-full sm:w-auto"><Eye className="mr-2 h-4 w-4"/> Create Order from This Product</Button>
       </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 space-y-8">
            <Card><CardHeader><CardTitle className="font-headline">{product.productName}</CardTitle><CardDescription>{product.category}</CardDescription></CardHeader><CardContent><p className="text-muted-foreground text-sm">{product.description}</p></CardContent></Card>
            
            {canViewPrice && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" /> Base Price
                        </CardTitle>
                        {product.priceHistory && product.priceHistory.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(!showHistory)}>
                                <History className="h-4 w-4 opacity-50" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</div>
                        {showHistory && product.priceHistory && (
                            <div className="space-y-2 pt-2 border-t animate-in fade-in">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Price History</p>
                                {product.priceHistory.map((h, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{formatTimestamp(h.date)}</span>
                                        <span className="font-medium">{formatCurrency(h.price)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card><CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Specifications</CardTitle></CardHeader><CardContent className="space-y-4">
                    {product.material && product.material.length > 0 && <div className="flex items-center gap-3"><Box className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Materials:</span><div className="flex flex-wrap gap-1">{product.material.map(m => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}</div></div>}
                    {product.dimensions && <div className="flex items-center gap-3"><Ruler className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Dims: {product.dimensions.width} x {product.dimensions.height} x {product.dimensions.depth} cm</span></div>}
                </CardContent></Card>
        </div>
        <div className="md:col-span-2 space-y-8">
          <Card className="overflow-hidden">
            <CardHeader className="p-0 border-b">
              <div className="aspect-video bg-muted flex items-center justify-center relative group">
                {activeImage?.url ? (
                    <>
                        <Image src={activeImage.url} alt={product.productName} fill className="object-contain" />
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-6">
                            <div className="flex items-center gap-8">
                                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                                    <ChevronLeft className="h-10 w-10" />
                                </Button>
                                <div className="flex flex-col items-center gap-4">
                                    <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full px-8 h-12 text-lg font-bold" onClick={() => {
                                        setGalleryStartIndex(activeImageIndex);
                                        setGalleryOpen(true);
                                    }}>
                                        <Eye className="mr-2 h-5 w-5" /> View Fullscreen
                                    </Button>
                                    
                                    {canEdit && activeImage.url !== product.mainImageUrl && (
                                        <Button variant="secondary" className="rounded-full px-6" onClick={(e) => { e.stopPropagation(); setMainImage(activeImage.url); }}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Set as Main Catalog Image
                                        </Button>
                                    )}
                                    {activeImage.url === product.mainImageUrl && (
                                        <Badge className="bg-primary text-white border-none px-4 py-1">
                                            Current Main Catalog Image
                                        </Badge>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="text-white h-12 w-12 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                                    <ChevronRight className="h-10 w-10" />
                                </Button>
                            </div>
                            
                            <div className="absolute bottom-4 flex gap-1.5">
                                {imageAttachments.map((_, i) => (
                                    <div key={i} className={cn("h-1.5 w-1.5 rounded-full bg-white transition-all", i === activeImageIndex ? "w-4" : "opacity-40")} />
                                ))}
                            </div>
                        </div>
                    </>
                ) : <div className="flex flex-col items-center gap-2"><ImageIcon className="h-12 w-12 opacity-20" /><p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No visual reference</p></div>}
              </div>
              
              {imageAttachments.length > 1 && (
                  <div className="flex p-2 gap-2 bg-muted/50 overflow-x-auto no-scrollbar">
                      {imageAttachments.map((img, i) => (
                          <button 
                            key={i} 
                            onClick={() => setActiveImageIndex(i)}
                            className={cn(
                                "h-14 w-20 rounded-md border-2 overflow-hidden flex-shrink-0 transition-all",
                                i === activeImageIndex ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100"
                            )}
                          >
                              <Image src={img.url} alt={`Thumb ${i}`} width={80} height={56} className="object-cover h-full w-full" />
                          </button>
                      ))}
                  </div>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <ListChecks className="h-4 w-4" /> Bill of Materials
                    </div>
                    
                    {product.bomItems && product.bomItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            {product.bomItems.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{item.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">{item.unit}</p>
                                    </div>
                                    <div className="text-sm font-bold text-primary">
                                        {item.quantity} {item.unit}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {product.billOfMaterials && (
                        <div className="space-y-3">
                            {product.bomItems && product.bomItems.length > 0 && <Separator className="mb-4" />}
                            <div className="bg-muted/30 p-4 rounded-lg border text-sm font-mono whitespace-pre-wrap leading-relaxed">
                                {product.billOfMaterials}
                            </div>
                        </div>
                    )}
                    
                    {(!product.bomItems || product.bomItems.length === 0) && !product.billOfMaterials && (
                        <div className="py-8 text-center border-2 border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground">
                            No bill of materials defined.
                        </div>
                    )}
                </div>

              <div className="space-y-8 pt-6 border-t">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Technical Drawings (PDF)</h3>
                    {canEdit && (
                        <div>
                            <input type="file" ref={fileInputRef} accept=".pdf" multiple onChange={handleFileUpload} className="hidden" />
                            <Button size="sm" variant="outline" className="h-8 border-primary text-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <UploadCloud className="h-3 w-3 mr-2" />}
                                Add Drawing
                            </Button>
                        </div>
                    )}
                </div>
                {pdfAttachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pdfAttachments.map((att, i) => (
                        <AttachmentCard 
                            key={i} 
                            attachment={att} 
                            onImageClick={() => {}}
                            onDelete={() => handleDeleteAttachment(att)}
                            canDelete={canDeleteFiles}
                        />
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-muted/10 rounded-lg border-2 border-dashed">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">No PDF drawings found</p>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4">
                    <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">CNC Programs (.TAP)</h3>
                    {canEdit && (
                        <Button size="sm" variant="outline" className="h-8 border-primary text-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            <Cpu className="h-3 w-3 mr-2" />
                            Add Program
                        </Button>
                    )}
                </div>
                {cncAttachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cncAttachments.map((att, i) => (
                        <AttachmentCard 
                            key={i} 
                            attachment={att} 
                            onImageClick={() => {}}
                            onDelete={() => handleDeleteAttachment(att)}
                            canDelete={canDeleteFiles}
                        />
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-muted/10 rounded-lg border-2 border-dashed">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">No CNC files found</p>
                    </div>
                )}
                
                {otherAttachments.length > 0 && (
                    <>
                        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground pt-4">Other Files</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {otherAttachments.map((att, i) => (
                                <AttachmentCard 
                                    key={i} 
                                    attachment={att} 
                                    onImageClick={() => {}}
                                    onDelete={() => handleDeleteAttachment(att)}
                                    canDelete={canDeleteFiles}
                                />
                            ))}
                        </div>
                    </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Order History</CardTitle></CardHeader>
        <CardContent><CustomerProvider><OrderTable orders={productOrders} preferenceKey="orderSortPreference" /></CustomerProvider></CardContent>
      </Card>
    </div>
    <ImageGallery open={galleryOpen} onOpenChange={setGalleryOpen} images={imageAttachments} startIndex={galleryStartIndex} />
    
    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogPortal>
            <DialogContent className="sm:max-w-sm overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline">
                        <QrCode className="h-5 w-5" /> Product QR Code
                    </DialogTitle>
                    <DialogDescription>Workshop tracking for this design.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-white rounded-3xl shadow-xl">
                        <QRCodeCanvas 
                            id="product-qr-code" 
                            value={`ORDERFLOW-PRODUCT:${product.id}`} 
                            size={200} 
                            level="H" 
                            includeMargin={false}
                        />
                    </div>
                    <p className="mt-6 text-sm font-bold text-slate-700 uppercase tracking-widest text-center max-w-[250px] truncate">{product.productName}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">#{product.id.slice(-8).toUpperCase()}</p>
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
    </>
  );
}

export default function ProductDetailPage() { return ( <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}><ProductDetailContent /></Suspense> ); }
