

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
import { differenceInDays, formatDistanceToNowStrict } from 'date-fns';

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
import { formatCurrency, formatOrderId, formatTimestamp } from "@/lib/utils"
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
import { ColorSettingProvider } from "@/hooks/use-color-settings"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils";


const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    "Pending": "outline",
    "In Progress": "secondary",
    "Designing": "secondary",
    "Manufacturing": "secondary",
    "Completed": "default",
    "Shipped": "default",
    "Cancelled": "destructive",
}

const DeadlineDisplay = ({ deadline }: { deadline: any }) => {
    const deadlineDate = deadline?.seconds ? new Date(deadline.seconds * 1000) : new Date(deadline);
    const today = new Date();
    const daysLeft = differenceInDays(deadlineDate, today);

    let text;
    let colorClass = "text-muted-foreground";

    if (daysLeft < 0) {
        text = `${Math.abs(daysLeft)} days overdue`;
        colorClass = "text-destructive font-medium";
    } else if (daysLeft === 0) {
        text = "Due today";
        colorClass = "text-amber-600 font-medium";
    } else if (daysLeft <= 7) {
        text = `Due in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
        colorClass = "text-amber-600";
    } else {
        text = `Due in ${daysLeft} days`;
    }

    return (
        <div>
            <div>{formatTimestamp(deadline)}</div>
            <div className={cn("text-xs", colorClass)}>{text}</div>
        </div>
    )
}

function OrderActions({ order }: { order: Order }) {
    const router = useRouter();
    const { deleteOrder, updateOrder } = useOrders();
    const { toast } = useToast();
    const { user, role } = useUser();
    const canEdit = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);


    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        updateOrder({ ...order, status: "Cancelled" });
        toast({
            title: "Order Cancelled",
            description: `Order ${formatOrderId(order.id)} has been cancelled.`,
        });
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteOrder(order.id, order.attachments);
        toast({
            title: "Order Deleted",
            description: `Order ${formatOrderId(order.id)} has been permanently deleted.`,
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
                 {canEdit && (
                    <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}/edit`)}>
                        Edit Order
                    </DropdownMenuItem>
                 )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleUrgent(e); }}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>{order.isUrgent ? "Remove Urgency" : "Make Urgent"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.id)}>
                  Copy Order ID
                </DropdownMenuItem>
                {canEdit && (
                    <>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                Cancel Order
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                         <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                Delete Order
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the order
                        and remove its data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function CustomerLink({ order }: { order: Order }) {
    const { user, role } = useUser();
    
    const canViewCustomer = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);

    if (canViewCustomer) {
        return <Link className="hover:underline" href={`/customers/${order.customerId}`} onClick={(e) => e.stopPropagation()}>{order.customerName}</Link>
    }

    return <span>{order.customerName}</span>;
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
        return <CustomerLink order={order} />
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status") as OrderStatus;
        return <Badge variant={statusVariantMap[status] || 'outline'}>{status}</Badge>
    },
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Deadline" />
    ),
    cell: ({ row }) => {
      return <DeadlineDisplay deadline={row.getValue("deadline")} />
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
    const router = useRouter();
    return (
        <div className="space-y-4">
            {orders.map(order => (
                 <Card key={order.id} className="hover:bg-muted/50 transition-colors">
                    <div onClick={() => router.push(`/orders/${order.id}`)} className="cursor-pointer">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base font-bold">
                                        {formatOrderId(order.id)}
                                    </CardTitle>
                                    <CardDescription>
                                        <CustomerLink order={order} />
                                    </CardDescription>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <OrderActions order={order} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center">
                                <Badge variant={statusVariantMap[order.status] || 'outline'}>{order.status}</Badge>
                                 <div className="text-sm text-muted-foreground">
                                    <DeadlineDisplay deadline={order.deadline} />
                                </div>
                            </div>
                        </CardContent>
                    </div>
                    <CardFooter onClick={() => router.push(`/orders/${order.id}`)} className="cursor-pointer">
                        <div className="text-base font-medium w-full text-right">
                            {formatCurrency(order.incomeAmount)}
                        </div>
                    </CardFooter>
                 </Card>
            ))}
        </div>
    )
}

interface OrderTableProps {
    orders?: Order[];
    toolbar?: React.ReactNode;
}

function OrderTableInternal({ orders: propOrders, toolbar }: OrderTableProps) {
  const { orders: contextOrders, loading } = useOrders();
  
  const orders = propOrders ?? contextOrders;

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading && !propOrders) {
      return <div className="text-center p-8">Loading orders...</div>
  }
  
  if (orders.length === 0) {
    return <div className="text-center p-8 text-muted-foreground">No orders to display.</div>
  }

  return (
    <>
        <div className="hidden md:block">
            <DataTable table={table} columns={columns} data={orders}>
                {toolbar}
            </DataTable>
        </div>
         <div className="block md:hidden">
            <MobileOrderList orders={orders} />
        </div>
    </>
  )
}

export function OrderTable(props: OrderTableProps) {
    return (
        <ColorSettingProvider>
            <OrderTableInternal {...props} />
        </ColorSettingProvider>
    )
}

    

    

