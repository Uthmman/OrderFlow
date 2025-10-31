

"use client";

import { useState, useMemo } from "react";
import { useReactTable } from "@tanstack/react-table";
import { OrderTable, columns } from "@/components/app/order-table";
import { Card, CardContent } from "@/components/ui/card";
import { useOrders } from "@/hooks/use-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order, OrderStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SortField = 'creationDate' | 'deadline';
type SortDirection = 'asc' | 'desc';

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>('creationDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    if (filter) {
        const lowercasedFilter = filter.toLowerCase();
        filtered = orders.filter(order => 
            order.customerName.toLowerCase().includes(lowercasedFilter) ||
            order.id.toLowerCase().includes(lowercasedFilter)
        );
    }
    
    return [...filtered].sort((a, b) => {
        const dateA = a[sortField]?.seconds ? new Date(a[sortField].seconds * 1000).getTime() : new Date(a[sortField]).getTime();
        const dateB = b[sortField]?.seconds ? new Date(b[sortField].seconds * 1000).getTime() : new Date(b[sortField]).getTime();

        if (sortDirection === 'asc') {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });

  }, [orders, filter, sortField, sortDirection]);

  const getOrdersByStatus = (statuses: OrderStatus[]) => {
    return filteredAndSortedOrders.filter(order => statuses.includes(order.status));
  };

  const activeStatuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing"];
  const designingStatuses: OrderStatus[] = ["Designing"];
  const designReadyStatuses: OrderStatus[] = ["Design Ready"];
  const manufacturingStatuses: OrderStatus[] = ["Manufacturing"];
  const completedStatuses: OrderStatus[] = ["Completed", "Shipped"];
  const cancelledStatuses: OrderStatus[] = ["Cancelled"];

  const allOrders = filteredAndSortedOrders;
  const activeOrders = getOrdersByStatus(activeStatuses);
  const designingOrders = getOrdersByStatus(designingStatuses);
  const designReadyOrders = getOrdersByStatus(designReadyStatuses);
  const manufacturingOrders = getOrdersByStatus(manufacturingStatuses);
  const completedOrders = getOrdersByStatus(completedStatuses);
  const cancelledOrders = getOrdersByStatus(cancelledStatuses);

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage all {orders.length} orders in the system.
        </p>
      </div>

       <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="w-full sm:flex-1">
                    <TabsList className="flex-wrap h-auto">
                        <TabsTrigger value="all">All ({allOrders.length})</TabsTrigger>
                        <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
                        <TabsTrigger value="designing">Designing ({designingOrders.length})</TabsTrigger>
                        <TabsTrigger value="designReady">Design Ready ({designReadyOrders.length})</TabsTrigger>
                        <TabsTrigger value="manufacturing">Manufacturing ({manufacturingOrders.length})</TabsTrigger>
                        <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
                        <TabsTrigger value="cancelled">Cancelled ({cancelledOrders.length})</TabsTrigger>
                    </TabsList>
                </div>
                 <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <Input
                        placeholder="Filter orders..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-9 w-full sm:w-[150px] lg:w-[200px]"
                    />
                    <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                        <SelectTrigger className="h-9 w-full sm:w-[150px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="creationDate">Order Date</SelectItem>
                            <SelectItem value="deadline">Deadline</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as SortDirection)}>
                        <SelectTrigger className="h-9 w-full sm:w-[130px]">
                            <SelectValue placeholder="Order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Descending</SelectItem>
                            <SelectItem value="asc">Ascending</SelectItem>
                        </SelectContent>
                    </Select>
                    <Link href="/orders/new" className="w-full sm:w-auto">
                        <Button size="sm" className="h-9 w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span className="sm:inline">New Order</span>
                        </Button>
                    </Link>
                </div>
            </div>
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <TabsContent value="all">
                        <OrderTable orders={allOrders} />
                    </TabsContent>
                    <TabsContent value="active">
                        <OrderTable orders={activeOrders} />
                    </TabsContent>
                    <TabsContent value="designing">
                        <OrderTable orders={designingOrders} />
                    </TabsContent>
                     <TabsContent value="designReady">
                        <OrderTable orders={designReadyOrders} />
                    </TabsContent>
                    <TabsContent value="manufacturing">
                        <OrderTable orders={manufacturingOrders} />
                    </TabsContent>
                    <TabsContent value="completed">
                        <OrderTable orders={completedOrders} />
                    </TabsContent>
                    <TabsContent value="cancelled">
                        <OrderTable orders={cancelledOrders} />
                    </TabsContent>
                </CardContent>
            </Card>
        </Tabs>
    </div>
  );
}



