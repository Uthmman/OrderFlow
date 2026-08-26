
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderTable } from "@/components/app/order-table"
import { TrendingUp, TrendingDown, ArrowRight, Loader2, Activity } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useMemo, useState } from "react"
import { formatCurrency, cn } from "@/lib/utils"
import { useCustomers } from "@/hooks/use-customers"
import { useUser } from "@/hooks/use-user"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { isWithinInterval, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();
  const { user, role, loading: userLoading } = useUser();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const isDesigner = role === 'Designer';

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

  // Filter orders by date range AND ensure we don't show Pending (Drafts) in global dashboard stats
  const dashboardOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'Pending');
  }, [orders]);

  const filteredOrdersByDate = useMemo(() => {
    if (!dateRange?.from) return dashboardOrders;
    return dashboardOrders.filter(order => {
        const creationDate = parseOrderDate(order.creationDate);
        if (!creationDate) return false;
        const start = startOfDay(dateRange.from!);
        const end = endOfDay(dateRange.to || dateRange.from!);
        return isWithinInterval(creationDate, { start, end });
    });
  }, [dashboardOrders, dateRange]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrdersByDate.length;
    // Active excludes Completed, Shipped, Cancelled AND Pending(Drafts)
    const active = filteredOrdersByDate.filter(o => !['Completed', 'Shipped', 'Cancelled', 'Pending'].includes(o.status)).length;
    const designing = filteredOrdersByDate.filter(o => o.status === 'Designing').length;
    const inProgress = filteredOrdersByDate.filter(o => o.status === 'In Progress').length;
    const designReady = filteredOrdersByDate.filter(o => o.status === 'Design Ready').length;
    const onProduction = filteredOrdersByDate.filter(o => ['Manufacturing', 'Painting'].includes(o.status)).length;
    const delivered = filteredOrdersByDate.filter(o => o.status === 'Completed' || o.status === 'Shipped').length;
    const revenue = filteredOrdersByDate.reduce((sum, order) => sum + (order.incomeAmount || 0), 0);
    const prepaid = filteredOrdersByDate.reduce((sum, order) => sum + (order.prepaidAmount || 0), 0);
    
    return { totalOrders, active, designing, inProgress, designReady, onProduction, delivered, revenue, prepaid };
  }, [filteredOrdersByDate]);

  const revenueData = [
    { name: 'Prepaid', value: stats.prepaid, color: 'hsl(var(--primary))' },
    { name: 'Balance', value: Math.max(0, stats.revenue - stats.prepaid), color: 'hsl(var(--accent))' },
  ];

  if (ordersLoading || customersLoading || userLoading) {
    return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-slate-900">Overview</h1>
            <p className="text-muted-foreground">Detailed business operations analytics.</p>
        </div>
        <div className="flex items-center gap-2">
            <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
            <Button size="sm" asChild>
                <Link href="/orders/new">Add new</Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className={cn("border-none shadow-sm bg-white/50 backdrop-blur-sm", isDesigner ? "lg:col-span-3" : "lg:col-span-2")}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-lg font-bold">Order Overview</CardTitle>
                <CardDescription>Order statistics for the selected period</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-end gap-4">
                <div className="text-4xl font-bold tracking-tighter">{stats.totalOrders.toLocaleString()}</div>
                <div className="flex items-center text-xs font-bold text-green-500 mb-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +10.5%
                    <span className="text-muted-foreground font-normal ml-1">vs last month</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <StatusStat label="Active Order" count={stats.active} color="bg-primary" />
                <StatusStat label="Designing" count={stats.designing} color="bg-orange-400" />
                <StatusStat label="In Progress" count={stats.inProgress} color="bg-blue-300" />
                <StatusStat label="Design Ready" count={stats.designReady} color="bg-purple-400" />
                <StatusStat label="On Production" count={stats.onProduction} color="bg-green-400" />
                <StatusStat label="Delivered" count={stats.delivered} color="bg-blue-400" />
            </div>

            <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                <div style={{ width: `${stats.totalOrders > 0 ? (stats.active / stats.totalOrders) * 100 : 0}%` }} className="bg-primary" />
                <div style={{ width: `${stats.totalOrders > 0 ? (stats.designing / stats.totalOrders) * 100 : 0}%` }} className="bg-orange-400" />
                <div style={{ width: `${stats.totalOrders > 0 ? (stats.inProgress / stats.totalOrders) * 100 : 0}%` }} className="bg-blue-300" />
                <div style={{ width: `${stats.totalOrders > 0 ? (stats.designReady / stats.totalOrders) * 100 : 0}%` }} className="bg-purple-400" />
                <div style={{ width: `${stats.totalOrders > 0 ? (stats.onProduction / stats.totalOrders) * 100 : 0}%` }} className="bg-green-400" />
                <div style={{ width: `${stats.totalOrders > 0 ? (stats.delivered / stats.totalOrders) * 100 : 0}%` }} className="bg-blue-400" />
            </div>
          </CardContent>
        </Card>

        {!isDesigner && (
          <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle className="text-lg font-bold">Revenue</CardTitle>
                  <CardDescription>Income distribution</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={revenueData}
                              cx="50%"
                              cy="100%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {revenueData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
                      <div className="flex items-center text-[10px] font-bold text-red-500 mt-1">
                          <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                          -7.2%
                      </div>
                  </div>
              </div>
              <div className="flex justify-around mt-4">
                  <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="text-xs">
                          <span className="text-muted-foreground">Prepaid: </span>
                          <span className="font-bold">{formatCurrency(stats.prepaid)}</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                      <div className="text-xs">
                          <span className="text-muted-foreground">Balance: </span>
                          <span className="font-bold">{formatCurrency(Math.max(0, stats.revenue - stats.prepaid))}</span>
                      </div>
                  </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold font-headline">Recent Orders</h2>
            <Button variant="ghost" size="sm" asChild>
                <Link href="/orders">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </div>
        <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
                <OrderTable 
                    orders={filteredOrdersByDate.slice(0, 10)} 
                    preferenceKey="dashboardOrderSortPreference" 
                    hidePagination={true} 
                />
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusStat({ label, count, color }: { label: string, count: number, color: string }) {
    return (
        <div className="flex flex-col border-l-2 pl-3 gap-0.5">
            <div className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", color)} />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
            </div>
            <span className="text-lg font-bold leading-tight">{count}</span>
        </div>
    )
}
