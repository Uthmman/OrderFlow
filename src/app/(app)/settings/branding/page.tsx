
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
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useUser } from "@/hooks/use-user";

const brandingSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

export default function BrandingSettingsPage() {
  const { settings, loading, updateSettings } = useBrandSettings();
  const { role } = useUser();
  const [isSubmitting, setIsSubmitting] = z.useState(false);

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
    await updateSettings(data);
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Branding</h1>
        <p className="text-muted-foreground">Manage your company identity. Note: The app logo is now static (/logo.png).</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Company Identity</CardTitle>
              <CardDescription>Update your company name as it appears in the sidebar and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Current App Logo</Label>
                <div className="flex items-center gap-6">
                  <div className="h-32 w-32 border rounded-lg flex items-center justify-center bg-white shadow-sm relative overflow-hidden">
                    <Image src="/logo.png" alt="Static Logo" fill className="object-contain p-2" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Asset Location</p>
                    <p className="text-[10px] font-mono bg-muted px-2 py-1 rounded">public/logo.png</p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Zenbab Furniture" disabled={!canEdit} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Company Name
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
