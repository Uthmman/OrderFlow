
"use client";

import { useState, useMemo } from "react";
import { OrderTable } from "@/components/app/order-table";
import { Card, CardContent } from "@/components/ui/card";
import { useOrders } from "@/hooks/use-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order, OrderStatus } from "@/lib/types";
import { ProductSettingProvider } from "@/hooks/use-product-settings";

export type SortField = 'creationDate' | 'deadline';
export type SortDirection = 'asc' | 'desc';

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const [activeTab, setActiveTab] = useState("all");

  const getOrdersByStatus = (statuses: OrderStatus[]) => {
    return orders.filter(order => statuses.includes(order.status));
  };

  const activeStatuses: OrderStatus[] = ["In Progress", "Designing", "Design Ready", "Manufacturing", "Painting"];
  const designingStatuses: OrderStatus[] = ["Designing"];
  const designReadyStatuses: OrderStatus[] = ["Design Ready"];
  const manufacturingStatuses: OrderStatus[] = ["Manufacturing"];
  const paintingStatuses: OrderStatus[] = ["Painting"];
  const completedStatuses: OrderStatus[] = ["Completed", "Shipped"];
  const cancelledStatuses: OrderStatus[] = ["Cancelled"];

  const tabs = useMemo(() => [
    { value: "all", label: "All", orders: orders },
    { value: "active", label: "Active", orders: getOrdersByStatus(activeStatuses) },
    { value: "designing", label: "Designing", orders: getOrdersByStatus(designingStatuses) },
    { value: "designReady", label: "Design Ready", orders: getOrdersByStatus(designReadyStatuses) },
    { value: "manufacturing", label: "Manufacturing", orders: getOrdersByStatus(manufacturingStatuses) },
    { value: "painting", label: "Painting", orders: getOrdersByStatus(paintingStatuses) },
    { value: "completed", label: "Completed", orders: getOrdersByStatus(completedStatuses) },
    { value: "cancelled", label: "Cancelled", orders: getOrdersByStatus(cancelledStatuses) },
  ], [orders]);


  if (loading) {
    return <div>Loading orders...</div>;
  }

  const activeOrders = tabs.find(tab => tab.value === activeTab)?.orders ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage all {orders.length} orders in the system.
        </p>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="w-full sm:flex-1">
                    <TabsList className="flex-wrap h-auto">
                       {tabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label} ({tab.orders.length})
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
            </div>
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <TabsContent value={activeTab}>
                        <ProductSettingProvider>
                            <OrderTable orders={activeOrders} preferenceKey="orderSortPreference" />
                        </ProductSettingProvider>
                    </TabsContent>
                </CardContent>
            </Card>
        </Tabs>
    </div>
  );
}
