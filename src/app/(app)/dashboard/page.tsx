
"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderTable } from "@/components/app/order-table"
import { DollarSign, Package, Users, Activity, PackageCheck, Briefcase, ArrowRight } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useMemo, useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { useCustomers } from "@/hooks/use-customers"
import { useUser } from "@/hooks/use-user"
import { ProductProvider } from "@/hooks/use-products"
import { CustomerProvider } from "@/hooks/use-customers"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { addDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns"
import { Order, OrderStatus } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();
  const { user, role, loading: userLoading } = useUser();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
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

  const filteredOrdersByDate = useMemo(() => {
    if (!dateRange?.from) {
      return orders;
    }
    return orders.filter(order => {
        const creationDate = parseOrderDate(order.creationDate);
        if (!creationDate) return false;

        const start = startOfDay(dateRange.from!);
        const end = endOfDay(dateRange.to || dateRange.from!);
        
        return isWithinInterval(creationDate, { start, end });
    });
  }, [orders, dateRange]);

  const upcomingOrders = useMemo(() => {
    const activeStatuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting"];
    return orders
      .filter(order => activeStatuses.includes(order.status))
      .sort((a, b) => {
        const dateA = parseOrderDate(a.deadline)?.getTime() || 0;
        const dateB = parseOrderDate(b.deadline)?.getTime() || 0;
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [orders]);

  const ordersInProgress = useMemo(() => {
    return orders.filter(order => order.status === "In Progress");
  }, [orders]);


  const stats = useMemo(() => {
    // All stats that should be affected by the date range are calculated from `filteredOrdersByDate`
    const totalRevenueInPeriod = filteredOrdersByDate.reduce((sum, order) => sum + (order.incomeAmount || 0), 0);
    const totalOrdersInPeriod = filteredOrdersByDate.length;
    
    // Stats that are for all-time (not affected by date range)
    const ordersInProgressCount = orders.filter(o => o.status === "In Progress").length;
    const ordersInProduction = orders.filter(o => o.status === "Manufacturing" || o.status === "Painting").length;
    const urgentOrders = orders.filter(o => o.isUrgent && o.status !== "Completed" && o.status !== "Shipped" && o.status !== "Cancelled").length;
        
    return {
      totalRevenue: totalRevenueInPeriod,
      totalOrders: totalOrdersInPeriod,
      ordersInProgress: ordersInProgressCount,
      ordersInProduction,
      urgentOrders,
    }
  }, [orders, filteredOrdersByDate]);

  if (ordersLoading || customersLoading || userLoading) {
    return <div>Loading...</div>;
  }

  const canViewSensitiveData = role === 'Admin';


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
            An overview of your business operations.
            </p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {canViewSensitiveData && (
            <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    Total Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">
                    Based on selected period
                    </p>
                </CardContent>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{customers.length}</div>
                <p className="text-xs text-muted-foreground">
                  All time customers
                </p>
              </CardContent>
            </Card>
            </>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalOrders}</div>
             <p className="text-xs text-muted-foreground">
                In selected period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.ordersInProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently active orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Production</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.ordersInProduction}</div>
             <p className="text-xs text-muted-foreground">
                Manufacturing or Painting
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.urgentOrders}</div>
            <p className="text-xs text-muted-foreground">
              Action required
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Upcoming Deadlines</CardTitle>
                <CardDescription>The next 5 orders with the nearest deadlines.</CardDescription>
            </CardHeader>
            <CardContent>
            <CustomerProvider>
                <ProductProvider>
                    <OrderTable orders={upcomingOrders} preferenceKey="dashboardOrderSortPreference" hidePagination={true} />
                </ProductProvider>
            </CustomerProvider>
            </CardContent>
            <CardFooter className="justify-end">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/orders">See All Orders <ArrowRight className="ml-2 h-4 w-4"/></Link>
                </Button>
            </CardFooter>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="font-headline">In Progress Orders</CardTitle>
                <CardDescription>All orders that are currently active and being worked on.</CardDescription>
            </CardHeader>
            <CardContent>
            <CustomerProvider>
                <ProductProvider>
                    <OrderTable orders={ordersInProgress} preferenceKey="dashboardOrderSortPreference" hidePagination={true} />
                </ProductProvider>
            </CustomerProvider>
            </CardContent>
             <CardFooter className="justify-end">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/orders?tab=inProgress">See More <ArrowRight className="ml-2 h-4 w-4"/></Link>
                </Button>
            </CardFooter>
        </Card>
      </div>

    </div>
  )
}
