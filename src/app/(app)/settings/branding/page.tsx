
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useBrandSettings } from "@/hooks/use-brand-settings";
import { Loader2, UploadCloud, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFileFlow } from "@/ai/flows/backblaze-flow";
import { useRef, useState } from "react";
import Image from "next/image";

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  companyName: z.string().optional(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

export default function BrandingSettingsPage() {
  const { settings, loading, updateSettings } = useBrandSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    values: {
      logoUrl: settings?.logoUrl || "",
      companyName: settings?.companyName || "",
    }
  });

  const logoUrl = form.watch('logoUrl');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
    });
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
        const base64 = await fileToBase64(file);
        const result = await uploadFileFlow({
            fileContent: base64,
            contentType: file.type,
            fileName: file.name
        });
        form.setValue('logoUrl', result.url, { shouldDirty: true });
        toast({ title: "Logo Uploaded" });
    } catch (e) {
        toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
        setIsUploading(false);
    }
  };

  const onSubmit = async (data: BrandingFormValues) => {
    setIsSubmitting(true);
    await updateSettings(data);
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Branding</h1>
        <p className="text-muted-foreground">Manage your company identity for exports and technical drawings.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Company Identity</CardTitle>
              <CardDescription>This logo will be used in generated QR footers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-6">
                  <div className="h-32 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 relative overflow-hidden">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill className="object-contain p-2" />
                    ) : (
                      <UploadCloud className="h-8 w-8 text-muted-foreground opacity-30" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleLogoUpload(e.target.files[0])} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      {logoUrl ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {logoUrl && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => form.setValue('logoUrl', '', { shouldDirty: true })}>
                        <Trash2 className="h-3 w-3 mr-2" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Zenbab Furniture" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Branding
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
