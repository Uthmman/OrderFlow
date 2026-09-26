
"use client"

import { useState, useMemo, useTransition } from "react"
import { OrderTable } from "@/components/app/order-table"
import { Card, CardContent } from "@/components/ui/card"
import { useOrders } from "@/hooks/use-orders"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderStatus } from "@/lib/types"
import { useUser } from "@/hooks/use-user"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import { DateRange } from "react-day-picker"
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const { user: userProfile, loading: userLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("active");
  const [isPending, startTransition] = useTransition();

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

  const handleTabChange = (value: string) => {
    startTransition(() => {
      setActiveTab(value);
    });
  };

  // Filter orders by visibility rules:
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
    { value: "active", label: "Active", statuses: ["Designing", "In Progress", "Design Ready", "Manufacturing", "Painting"] },
    { value: "designing", label: "Designing", statuses: ["Designing"] },
    { value: "in-progress", label: "In Progress", statuses: ["In Progress"] },
    { value: "ready", label: "Design Ready", statuses: ["Design Ready"] },
    { value: "production", label: "Production", statuses: ["Manufacturing", "Painting"] },
    { value: "drafts", label: "Drafts", statuses: ["Pending"] },
    { value: "completed", label: "Completed", statuses: ["Completed"] },
    { value: "shipped", label: "Shipped", statuses: ["Shipped"] },
    { value: "cancelled", label: "Cancelled", statuses: ["Cancelled"] },
  ].map(t => ({
      ...t,
      orders: getOrdersByStatus(t.statuses as OrderStatus[])
  })), [getVisibleOrders, searchTerm, dateRange]);

  if (loading || userLoading) {
    return <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest opacity-40">Loading workspace...</p>
    </div>;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Orders</h1>
            <p className="text-muted-foreground text-sm">Manage project flow and technical readiness.</p>
        </div>
        <Link href="/orders/new" className="w-full sm:w-auto">
            <Button className="h-10 w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Order
            </Button>
        </Link>
      </div>
      
       <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20 p-4 rounded-xl border">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by customer, product, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 w-full bg-background"
                />
            </div>
            <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
       </div>

       <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="w-full overflow-x-auto no-scrollbar">
                <TabsList className="flex h-auto p-1 bg-muted/30 border w-fit min-w-full sm:min-w-0">
                   {tabs.map(tab => (
                        <TabsTrigger 
                            key={tab.value} 
                            value={tab.value} 
                            className="whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                            {tab.label} <span className="ml-1.5 opacity-50">{tab.orders.length}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
            
            <div className={cn("mt-6 transition-opacity duration-200", isPending ? "opacity-40" : "opacity-100")}>
                {tabs.map(tab => (
                    <TabsContent key={tab.value} value={tab.value} className="mt-0 outline-none">
                        {activeTab === tab.value && (
                            <OrderTable orders={tab.orders} preferenceKey="orderSortPreference" />
                        )}
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    </div>
  );
}
