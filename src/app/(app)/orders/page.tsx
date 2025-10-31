
"use client";

import { useState, useMemo } from "react";
import { OrderTable } from "@/components/app/order-table";
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
import { ListFilter } from "lucide-react";

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
        const dateA = a[sortField]?.seconds ? a[sortField].seconds * 1000 : new Date(a[sortField]).getTime();
        const dateB = b[sortField]?.seconds ? b[sortField].seconds * 1000 : new Date(b[sortField]).getTime();

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

  const activeStatuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Manufacturing"];
  const completedStatuses: OrderStatus[] = ["Completed", "Shipped"];
  const cancelledStatuses: OrderStatus[] = ["Cancelled"];

  const allOrders = filteredAndSortedOrders;
  const activeOrders = getOrdersByStatus(activeStatuses);
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
            <div className="flex items-center gap-4 flex-wrap">
                <TabsList>
                    <TabsTrigger value="all">All ({allOrders.length})</TabsTrigger>
                    <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled ({cancelledOrders.length})</TabsTrigger>
                </TabsList>
                 <div className="flex items-center gap-2 ml-auto">
                    <Input
                        placeholder="Filter orders..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-9 w-full sm:w-[200px]"
                    />
                    <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                        <SelectTrigger className="h-9 w-[150px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="creationDate">Order Date</SelectItem>
                            <SelectItem value="deadline">Deadline</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as SortDirection)}>
                        <SelectTrigger className="h-9 w-[130px]">
                            <SelectValue placeholder="Order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Descending</SelectItem>
                            <SelectItem value="asc">Ascending</SelectItem>
                        </SelectContent>
                    </Select>
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
