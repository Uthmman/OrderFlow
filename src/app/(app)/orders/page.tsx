

"use client";

import { useState, useMemo, useEffect } from "react";
import { OrderTable } from "@/components/app/order-table";
import { Card, CardContent } from "@/components/ui/card";
import { useOrders } from "@/hooks/use-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order, OrderStatus } from "@/lib/types";
import { useUser } from "@/hooks/use-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export type SortField = 'creationDate' | 'deadline';
export type SortDirection = 'asc' | 'desc';

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const { user, role, loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const parseOrderDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    // Handle Firestore Timestamp object (both instance and plain object from serialization)
    if (date && typeof date.seconds === 'number') {
      return new Date(date.seconds * 1000);
    }
    if (typeof date === 'string') {
      return parseISO(date);
    }
    return null;
  }

  const getOrdersByStatus = (statuses: OrderStatus[]) => {
    return orders.filter(order => {
        const statusMatch = statuses.includes(order.status);
        
        const searchMatch = (
            order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.products && order.products[0] && order.products[0].productName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        let dateMatch = true;
        if (dateRange?.from) {
            const creationDate = parseOrderDate(order.creationDate);
            if (!creationDate) {
                dateMatch = false;
            } else {
                const start = startOfDay(dateRange.from);
                const end = endOfDay(dateRange.to || dateRange.from);
                dateMatch = isWithinInterval(creationDate, { start, end });
            }
        }

        return statusMatch && searchMatch && dateMatch;
    });
  };
  
  // Define status groups
  const inProgressStatuses: OrderStatus[] = ["In Progress"];
  const designingStatuses: OrderStatus[] = ["Designing"];
  const designReadyStatuses: OrderStatus[] = ["Design Ready"];
  const manufacturingStatuses: OrderStatus[] = ["Manufacturing"];
  const paintingStatuses: OrderStatus[] = ["Painting"];
  const inProductionStatuses: OrderStatus[] = ["Manufacturing", "Painting"];
  const shippedStatuses: OrderStatus[] = ["Shipped"];
  const completedStatuses: OrderStatus[] = ["Completed"];
  const cancelledStatuses: OrderStatus[] = ["Cancelled"];
  const activeStatuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting"];

  // Define tabs based on role
  const designerTabs = useMemo(() => [
    { value: "inProgress", label: "In Progress", orders: getOrdersByStatus(inProgressStatuses) },
    { value: "designing", label: "Designing", orders: getOrdersByStatus(designingStatuses) },
    { value: "designReady", label: "Design Ready", orders: getOrdersByStatus(designReadyStatuses) },
    { value: "inProduction", label: "In Production", orders: getOrdersByStatus(inProductionStatuses) },
    { value: "completed", label: "Completed", orders: getOrdersByStatus(completedStatuses) },
    { value: "all", label: "All", orders: getOrdersByStatus([...activeStatuses, ...completedStatuses, ...cancelledStatuses, "Pending"]) },
  ], [orders, searchTerm, dateRange]);

  const defaultTabs = useMemo(() => {
    const tabs = [
        { value: "inProgress", label: "In Progress", orders: getOrdersByStatus(inProgressStatuses) },
        { value: "active", label: "Active", orders: getOrdersByStatus(activeStatuses) },
        { value: "designing", label: "Designing", orders: getOrdersByStatus(designingStatuses) },
        { value: "designReady", label: "Design Ready", orders: getOrdersByStatus(designReadyStatuses) },
        { value: "manufacturing", label: "Manufacturing", orders: getOrdersByStatus(manufacturingStatuses) },
        { value: "painting", label: "Painting", orders: getOrdersByStatus(paintingStatuses) },
        { value: "completed", label: "Completed", orders: getOrdersByStatus(completedStatuses) },
    ];
    if (role === 'Admin') {
        tabs.push({ value: "shipped", label: "Shipped", orders: getOrdersByStatus(shippedStatuses) });
    }
    tabs.push({ value: "cancelled", label: "Cancelled", orders: getOrdersByStatus(cancelledStatuses) });
    tabs.push({ value: "all", label: "All", orders: getOrdersByStatus([...activeStatuses, ...completedStatuses, ...shippedStatuses, ...cancelledStatuses, "Pending"]) });
    return tabs;
  }, [orders, searchTerm, role, dateRange]);

  const tabs = role === 'Designer' ? designerTabs : defaultTabs;

  // Set initial active tab based on role, once the user is loaded.
  useEffect(() => {
    if (!userLoading) {
        if (role === 'Designer') {
            setActiveTab('inProgress');
        } else {
            setActiveTab('inProgress');
        }
    }
  }, [userLoading, role]);


  if (loading || userLoading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Orders</h1>
      </div>
      
       <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by customer, ID, or product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full sm:w-[300px] lg:w-[400px]"
                    />
                </div>
                <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
            </div>
            <div className="w-full sm:w-auto">
                <Link href="/orders/new">
                    <Button size="sm" className="h-9 w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Order
                    </Button>
                </Link>
            </div>
       </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full overflow-x-auto">
                <TabsList className="flex-wrap h-auto sm:h-10">
                   {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label} ({tab.orders.length})
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
            <Card className="mt-4">
                <CardContent className="pt-6">
                    {tabs.map(tab => (
                        <TabsContent key={tab.value} value={tab.value} forceMount={activeTab === tab.value}>
                           <OrderTable orders={tab.orders} preferenceKey="orderSortPreference" />
                        </TabsContent>
                    ))}
                </CardContent>
            </Card>
        </Tabs>
    </div>
  );
}
