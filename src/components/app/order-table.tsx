
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
import { MoreHorizontal, PlusCircle, AlertTriangle } from "lucide-react"

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
import { formatCurrency, formatOrderId } from "@/lib/utils"
import { DataTable } from "./data-table/data-table"
import { DataTableColumnHeader } from "./data-table/data-table-column-header"
import { DataTableViewOptions } from "./data-table/data-table-view-options"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useOrders } from "@/hooks/use-orders"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"


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
    const { deleteOrder, updateOrder } = useOrders();
    const { toast } = useToast();

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        updateOrder({ ...order, status: "Cancelled" });
        toast({
            title: "Order Cancelled",
            description: `Order ${formatOrderId(order.id)} has been cancelled.`,
        });
    }

    const handleToggleUrgent = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateOrder({ ...order, isUrgent: !order.isUrgent });
        toast({
            title: `Urgency ${order.isUrgent ? "Removed" : "Added"}`,
            description: `Order ${formatOrderId(order.id)} has been updated.`,
        });
      };

    return (
        <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                  View Details
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}/edit`)}>
                  Edit Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleUrgent(e); }}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>{order.isUrgent ? "Remove Urgency" : "Make Urgent"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.id)}>
                  Copy Order ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                        Cancel Order
                    </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will cancel the order. This action can be undone by changing the order status.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>Cancel Order</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
    cell: ({ row }) => <div className="font-medium text-primary"><Link href={`/orders/${row.getValue("id")}`}>{formatOrderId(row.getValue("id"))}</Link></div>,
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => {
        const order = row.original;
        return <Link className="hover:underline" href={`/customers/${order.customerId}`}>{row.getValue("customerName")}</Link>
    },
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
    cell: ({ row }) => <div className="flex justify-end"><OrderActions order={row.original} /></div>,
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
             <div className="flex items-center justify-between gap-2">
                <Input
                    placeholder="Filter orders..."
                    className="h-9 flex-1"
                />
                 <Link href="/orders/new">
                    <Button size="sm" className="h-9">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">New</span>
                    </Button>
                </Link>
            </div>
            {orders.map(order => (
                 <Card key={order.id} className="hover:bg-muted/50 transition-colors">
                    <Link href={`/orders/${order.id}`} className="block">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base font-bold">
                                        {formatOrderId(order.id)}
                                    </CardTitle>
                                    <CardDescription>
                                        <Link className="hover:underline" href={`/customers/${order.customerId}`} onClick={(e) => e.stopPropagation()}>
                                            {order.customerName}
                                        </Link>
                                    </CardDescription>
                                </div>
                                <div onClick={(e) => e.preventDefault()}>
                                    <OrderActions order={order} />
                                </div>
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
                    </Link>
                 </Card>
            ))}
        </div>
    )
}

interface OrderTableProps {
    orders?: Order[];
}

export function OrderTable({ orders: propOrders }: OrderTableProps) {
  const { orders: contextOrders, loading } = useOrders();
  
  const orders = propOrders ?? contextOrders;

  const sortedOrders = React.useMemo(() => {
    if (!orders) return [];
    return [...orders].sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime())
  }, [orders]);

  const table = useReactTable({
    data: sortedOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading && !propOrders) {
      return <div className="text-center p-8">Loading orders...</div>
  }
  
  return (
    <>
        <div className="hidden md:block">
            <DataTable table={table} columns={columns} data={sortedOrders}>
                <OrderTableToolbar table={table} />
            </DataTable>
        </div>
         <div className="block md:hidden">
            <MobileOrderList orders={sortedOrders} />
        </div>
    </>
  )
}
