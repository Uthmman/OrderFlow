
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
import { MoreHorizontal, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table/data-table"
import { DataTableColumnHeader } from "@/components/app/data-table/data-table-column-header"
import { DataTableViewOptions } from "@/components/app/data-table/data-table-view-options"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useUser, useUsers } from "@/hooks/use-user"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AppUser, Role } from "@/lib/types"

function UserActions({ user: targetUser }: { user: AppUser }) {
    const { user, updateUserRole } = useUsers();

    if (user?.role !== 'Admin' || targetUser.email === 'zenbabfurniture@gmail.com') {
        return null;
    }

    const handleRoleChange = (role: Role) => {
        updateUserRole(targetUser.id, role);
    }
    
    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
             <Select onValueChange={handleRoleChange} defaultValue={targetUser.role}>
                <SelectTrigger className="w-[180px] mx-2">
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Designer">Designer</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
            </Select>
          </DropdownMenuContent>
        </DropdownMenu>
    )
}

const roleVariantMap: Record<Role, "default" | "secondary" | "destructive" | "outline"> = {
    "Admin": "default",
    "Manager": "secondary",
    "Sales": "secondary",
    "Designer": "secondary",
    "Pending": "outline",
};

export const columns: ColumnDef<AppUser>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => {
        const user = row.original;
        return (
            <div className="flex items-center gap-3 group">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.name?.split(" ").map(n => n[0]).join("") || '?'}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{user.name || 'No Name'}</span>
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
    cell: ({ row }) => {
        const role = row.getValue("role") as Role;
        return <Badge variant={roleVariantMap[role]}>{role}</Badge>
    },
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

function UserTableToolbar({ table }: { table: ReturnType<typeof useReactTable<AppUser>> }) {
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
      <DataTableViewOptions table={table} />
    </div>
  )
}

function MobileUserList({ users }: { users: AppUser[] }) {
    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between gap-2">
                <Input
                    placeholder="Filter by user..."
                    className="h-9 flex-1"
                />
            </div>
            {users.map(user => (
                 <Card key={user.id} className="hover:bg-muted/50 transition-colors">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatarUrl} />
                                    <AvatarFallback>{user.name?.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-base font-bold">{user.name}</CardTitle>
                                    <CardDescription>{user.email}</CardDescription>
                                </div>
                            </div>
                           <div onClick={(e) => e.preventDefault()}>
                                <UserActions user={user} />
                           </div>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <Badge variant={roleVariantMap[user.role]}>{user.role}</Badge>
                    </CardContent>
                 </Card>
            ))}
        </div>
    )
}


export default function UsersPage() {
    const { users, loading, user: currentUser } = useUsers();
    const router = useRouter();

    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })

    if (loading) {
        return <div>Loading...</div>
    }

    if (currentUser?.role !== 'Admin') {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <p>Please contact an administrator if you believe this is a mistake.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="flex flex-col gap-8">
             <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Users</h1>
                <p className="text-muted-foreground">
                    Manage all users in the system.
                </p>
            </div>
            <div className="md:hidden">
                <MobileUserList users={users} />
            </div>
            <Card className="hidden md:block">
                <CardContent className="pt-6">
                    <DataTable table={table} columns={columns} data={users}>
                        <UserTableToolbar table={table} />
                    </DataTable>
                </CardContent>
            </Card>
        </div>
    )
}
