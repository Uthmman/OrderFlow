
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
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductSettingProvider } from "@/hooks/use-product-settings";

export type SortField = 'creationDate' | 'deadline';
export type SortDirection = 'asc' | 'desc';

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const [activeTab, setActiveTab] = useState("all");

  const getOrdersByStatus = (statuses: OrderStatus[]) => {
    return orders.filter(order => statuses.includes(order.status));
  };

  const activeStatuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting"];
  const designingStatuses: OrderStatus[] = ["Designing"];
  const designReadyStatuses: OrderStatus[] = ["Design Ready"];
  const paintingStatuses: OrderStatus[] = ["Painting"];
  const manufacturingStatuses: OrderStatus[] = ["Manufacturing"];
  const completedStatuses: OrderStatus[] = ["Completed", "Shipped"];
  const cancelledStatuses: OrderStatus[] = ["Cancelled"];

  const ordersByTab: Record<string, Order[]> = useMemo(() => ({
    all: orders,
    active: getOrdersByStatus(activeStatuses),
    designing: getOrdersByStatus(designingStatuses),
    designReady: getOrdersByStatus(designReadyStatuses),
    painting: getOrdersByStatus(paintingStatuses),
    manufacturing: getOrdersByStatus(manufacturingStatuses),
    completed: getOrdersByStatus(completedStatuses),
    cancelled: getOrdersByStatus(cancelledStatuses),
  }), [orders]);


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

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="w-full sm:flex-1">
                    <TabsList className="flex-wrap h-auto">
                        <TabsTrigger value="all">All ({ordersByTab.all.length})</TabsTrigger>
                        <TabsTrigger value="active">Active ({ordersByTab.active.length})</TabsTrigger>
                        <TabsTrigger value="designing">Designing ({ordersByTab.designing.length})</TabsTrigger>
                        <TabsTrigger value="designReady">Design Ready ({ordersByTab.designReady.length})</TabsTrigger>
                        <TabsTrigger value="manufacturing">Manufacturing ({ordersByTab.manufacturing.length})</TabsTrigger>
                        <TabsTrigger value="painting">Painting ({ordersByTab.painting.length})</TabsTrigger>
                        <TabsTrigger value="completed">Completed ({ordersByTab.completed.length})</TabsTrigger>
                        <TabsTrigger value="cancelled">Cancelled ({ordersByTab.cancelled.length})</TabsTrigger>
                    </TabsList>
                </div>
            </div>
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <TabsContent value="all" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.all} />
                        </ProductSettingProvider>
                    </TabsContent>
                     <TabsContent value="active" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.active} />
                        </ProductSettingProvider>
                    </TabsContent>
                     <TabsContent value="designing" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.designing} />
                        </ProductSettingProvider>
                    </TabsContent>
                     <TabsContent value="designReady" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.designReady} />
                        </ProductSettingProvider>
                    </TabsContent>
                     <TabsContent value="manufacturing" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.manufacturing} />
                        </ProductSettingProvider>
                    </TabsContent>
                     <TabsContent value="painting" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.painting} />
                        </ProductSettingProvider>
                    </TabsContent>
                     <TabsContent value="completed" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.completed} />
                        </ProductSettingProvider>
                    </TabsContent>
                     <TabsContent value="cancelled" forceMount>
                        <ProductSettingProvider>
                            <OrderTable orders={ordersByTab.cancelled} />
                        </ProductSettingProvider>
                    </TabsContent>
                </CardContent>
            </Card>
        </Tabs>
    </div>
  );
}
