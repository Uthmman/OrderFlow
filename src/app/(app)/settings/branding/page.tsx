
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
import { Loader2, Info } from "lucide-react";
import Image from "next/image";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";

const brandingSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

export default function BrandingSettingsPage() {
  const { settings, loading, updateSettings } = useBrandSettings();
  const { role } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = role === 'Admin';

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    values: {
      companyName: settings?.companyName || "",
    }
  });

  const onSubmit = async (data: BrandingFormValues) => {
    if (!canEdit) return;
    setIsSubmitting(true);
    try {
        await updateSettings(data);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Branding</h1>
        <p className="text-muted-foreground text-sm">Manage your company identity. All visuals are now static files.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Company Identity</CardTitle>
              <CardDescription>Update your company name as it appears in the sidebar and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Current Active Logo</Label>
                <div className="flex items-center gap-6">
                  <div className="h-32 w-32 border-2 border-dashed rounded-2xl flex items-center justify-center bg-white shadow-sm relative overflow-hidden group">
                    <Image src="/logo.png" alt="Static Logo" fill className="object-contain p-4" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Info className="h-3.5 w-3.5" />
                        <p className="text-[10px] font-bold uppercase tracking-tight">Static Asset Info</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                        To change this logo, upload a new image named <code className="bg-muted px-1 rounded">logo.png</code> to the <code className="bg-muted px-1 rounded">public/</code> folder in your project explorer.
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Zenbab Furniture" disabled={!canEdit} className="h-12" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty} className="px-8 h-12 rounded-full shadow-lg shadow-primary/20">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
