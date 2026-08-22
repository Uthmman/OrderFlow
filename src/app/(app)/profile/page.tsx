
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useUser, useUsers } from "@/hooks/use-user";
import { Loader2, UploadCloud, ShieldAlert, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFileFlow } from "@/ai/flows/backblaze-flow";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Role } from "@/lib/types";
import { useFirebase } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  telegram: z.string().optional(),
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
    const { user: authUser } = useFirebase();
    const { updateUserProfile, updateUserRole } = useUsers();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // POV Switcher States
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [pendingRole, setPendingRole] = useState<Role | null>(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        values: {
            name: user?.name || "",
            email: user?.email || "",
            phoneNumber: user?.phoneNumber || "",
            telegram: user?.telegram || "",
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
                fileName: file.name
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
            form.reset(data); 
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

    const handleRoleChangeIntent = (role: Role) => {
        if (role === user?.role) return;
        setPendingRole(role);
        setIsPasswordDialogOpen(true);
    };

    const verifyAndChangeRole = async () => {
        if (!user || !pendingRole) return;
        setIsVerifying(true);
        
        if (passwordInput === '12345678') {
            try {
                await updateUserRole(user.id, pendingRole);
                setIsPasswordDialogOpen(false);
                setPasswordInput("");
                setPendingRole(null);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Could not change user role.",
                });
            }
        } else {
            toast({
                variant: "destructive",
                title: "Invalid Password",
                description: "The security password entered is incorrect.",
            });
        }
        setIsVerifying(false);
    };

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
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">My Profile</h1>
                    <p className="text-muted-foreground">
                        Update your personal information and preferences.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="h-8 px-3 flex gap-2">
                        <Briefcase className="h-4 w-4" />
                        {user.workerType || 'Daily'} Worker
                    </Badge>
                    <p className="text-[10px] text-muted-foreground italic">Classification set by Admin</p>
                </div>
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
                             <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1 234 567 890" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="telegram"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telegram Username</FormLabel>
                                        <FormControl>
                                            <Input placeholder="@username" {...field} />
                                        </FormControl>
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
                    
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardHeader>
                            <CardTitle className="text-amber-700 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" /> Role Perspective
                            </CardTitle>
                            <CardDescription>Change your active role to see the app from a different perspective. Password required.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-xs space-y-2">
                                <FormLabel>Active Role</FormLabel>
                                <Select
                                    value={user.role}
                                    onValueChange={handleRoleChangeIntent}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                        <SelectItem value="Manager">Manager</SelectItem>
                                        <SelectItem value="Sales">Sales</SelectItem>
                                        <SelectItem value="Designer">Designer</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>


                     <div className="flex justify-end sticky bottom-0 bg-background/95 py-4 border-t mt-8">
                        <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                            {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Personal Details
                        </Button>
                    </div>
                </form>
            </Form>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Security Authorization</DialogTitle>
                        <DialogDescription>
                            Enter the security password to switch to the <strong>{pendingRole}</strong> role.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="password">Security Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter 8-digit password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && verifyAndChangeRole()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsPasswordDialogOpen(false);
                                setPasswordInput("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            onClick={verifyAndChangeRole}
                            disabled={isVerifying || passwordInput.length < 1}
                        >
                            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify & Change
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
