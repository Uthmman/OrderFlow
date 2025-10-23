
"use client"

import * as React from "react"
import {
  ColumnDef,
  useReactTable,
} from "@tanstack/react-table"
import {
  MoreHorizontal,
  PlusCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Order, OrderStatus } from "@/lib/types"
import { mockOrders } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"
import { DataTable } from "./data-table/data-table"
import { DataTableColumnHeader } from "./data-table/data-table-column-header"
import { DataTableViewOptions } from "./data-table/data-table-view-options"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    "Pending": "outline",
    "In Progress": "secondary",
    "Designing": "secondary",
    "Manufacturing": "secondary",
    "Completed": "default",
    "Shipped": "default",
    "Cancelled": "destructive",
}

function OrderActions({ order }: { order: Order }) {
    const router = useRouter();
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
            <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.id)}>
              Copy Order ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Cancel Order</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const columns: ColumnDef<Order>[] = [
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
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
    cell: ({ row }) => <div className="font-medium text-primary"><Link href={`/orders/${row.getValue("id")}`}>{row.getValue("id")}</Link></div>,
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => <div>{row.getValue("customerName")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status") as OrderStatus;
        return <Badge variant={statusVariantMap[status]}>{status}</Badge>
    },
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Deadline" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("deadline"))
      return <div>{date.toLocaleDateString()}</div>
    },
    enableHiding: true,
  },
  {
    accessorKey: "incomeAmount",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Income" />
      </div>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("incomeAmount"))
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>
    },
    enableHiding: true,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <OrderActions order={row.original} />,
  },
]

function OrderTableToolbar({ table }: { table: ReturnType<typeof useReactTable<Order>> }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter by customer..."
          value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("customerName")?.setFilterValue(event.target.value)
          }
          className="h-8 w-full sm:w-[250px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        <Link href="/orders/new">
            <Button size="sm" className="h-8">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Order</span>
            </Button>
        </Link>
      </div>
    </div>
  )
}

function MobileOrderList({ orders }: { orders: Order[] }) {
    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <Input
                    placeholder="Filter by customer..."
                    className="h-8 w-full"
                />
            </div>
            {orders.map(order => (
                 <Card key={order.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-base font-bold">
                                    <Link href={`/orders/${order.id}`} className="hover:underline">{order.id}</Link>
                                </CardTitle>
                                <CardDescription>{order.customerName}</CardDescription>
                            </div>
                           <OrderActions order={order} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center">
                            <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>
                            <div className="text-sm text-muted-foreground">
                                Due: {new Date(order.deadline).toLocaleDateString()}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <div className="text-base font-medium w-full text-right">
                            {formatCurrency(order.incomeAmount)}
                        </div>
                    </CardFooter>
                 </Card>
            ))}
        </div>
    )
}


export function OrderTable() {
  const data = React.useMemo(() => mockOrders, []);
  
  return (
    <>
        <div className="hidden md:block">
            <DataTable columns={columns} data={data}>
                <OrderTableToolbar />
            </DataTable>
        </div>
         <div className="block md:hidden">
            <MobileOrderList orders={data} />
        </div>
    </>
  )
}

  