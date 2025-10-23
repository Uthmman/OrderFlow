
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
import { useCollection, useFirestore, useUser as useAuthUser } from "@/firebase"
import { collection, doc, updateDoc } from "firebase/firestore"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"

function UserActions({ user }: { user: User }) {
    const firestore = useFirestore()
    const { user: currentUser } = useAuthUser()
    const [role, setRole] = React.useState<Role>(user.role)

    const handleRoleChange = async (newRole: Role) => {
        if (!firestore) return
        const userRef = doc(firestore, "users", user.id)
        await updateDoc(userRef, { role: newRole })
        setRole(newRole)
    }

    const handleVerificationToggle = async () => {
        if (!firestore) return
        const userRef = doc(firestore, "users", user.id)
        await updateDoc(userRef, { verified: !user.verified })
    }

    if (currentUser?.email !== 'zenbabafurniture@gmail.com') {
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
            <DropdownMenuItem onClick={handleVerificationToggle}>
                {user.verified ? "Mark as Unverified" : "Mark as Verified"}
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

export const columns: ColumnDef<User>[] = [
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
    const firestore = useFirestore()
    const { user: currentUser } = useAuthUser()

    const usersCollection = useMemo(() => 
        (firestore ? collection(firestore, 'users') : null), 
        [firestore]
    )
    const { data: users, loading } = useCollection<User>(usersCollection);
    
    const table = useReactTable({
        data: users || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })

    if (currentUser?.email !== 'zenbabafurniture@gmail.com') {
      return (
          <div className="flex flex-col gap-8">
              <div>
                  <h1 className="text-3xl font-bold font-headline tracking-tight">Access Denied</h1>
                  <p className="text-muted-foreground">
                      You do not have permission to view this page.
                  </p>
              </div>
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
