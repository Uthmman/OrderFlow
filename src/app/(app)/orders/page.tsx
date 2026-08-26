
"use client"

import { useState, useMemo } from "react"
import { OrderTable } from "@/components/app/order-table"
import { Card, CardContent } from "@/components/ui/card"
import { useOrders } from "@/hooks/use-orders"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderStatus } from "@/lib/types"
import { useUser } from "@/hooks/use-user"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Search } from "lucide-react"
import Link from "next/link"
import { DateRange } from "react-day-picker"
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns"
import { DateRangePicker } from "@/components/ui/date-range-picker"

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const { user: userProfile, role, loading: userLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("inProgress");

  const parseOrderDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date && typeof date.seconds === 'number') {
      return new Date(date.seconds * 1000);
    }
    if (typeof date === 'string') {
      return parseISO(date);
    }
    return null;
  }

  // Helper to filter orders by visibility rules:
  // - Pending (Drafts) are ONLY visible to their ownerId
  const getVisibleOrders = useMemo(() => {
      if (!userProfile) return [];
      return orders.filter(order => {
          if (order.status === 'Pending') {
              return order.ownerId === userProfile.id;
          }
          return true; // Everyone with app access can see non-drafts
      });
  }, [orders, userProfile]);

  const getOrdersByStatus = (statuses: OrderStatus[]) => {
    return getVisibleOrders.filter(order => {
        const statusMatch = statuses.includes(order.status);
        const displayName = order.uniqueName || order.id;
        const searchMatch = (
            order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const tabs = useMemo(() => [
    { value: "inProgress", label: "In Progress", orders: getOrdersByStatus(["In Progress"]) },
    { value: "active", label: "Active", orders: getOrdersByStatus(["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting"]) },
    { value: "designing", label: "Designing", orders: getOrdersByStatus(["Designing"]) },
    { value: "designReady", label: "Design Ready", orders: getOrdersByStatus(["Design Ready"]) },
    { value: "inProduction", label: "In Production", orders: getOrdersByStatus(["Manufacturing", "Painting"]) },
    { value: "completed", label: "Completed", orders: getOrdersByStatus(["Completed"]) },
    { value: "shipped", label: "Shipped", orders: getOrdersByStatus(["Shipped"]) },
    { value: "cancelled", label: "Cancelled", orders: getOrdersByStatus(["Cancelled"]) },
  ], [getVisibleOrders, searchTerm, dateRange]);

  if (loading || userLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading orders...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Orders</h1>
      </div>
      
       <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex-1 flex flex-row gap-2 w-full items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by customer, name, or product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full"
                    />
                </div>
                <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} className="w-auto" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link href="/orders/new" className="flex-1 sm:flex-initial">
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
                            {activeTab === tab.value && <OrderTable orders={tab.orders} preferenceKey="orderSortPreference" />}
                        </TabsContent>
                    ))}
                </CardContent>
            </Card>
        </Tabs>
    </div>
  );
}
