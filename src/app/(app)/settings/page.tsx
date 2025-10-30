
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useColorSettings, ColorSettingProvider } from "@/hooks/use-color-settings";
import Image from "next/image";
import { Loader2, Trash2, PlusCircle, UploadCloud } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { uploadFileFlow } from "@/ai/flows/backblaze-flow";
import { useRef } from "react";

const woodFinishSchema = z.object({
  name: z.string().min(1, "Name is required"),
  imageUrl: z.string().url("A valid image URL is required"),
});

const customColorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  colorValue: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
});

const formSchema = z.object({
  woodFinishes: z.array(woodFinishSchema),
  customColors: z.array(customColorSchema),
});

type SettingsFormValues = z.infer<typeof formSchema>;


function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            if (base64) {
                resolve(base64);
            } else {
                reject(new Error("Failed to read file as base64."));
            }
        };
        reader.onerror = error => reject(error);
    });
};

function ColorSettingsForm() {
  const { settings, loading, updateSettings } = useColorSettings();
  const { toast } = useToast();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    values: {
        woodFinishes: settings?.woodFinishes || [],
        customColors: settings?.customColors || [],
    },
    resetOptions: {
        keepDirtyValues: false,
    }
  });

  const { fields: woodFields, append: appendWood, remove: removeWood } = useFieldArray({
    control: form.control,
    name: "woodFinishes",
  });

  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({
    control: form.control,
    name: "customColors",
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateSettings(data);
  };
  
  const handleImageUpload = async (file: File, index: number) => {
    if (!file) return;

    form.setValue(`woodFinishes.${index}.imageUrl`, 'uploading', { shouldDirty: true });

    try {
        const fileContent = await fileToBase64(file);
        const result = await uploadFileFlow({
            fileContent,
            contentType: file.type,
        });
        form.setValue(`woodFinishes.${index}.imageUrl`, result.url, { shouldDirty: true });
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: (e as Error).message || "Could not upload image.",
        })
        form.setValue(`woodFinishes.${index}.imageUrl`, '', { shouldDirty: true });
    }
  }


  if (loading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Wood Finishes</CardTitle>
               <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendWood({ name: "", imageUrl: "" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Wood Finish
              </Button>
            </div>
            <CardDescription>
              Manage the wood finish options available for orders. Click the preview to upload an image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {woodFields.map((field, index) => {
                const imageUrl = form.watch(`woodFinishes.${index}.imageUrl`);
                const isUploading = imageUrl === 'uploading';

                return (
                    <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                            <Label>Preview</Label>
                             <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={(el) => (fileInputRefs.current[index] = el)}
                                onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], index)}
                            />
                            <div 
                                className="h-24 w-24 bg-muted rounded-md mt-2 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                                onClick={() => fileInputRefs.current[index]?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                ) : imageUrl && imageUrl !== 'uploading' ? (
                                    <Image
                                        src={imageUrl}
                                        alt="Preview"
                                        width={96}
                                        height={96}
                                        className="object-cover rounded-md h-full w-full"
                                    />
                                ) : (
                                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                        <div className="flex-grow space-y-4">
                        <FormField
                            control={form.control}
                            name={`woodFinishes.${index}.name`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Finish Name</FormLabel>
                                <FormControl>
                                <Input {...field} placeholder="e.g. White Oak" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`woodFinishes.${index}.imageUrl`}
                            render={({ field }) => (
                                <FormItem className="hidden">
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeWood(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                )
            })}
             {woodFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No wood finishes added yet.</p>}
          </CardContent>
        </Card>
        
        <Separator />

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Custom Colors</CardTitle>
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendColor({ name: "", colorValue: "#ffffff" })}
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Custom Color
                </Button>
            </div>
            <CardDescription>
              Manage the solid color options. Use standard hex color codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {colorFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                    <Label>Preview</Label>
                    <div 
                        className="h-12 w-12 rounded-md mt-2 border" 
                        style={{ backgroundColor: form.watch(`customColors.${index}.colorValue`) || '#FFFFFF' }} 
                    />
                </div>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name={`customColors.${index}.name`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Color Name</FormLabel>
                            <FormControl>
                            <Input {...field} placeholder="e.g. Crimson Red" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`customColors.${index}.colorValue`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hex Value</FormLabel>
                            <FormControl>
                            <Input {...field} placeholder="#DC2626" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeColor(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {colorFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No custom colors added yet.</p>}
          </CardContent>
        </Card>
        
        <div className="flex justify-end sticky bottom-0 bg-background/95 py-4">
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </form>
    </Form>
  );
}


export default function SettingsPage() {
    return (
        <ColorSettingProvider>
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">
                    Manage your application settings and color palettes.
                    </p>
                </div>
                <ColorSettingsForm />
            </div>
        </ColorSettingProvider>
    )
}
