
"use client"

import * as React from "react"
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/react-table"
import { MoreHorizontal, AlertTriangle, Trash2, ChevronDown, Activity } from "lucide-react"
import { differenceInDays } from 'date-fns'

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
import { Order, OrderStatus, AppUser } from "@/lib/types"
import { formatCurrency, formatOrderUniqueName, formatTimestamp } from "@/lib/utils"
import { DataTable } from "./data-table/data-table"
import { DataTableColumnHeader } from "./data-table/data-table-column-header"
import { DataTableViewOptions } from "./data-table/data-table-view-options"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
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
import { useUser, useUsers } from "@/hooks/use-user"
import { cn } from "@/lib/utils"
import { useProductSettings } from "@/hooks/use-product-settings"
import Image from "next/image"
import { DataTablePagination } from "./data-table/data-table-pagination"
import { DynamicIcon } from "../ui/dynamic-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
    if (!deadline) return <span className="text-muted-foreground">-</span>;
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
        <div className="flex flex-col">
            <span className="text-xs font-semibold">{formatTimestamp(deadline)}</span>
            <span className={cn("text-[10px] uppercase font-bold tracking-tight", colorClass)}>{text}</span>
        </div>
    )
}

function DesignerAvatar({ userId, users }: { userId: string, users: AppUser[] }) {
    const profile = users.find(u => u.id === userId);
    if (!profile) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Avatar className="h-7 w-7 ring-2 ring-background shrink-0 hover:z-10 transition-all">
                        <AvatarImage src={profile.avatarUrl} />
                        <AvatarFallback className="text-[9px] font-bold">{profile.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">{profile.name}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function StatusCell({ order }: { order: Order }) {
    const { users } = useUsers();
    const status = order.status;

    return (
        <div className="flex items-center gap-2">
            {status === 'Pending' ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm px-2 py-0.5 text-[10px] uppercase font-bold">
                    Draft
                </Badge>
            ) : (
                <Badge variant={statusVariantMap[status] || 'outline'} className="rounded-sm px-2 py-0.5 text-[10px] uppercase font-bold">
                    {status}
                </Badge>
            )}
            {order.assignedTo && order.assignedTo.length > 0 && (
                <div className="flex -space-x-2 ml-1">
                    {order.assignedTo.map(uid => (
                        <DesignerAvatar key={uid} userId={uid} users={users} />
                    ))}
                </div>
            )}
        </div>
    );
}

function OrderActions({ order }: { order: Order }) {
    const router = useRouter();
    const { deleteOrder, updateOrder } = useOrders();
    const { toast } = useToast();
    const { user, role } = useUser();
    const [dialogAction, setDialogAction] = React.useState<'cancel' | 'delete' | null>(null);
    const canEdit = role === 'Admin' || (role === 'Sales' && order.ownerId === user?.id);

    const handleAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        const orderName = order.uniqueName || formatOrderUniqueName(order.customerName, order.products, order.id);
        if (dialogAction === 'cancel') {
            updateOrder({ id: order.id, status: "Cancelled" });
            toast({ title: "Order Cancelled", description: `${orderName} has been cancelled.` });
        } else if (dialogAction === 'delete') {
            const allAttachments = (order.products || []).flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]);
            deleteOrder(order.id, allAttachments);
            toast({ title: "Order Deleted", description: `${orderName} has been permanently deleted.` });
        }
    };

    return (
        <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>View Details</DropdownMenuItem>
                {canEdit && <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}/edit`)}>Edit Order</DropdownMenuItem>}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateOrder({ id: order.id, isUrgent: !order.isUrgent }); }}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>{order.isUrgent ? "Remove Urgency" : "Make Urgent"}</span>
                </DropdownMenuItem>
                {canEdit && (
                    <>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                             <DropdownMenuItem className="text-destructive" onSelect={() => setDialogAction('cancel')}>Cancel Order</DropdownMenuItem>
                        </AlertDialogTrigger>
                         <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={() => setDialogAction('delete')}>Delete Order</DropdownMenuItem>
                        </AlertDialogTrigger>
                    </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
             <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {dialogAction === 'cancel' ? "This will cancel the order." : "This will permanently delete the order."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAction} className={cn(dialogAction === 'delete' && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
                        {dialogAction === 'cancel' ? 'Cancel Order' : 'Delete Order'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

const CategoryIcon = ({ order }: { order: Order }) => {
    const { productSettings } = useProductSettings();
    if (order.mainImageUrl) {
        return (
            <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 border bg-muted shadow-sm">
                <Image src={order.mainImageUrl} alt="Order" fill className="object-cover" />
            </div>
        )
    }
    const firstProduct = (order.products && order.products.length > 0) ? order.products[0] : null;
    const category = productSettings?.productCategories.find(c => c.name === firstProduct?.category);
    const iconName = category?.icon || 'Box';
    return (
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border shadow-sm">
            <DynamicIcon icon={iconName} className="h-5 w-5 text-muted-foreground" />
        </div>
    );
}

export const columns: ColumnDef<Order>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order ID" />,
    cell: ({ row }) => {
        const order = row.original;
        const displayName = order.uniqueName || formatOrderUniqueName(order.customerName, order.products, order.id);
        return (
            <div className="flex items-center gap-3">
                 <CategoryIcon order={order} />
                 <div className="flex flex-col min-w-0">
                    <Link href={`/orders/${order.id}`} className="font-bold text-sm text-primary hover:underline truncate">
                        {displayName}
                    </Link>
                    <span className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(-6).toUpperCase()}</span>
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
        const { role } = useUser();
        const canViewCustomer = role === 'Admin' || role === 'Sales';
        return (
            <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[8px] font-bold">
                        {order.customerName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                </Avatar>
                {canViewCustomer ? (
                    <Link className="text-sm font-medium hover:underline" href={`/customers/${order.customerId}`} onClick={(e) => e.stopPropagation()}>
                        {order.customerName}
                    </Link>
                ) : (
                    <span className="text-sm font-medium">{order.customerName}</span>
                )}
            </div>
        )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell order={row.original} />,
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Deadline" />,
    cell: ({ row }) => <DeadlineDisplay deadline={row.getValue("deadline")} />,
  },
  {
    accessorKey: "creationDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ordered" />,
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatTimestamp(row.getValue("creationDate"))}</span>,
  },
  {
    accessorKey: "incomeAmount",
    header: ({ column }) => <div className="text-right"><DataTableColumnHeader column={column} title="Price" /></div>,
    cell: ({ row }) => <div className="text-right font-bold text-sm">{formatCurrency(parseFloat(row.getValue("incomeAmount")))}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <div className="flex justify-end"><OrderActions order={row.original} /></div>,
  },
]

function OrderTableToolbar({ table }: { table: Table<Order> }) {
  const { deleteMultipleOrders, updateMultipleOrdersStatus } = useOrders();
  const numSelected = table.getFilteredSelectedRowModel().rows.length;
  const statuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"];

  return (
    <div className="flex items-center justify-between p-4 bg-muted/20 border-b">
       <div className="flex items-center gap-2 flex-wrap">
          {numSelected > 0 ? (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 shadow-sm font-bold text-xs uppercase">
                            Set Status ({numSelected}) <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {statuses.map(s => (
                            <DropdownMenuItem key={s} onClick={() => {
                                updateMultipleOrdersStatus(table.getFilteredSelectedRowModel().rows.map(r => r.original), s);
                                table.resetRowSelection();
                            }}>
                                {s === 'Pending' ? 'Draft' : s}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8 shadow-sm font-bold text-xs uppercase">
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Selected
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {numSelected} Orders?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action is permanent and will remove all selected orders and their associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                deleteMultipleOrders(table.getFilteredSelectedRowModel().rows.map(r => r.original));
                                table.resetRowSelection();
                            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Permanently
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </div>
          ) : (
             <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-muted-foreground uppercase tracking-wider px-3" disabled>
                     Manage
                 </Button>
                 <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-muted-foreground uppercase tracking-wider px-3" disabled>
                     Export
                 </Button>
             </div>
          )}
       </div>
       <DataTableViewOptions table={table} />
    </div>
  );
}

function MobileOrderList({ table }: { table: Table<Order> }) {
    const router = useRouter();
    const orders = table.getRowModel().rows.map(row => row.original);
    const { role } = useUser();
    return (
        <div className="space-y-3 p-2">
            {orders.map(order => (
                 <Card key={order.id} className="hover:bg-muted/50 transition-colors border-muted-foreground/10 shadow-sm overflow-hidden" onClick={() => router.push(`/orders/${order.id}`)}>
                    <div className="p-3 flex gap-3">
                        <CategoryIcon order={order} />
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-start">
                                <h3 className="text-sm font-bold truncate pr-6">{order.uniqueName}</h3>
                                <div onClick={e => e.stopPropagation()} className="shrink-0 -mt-1"><OrderActions order={order} /></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <StatusCell order={order} />
                                <DeadlineDisplay deadline={order.deadline} />
                            </div>
                             {role === 'Admin' && <div className="text-right text-xs font-bold text-primary">{formatCurrency(order.incomeAmount)}</div>}
                        </div>
                    </div>
                 </Card>
            ))}
        </div>
    );
}

export function OrderTable({ orders: propOrders, preferenceKey, hidePagination = false }: { orders?: Order[], preferenceKey: string, hidePagination?: boolean }) {
  const router = useRouter();
  const { orders: contextOrders, loading } = useOrders();
  const { user: userProfile, loading: isUserLoading } = useUser();
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ creationDate: false });
  const [mounted, setMounted] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initialSorting = React.useMemo((): SortingState => {
    if (userProfile?.[preferenceKey as any]) {
      const { field, direction } = userProfile[preferenceKey as any] as any;
      return [{ id: field, desc: direction === 'desc' }];
    }
    return [{ id: 'deadline', desc: false }];
  }, [userProfile, preferenceKey]);

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  
  React.useEffect(() => {
    if (!isUserLoading && userProfile) setSorting(initialSorting);
  }, [isUserLoading, userProfile, initialSorting]);

  const orders = propOrders ?? contextOrders;
  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (!mounted || isUserLoading || (loading && !propOrders)) {
      return <div className="text-center p-8"><Activity className="animate-spin h-6 w-6 mx-auto opacity-20" /></div>;
  }

  if (orders.length === 0) return <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-lg m-4"><p>No results found matching your criteria.</p></div>;

  return (
    <>
        <div className="hidden md:block">
            <OrderTableToolbar table={table} />
            <DataTable 
              table={table} 
              columns={columns} 
              data={orders} 
              onRowClick={(row) => router.push(`/orders/${row.original.id}`)} 
              hidePagination={hidePagination} 
            />
        </div>
        <div className="block md:hidden">
             <MobileOrderList table={table} />
             {!hidePagination && <div className="p-4"><DataTablePagination table={table} /></div>}
        </div>
    </>
  );
}
