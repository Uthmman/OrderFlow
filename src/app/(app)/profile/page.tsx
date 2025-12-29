
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useUser, useUsers } from "@/hooks/use-user";
import { Loader2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFileFlow } from "@/ai/flows/backblaze-flow";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Role } from "@/lib/types";
import { useFirebase } from "@/firebase";

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  orderSortPreference: z.object({
    field: z.enum(["creationDate", "deadline"]),
    direction: z.enum(["asc", "desc"]),
  }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

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

export default function ProfilePage() {
    const { user, loading } = useUser();
    const { authUser } = useFirebase();
    const { updateUserProfile, updateUserRole } = useUsers();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isPrimaryAdmin = authUser?.email === 'zenbabfurniture@gmail.com';

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        values: {
            name: user?.name || "",
            email: user?.email || "",
            avatarUrl: user?.avatarUrl,
            orderSortPreference: user?.orderSortPreference || { field: 'deadline', direction: 'asc' },
        }
    });
    
    const avatarUrl = form.watch('avatarUrl');

    const handleAvatarUpload = async (file: File) => {
        if (!file) return;
        setIsUploading(true);
        
        try {
            const fileContent = await fileToBase64(file);
            const result = await uploadFileFlow({
                fileContent,
                contentType: file.type,
            });
            form.setValue('avatarUrl', result.url, { shouldDirty: true });
        } catch(e) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: (e as Error).message || "Could not upload image.",
            });
        } finally {
            setIsUploading(false);
        }
    }

    const onSubmit = async (data: ProfileFormValues) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await updateUserProfile(user.id, data);
            form.reset(data); // Resets the dirty state
             toast({
                title: "Profile Updated",
                description: "Your changes have been saved.",
            });
        } catch (error) {
            console.error("Failed to update profile", error);
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: "There was an issue updating your profile.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
    }
    
    if (!user) {
        return <p>User not found.</p>
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">My Profile</h1>
                <p className="text-muted-foreground">
                    Update your personal information and preferences.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Details</CardTitle>
                            <CardDescription>Manage your name, email, and avatar.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="avatarUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Profile Picture</FormLabel>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-24 w-24">
                                                <AvatarImage src={avatarUrl} />
                                                <AvatarFallback className="text-3xl">
                                                    {user.name.split(" ").map(n => n[0]).join("")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={(e) => e.target.files && handleAvatarUpload(e.target.files[0])}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <UploadCloud className="mr-2" />
                                                )}
                                                Upload New Picture
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled />
                                        </FormControl>
                                        <FormDescription>You cannot change your email address.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Display Preferences</CardTitle>
                            <CardDescription>Set your default sorting preferences for order tables.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <FormField
                                control={form.control}
                                name="orderSortPreference"
                                render={() => (
                                   <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="orderSortPreference.field"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Sort By</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a field" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="deadline">Deadline</SelectItem>
                                                            <SelectItem value="creationDate">Order Date</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="orderSortPreference.direction"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Order</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select an order" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="asc">Ascending</SelectItem>
                                                            <SelectItem value="desc">Descending</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                   </div>
                                )}
                            />
                        </CardContent>
                    </Card>
                    
                    {isPrimaryAdmin && (
                        <Card>
                             <CardHeader>
                                <CardTitle>Admin Tools</CardTitle>
                                <CardDescription>Temporarily change your role to view the app as another user type.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="max-w-xs space-y-2">
                                     <FormLabel>View As</FormLabel>
                                     <Select
                                        value={user.role}
                                        onValueChange={(newRole: Role) => updateUserRole(user.id, newRole)}
                                      >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                            <SelectItem value="Manager">Manager</SelectItem>
                                            <SelectItem value="Sales">Sales</SelectItem>
                                            <SelectItem value="Designer">Designer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    )}


                     <div className="flex justify-end sticky bottom-0 bg-background/95 py-4">
                        <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                            {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
