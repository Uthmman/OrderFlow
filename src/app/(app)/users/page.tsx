
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UsersPage() {
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
                    <CardTitle>Authentication Removed</CardTitle>
                    <CardDescription>User management is disabled because authentication has been removed.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <p>To re-enable user management, please ask to add authentication to the app.</p>
                </CardContent>
            </Card>
        </div>
    )
}
