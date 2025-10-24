
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/firebase/auth/use-user"
import { Badge } from "@/components/ui/badge"

export default function UsersPage() {
    const { user: currentUser, loading } = useUser()

    if (loading) {
        return <div>Loading...</div>
    }

    if (currentUser?.role !== 'Admin') {
        return (
             <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Users</h1>
                    <p className="text-muted-foreground">
                        Manage all users in the system.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>You do not have permission to view this page.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    // Simplified user page - only shows current admin user for now.
    // The previous implementation was causing persistent data fetching errors.
    return (
        <div className="flex flex-col gap-8">
             <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Users</h1>
                <p className="text-muted-foreground">
                    Manage all users in the system. Currently showing your profile.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Admin User</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentUser ? (
                         <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={currentUser.avatarUrl} />
                                <AvatarFallback>{currentUser.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-semibold">{currentUser.name}</h2>
                                <p className="text-muted-foreground">{currentUser.email}</p>
                                <Badge variant="secondary" className="mt-2">{currentUser.role}</Badge>
                            </div>
                        </div>
                    ) : (
                        <p>Could not load user information.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
