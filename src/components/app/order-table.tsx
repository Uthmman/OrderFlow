

"use client"

import * as React from "react"
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  Table,
} from "@tanstack/react-table"
import { MoreHorizontal, PlusCircle, AlertTriangle, Trash2 } from "lucide-react"
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
import { Order, OrderStatus, OrderSortPreference } from "@/lib/types"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ColorSettingProvider } from "@/hooks/use-color-settings"
import { useUser, useUsers } from "@/hooks/use-user"
import { cn } from "@/lib/utils";
import { SortDirection, SortField } from "@/app/(app)/orders/page"
import { useProductSettings, ProductSettingProvider } from "@/hooks/use-product-settings"
import * as LucideIcons from 'lucide-react';
import Image from "next/image";
import { DataTablePagination } from "./data-table/data-table-pagination"
import { ProductProvider } from "@/hooks/use-products"


const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    "Pending": "outline",
    "Designing": "secondary",
    "Design Ready": "secondary",
    "In Progress": "secondary",
    "Manufacturing": "secondary",
    "Painting": "secondary",
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
    const [dialogAction, setDialogAction] = React.useState<'cancel' | 'delete' | null>(null);
    const canEdit = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);

    const handleAction = () => {
        if (dialogAction === 'cancel') {
            updateOrder({ ...order, status: "Cancelled" });
            toast({
                title: "Order Cancelled",
                description: `Order ${formatOrderId(order.id)} has been cancelled.`,
            });
        } else if (dialogAction === 'delete') {
            const allAttachments = (order.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]);
            deleteOrder(order.id, allAttachments);
            toast({
                title: "Order Deleted",
                description: `Order ${formatOrderId(order.id)} has been permanently deleted.`,
            });
        }
    };

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
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                  View Details
                </DropdownMenuItem>
                 {canEdit && (
                    <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}/edit`)}>
                        Edit Order
                    </DropdownMenuItem>
                 )}
                <DropdownMenuItem onClick={handleToggleUrgent}>
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
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setDialogAction('cancel'); }}>
                                Cancel Order
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                         <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setDialogAction('delete'); }}>
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
                      {dialogAction === 'cancel' 
                        ? "This will cancel the order. This can be undone by changing the order status."
                        : "This action cannot be undone. This will permanently delete the order and remove its data from our servers."
                      }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAction}>
                        {dialogAction === 'cancel' ? 'Cancel Order' : 'Delete Order'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function CustomerLink({ order }: { order: Order }) {
    const { user, role } = useUser();
    
    // Admins and Managers can view any customer. Sales can only view if they are the owner.
    const canViewCustomer = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);

    if (canViewCustomer) {
        return <Link className="hover:underline" href={`/customers/${order.customerId}`} onClick={(e) => e.stopPropagation()}>{order.customerName}</Link>
    }

    return <span>{order.customerName}</span>;
}

const CategoryIcon = ({ order }: { order: Order }) => {
    const { productSettings } = useProductSettings();
    const firstProduct = (order.products && order.products.length > 0) ? order.products[0] : null;
    if (!firstProduct) return <LucideIcons.Box className="h-9 w-9 text-muted-foreground flex-shrink-0"/>;

    const category = productSettings?.productCategories.find(c => c.name === firstProduct.category);
    const iconName = category?.icon || 'Box';
    
    // Check if the icon is a URL (AI-generated) or a Lucide icon name
    const isUrl = iconName.startsWith('http') || iconName.startsWith('data:');

    if (isUrl) {
        return <Image src={iconName} alt={firstProduct.category} width={36} height={36} className="h-9 w-9 rounded-md object-cover flex-shrink-0" />;
    }

    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Box;
    return <IconComponent className="h-9 w-9 text-muted-foreground flex-shrink-0"/>;
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
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order" />
    ),
    cell: ({ row }) => {
        const order = row.original;
        const firstProduct = (order.products && order.products.length > 0) ? order.products[0] : null;
        
        return (
            <div className="flex items-center gap-3">
                 <CategoryIcon order={order} />
                 <div>
                    <div className="font-medium text-primary hover:underline">
                        <Link href={`/orders/${order.id}`}>{firstProduct?.productName || 'Custom Order'}</Link>
                    </div>
                    <div className="text-sm text-muted-foreground">{formatOrderId(order.id)}</div>
                 </div>
            </div>
        );
    },
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
    accessorKey: "creationDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Date" />
    ),
    cell: ({ row }) => formatTimestamp(row.getValue("creationDate")),
    enableHiding: true,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <div className="flex justify-end"><OrderActions order={row.original} /></div>,
  },
]

function OrderTableToolbar({ 
  table, 
  preferenceKey 
}: { 
  table: Table<Order>, 
  preferenceKey: 'orderSortPreference' | 'dashboardOrderSortPreference'
}) {
  const { user } = useUser();
  const { updateUserPreferences } = useUsers();
  const { deleteMultipleOrders } = useOrders();
  const { toast } = useToast();

  const handleSortChange = (newSorting: SortingState) => {
    table.setSorting(newSorting);
    if (user && newSorting.length > 0) {
      const { id, desc } = newSorting[0];
      const preference: OrderSortPreference = {
        field: id as SortField,
        direction: desc ? 'desc' : 'asc',
      };
      updateUserPreferences(user.id, { [preferenceKey]: preference });
    }
  };

  const handleDeleteSelected = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ordersToDelete = selectedRows.map(row => row.original);
    deleteMultipleOrders(ordersToDelete);
    table.resetRowSelection();
    toast({
      title: `${ordersToDelete.length} Order(s) Deleted`,
      description: "The selected orders have been permanently deleted.",
    });
  }

  const currentSort = table.getState().sorting[0];
  const sortField = currentSort?.id as SortField || 'creationDate';
  const sortDirection = currentSort?.desc ? 'desc' : 'asc';
  
  const numSelected = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
       <Input
          placeholder="Filter by customer, ID, or product..."
          value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("customerName")?.setFilterValue(event.target.value)
          }
          className="h-9 w-full sm:w-[150px] lg:w-[250px]"
        />
      <div className="flex items-center gap-2">
           <Select value={sortField} onValueChange={(v) => handleSortChange([{ id: v, desc: sortDirection === 'desc' }])}>
                <SelectTrigger className="h-9 w-full sm:w-[150px]">
                    <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="creationDate">Order Date</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                </SelectContent>
            </Select>
             <Select value={sortDirection} onValueChange={(v) => handleSortChange([{ id: sortField, desc: v === 'desc' }])}>
                <SelectTrigger className="h-9 w-full sm:w-[130px]">
                    <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
            </Select>
        <DataTableViewOptions table={table} />
        {numSelected > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-9">
                <Trash2 className="mr-2 h-4 w-4" /> Delete ({numSelected})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {numSelected} order(s) and all associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected}>Delete Selected Orders</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Link href="/orders/new">
            <Button size="sm" className="h-9">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Order</span>
            </Button>
        </Link>
      </div>
    </div>
  )
}

function MobileOrderList({ table }: { table: Table<Order> }) {
    const router = useRouter();
    const orders = table.getRowModel().rows.map(row => row.original);
    const firstProduct = (order: Order) => (order.products && order.products.length > 0) ? order.products[0] : null;

    return (
        <div className="space-y-4">
            {orders.map(order => {
                return (
                 <Card key={order.id} className="hover:bg-muted/50 transition-colors">
                    <div onClick={() => router.push(`/orders/${order.id}`)} className="cursor-pointer">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <CategoryIcon order={order} />
                                    <div>
                                        <CardTitle className="text-base font-bold">
                                            {firstProduct(order)?.productName || 'Custom Order'}
                                        </CardTitle>
                                        <CardDescription>
                                            <CustomerLink order={order} />
                                        </CardDescription>
                                    </div>
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
                )
            })}
        </div>
    )
}

interface OrderTableProps {
    orders?: Order[];
    preferenceKey: 'orderSortPreference' | 'dashboardOrderSortPreference';
}

function OrderTableInternal({ orders: propOrders, preferenceKey }: OrderTableProps) {
  const { orders: contextOrders, loading } = useOrders();
  const router = useRouter();
  const { user: userProfile, loading: isUserLoading } = useUser();

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const defaultSort: SortingState = [{ id: 'creationDate', desc: true }];
  
  const savedSortPreference = userProfile?.[preferenceKey];
  const initialSort: SortingState = savedSortPreference 
      ? [{ id: savedSortPreference.field, desc: savedSortPreference.direction === 'desc' }]
      : defaultSort;
  
  const [sorting, setSorting] = React.useState<SortingState>(initialSort);

  React.useEffect(() => {
    if (!isUserLoading && savedSortPreference) {
      setSorting([{ id: savedSortPreference.field, desc: savedSortPreference.direction === 'desc' }]);
    }
  }, [savedSortPreference, isUserLoading]);

  const orders = propOrders ?? contextOrders;
  
  const table = useReactTable({
    data: orders,
    columns,
    state: {
        sorting,
        columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if ((loading && !propOrders) || isUserLoading) {
      return <div className="text-center p-8">Loading orders...</div>
  }
  
  if (orders.length === 0) {
    return (
        <div className="text-center p-8 text-muted-foreground">
            <p className="mb-4">No orders to display in this category.</p>
            <Link href="/orders/new">
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Order
                </Button>
            </Link>
        </div>
    )
  }

  return (
    <>
        <div className="hidden md:block">
            <DataTable table={table} columns={columns} data={orders} onRowClick={(row) => router.push(`/orders/${row.original.id}`)}>
                <OrderTableToolbar table={table} preferenceKey={preferenceKey} />
            </DataTable>
        </div>
         <div className="block md:hidden">
             <OrderTableToolbar table={table} preferenceKey={preferenceKey} />
            <div className="mt-4">
                 <MobileOrderList table={table} />
            </div>
             <div className="mt-4">
                <DataTablePagination table={table} />
            </div>
        </div>
    </>
  )
}

export function OrderTable(props: OrderTableProps) {
    return (
        <ProductProvider>
            <ProductSettingProvider>
                <ColorSettingProvider>
                    <OrderTableInternal {...props} />
                </ColorSettingProvider>
            </ProductSettingProvider>
        </ProductProvider>
    )
}
