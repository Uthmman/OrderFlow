
"use client";

import { Suspense, use } from "react";
import { useRouter, notFound } from "next/navigation";
import { ProductProvider, useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Box, Ruler, Download, File, Image as ImageIcon, PlusCircle, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { OrderAttachment } from "@/lib/types";

function AttachmentCard({ attachment }: { attachment: OrderAttachment }) {
    const isImage = attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    return (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" download={attachment.fileName}>
            <Card className="hover:bg-muted/50 transition-colors group">
                <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        {isImage ? <ImageIcon /> : <File />}
                    </div>
                    <div className="flex-grow truncate">
                        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <Download className="h-5 w-5"/>
                    </Button>
                </CardContent>
            </Card>
        </a>
    )
}

function ProductDetailContent({ params }: { params: { id: string } }) {
  const { id } = use(params);
  const router = useRouter();
  const { getProductById, loading } = useProducts();

  if (loading) {
    return <div>Loading...</div>;
  }

  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const primaryAttachment = product.attachments?.[0] || product.designAttachments?.[0];
  const allAttachments = [...(product.attachments || []), ...(product.designAttachments || [])];

  return (
    <div className="flex flex-col gap-8">
       <div className="flex justify-between items-start">
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2"/> Back to Catalog</Button>
            <Button onClick={() => router.push(`/orders/new?fromProduct=${product.id}`)}>
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
                <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative">
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
                        {allAttachments.map((att, i) => <AttachmentCard key={i} attachment={att}/>)}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No attachments for this product.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
    return (
        <ProductProvider>
            <Suspense fallback={<div>Loading product details...</div>}>
                <ProductDetailContent params={params} />
            </Suspense>
        </ProductProvider>
    )
}
