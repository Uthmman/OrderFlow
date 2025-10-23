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
import { MoreHorizontal, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Customer } from "@/lib/types"
import { mockCustomers } from "@/lib/mock-data"
import { DataTable } from "@/components/app/data-table/data-table"
import { DataTableColumnHeader } from "@/components/app/data-table/data-table-column-header"
import { DataTableViewOptions } from "@/components/app/data-table/data-table-view-options"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useOrders } from "@/hooks/use-orders"

function CustomerActions({ customer }: { customer: Customer }) {
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
            <DropdownMenuItem>View Customer</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    )
}


export const columns: ColumnDef<Customer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => {
        const customer = row.original;
        return (
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={customer.avatarUrl} />
                    <AvatarFallback>{customer.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{customer.name}</span>
            </div>
        )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "orderIds",
    header: "Total Orders",
    cell: ({ row }) => {
      const orders = row.getValue("orderIds") as string[]
      return <div className="text-center font-medium">{orders.length}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-right">
            <CustomerActions customer={row.original} />
        </div>
      )
    },
  },
]

function CustomerTableToolbar({ table }: { table: ReturnType<typeof useReactTable<Customer>> }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter by customer name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        <Button size="sm" className="h-8">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Customer
        </Button>
      </div>
    </div>
  )
}

function MobileCustomerList({ customers }: { customers: Customer[] }) {
    const { orders } = useOrders();

    const getCustomerOrderCount = (customerId: string) => {
        return orders.filter(order => order.customerId === customerId).length;
    }

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between gap-2">
                <Input
                    placeholder="Filter by customer..."
                    className="h-9 flex-1"
                />
                 <Link href="/customers/new">
                    <Button size="sm" className="h-9">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">New</span>
                    </Button>
                </Link>
            </div>
            {customers.map(customer => (
                 <Card key={customer.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={customer.avatarUrl} />
                                    <AvatarFallback>{customer.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-base font-bold">{customer.name}</CardTitle>
                                    <CardDescription>{customer.company}</CardDescription>
                                </div>
                            </div>
                           <CustomerActions customer={customer} />
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p className="text-muted-foreground">{customer.email}</p>
                        <p className="text-muted-foreground">{customer.phone}</p>
                        <p>
                            <span className="font-medium">{getCustomerOrderCount(customer.id)}</span>{" "}
                            <span className="text-muted-foreground">orders</span>
                        </p>
                    </CardContent>
                 </Card>
            ))}
        </div>
    )
}

export default function CustomersPage() {
    const data = React.useMemo(() => mockCustomers, []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })


    return (
        <div className="flex flex-col gap-8">
             <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Customers</h1>
                <p className="text-muted-foreground">
                    Manage your customer profiles and view their order history.
                </p>
            </div>
            <div className="md:hidden">
                <MobileCustomerList customers={data} />
            </div>
            <Card className="hidden md:block">
                <CardContent className="pt-6">
                    <DataTable table={table} columns={columns} data={data}>
                        <CustomerTableToolbar table={table} />
                    </DataTable>
                </CardContent>
            </Card>
        </div>
    )
}
