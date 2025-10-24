
"use client"

import * as React from "react"
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { User, Role } from "@/lib/types"
import { DataTable } from "@/components/app/data-table/data-table"
import { DataTableColumnHeader } from "@/components/app/data-table/data-table-column-header"
import { DataTableViewOptions } from "@/components/app/data-table/data-table-view-options"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/firebase/auth/use-user"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"

function UserActions({ user: targetUser }: { user: User }) {
    const { user: currentUser } = useUser();
    const firestore = useFirestore();
    const [role, setRole] = React.useState<Role>(targetUser.role)

    const handleRoleChange = async (newRole: Role) => {
        if (!firestore) return;
        const userProfileRef = doc(firestore, `users/${targetUser.id}/profile/${targetUser.id}`);
        updateDocumentNonBlocking(userProfileRef, { role: newRole });
        setRole(newRole);
    }
    
    // Only the admin can manage other users
    if (currentUser?.role !== 'Admin') {
        return null
    }

    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
                {targetUser.verified ? "Mark as Unverified" : "Mark as Verified"}
            </DropdownMenuItem>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={role} onValueChange={handleRoleChange}>
                        <DropdownMenuRadioItem value="Admin">Admin</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Manager">Manager</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Sales">Sales</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Designer">Designer</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem className="text-destructive">Delete User</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    )
}



function UsersTableToolbar({ table }: { table: ReturnType<typeof useReactTable<User>> }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter by user name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}

export default function UsersPage() {
    const { user: currentUser } = useUser()
    const firestore = useFirestore();

    const usersCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        // This is a simplification. In a real app, you'd query the 'profile' subcollection 
        // for each user, which is more complex. For this prototype, we'll assume a flat 'users' collection.
        // A better approach for production would be a Cloud Function to aggregate user profiles.
        return collection(firestore, 'users');
    }, [firestore]);
    
    // This is a simplification. `useCollection` would need to be adapted for subcollections.
    // We are fetching the top-level users collection, but the profile data is in a subcollection.
    // This will likely return empty unless the data structure is flattened.
    const { data: rawUsers, isLoading: loading } = useCollection<any>(usersCollectionRef);

    const users = React.useMemo(() => {
        // This mapping is a placeholder. You would need a more robust way to get profile data.
        return (rawUsers || []).map(u => ({
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
            email: u.email || 'No email',
            role: u.role || 'Designer',
            verified: u.verified || false,
            avatarUrl: u.avatarUrl || ''
        })) as User[];
    }, [rawUsers]);

    const columns: ColumnDef<User>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="User" />
        ),
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                </div>
            )
        },
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <Badge variant="secondary">{row.getValue("role")}</Badge>
      },
      {
        accessorKey: "verified",
        header: "Status",
        cell: ({ row }) => {
            const isVerified = row.getValue("verified") as boolean
            return isVerified ? <Badge variant="default">Verified</Badge> : <Badge variant="outline">Unverified</Badge>
        }
      },
      {
        id: "actions",
        cell: ({ row }) => {
          return (
            <div className="text-right">
                <UserActions user={row.original} />
            </div>
          )
        },
      },
    ]

    const table = useReactTable({
        data: users || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })
    
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


    if (loading) {
        return <div>Loading...</div>
    }

    return (
        <div className="flex flex-col gap-8">
             <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Users</h1>
                <p className="text-muted-foreground">
                    Manage all users in the system.
                </p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <DataTable table={table} columns={columns} data={users || []}>
                        <UsersTableToolbar table={table} />
                    </DataTable>
                </CardContent>
            </Card>
        </div>
    )
}
