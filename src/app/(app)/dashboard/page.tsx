
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderTable } from "@/components/app/order-table"
import { TrendingUp, TrendingDown, ArrowRight, Loader2, Activity, Layers, Target, CheckCircle2, Clock } from "lucide-react"
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function Dashboard() {
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();
  const { user, role, loading: userLoading } = useUser();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const canViewFinancials = role === 'Admin' || role === 'Sales';

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
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 px-1">
        <div className="space-y-1">
            <h1 className="text-4xl font-bold font-headline tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-sm text-muted-foreground font-medium">Workshop operations at a glance</p>
        </div>
        <div className="flex items-center gap-3">
            <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
            <Button size="sm" asChild className="rounded-full px-6 shadow-md shadow-primary/20">
                <Link href="/orders/new"><Activity className="mr-2 h-4 w-4" /> New Order</Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className={cn("border-none shadow-xl bg-white/60 backdrop-blur-md ring-1 ring-slate-200/50", !canViewFinancials ? "lg:col-span-3" : "lg:col-span-2")}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" /> Order Workspace
                    </CardTitle>
                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-70">Core Operational Metrics</CardDescription>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +10.5%
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-10">
            <div className="flex flex-wrap items-end gap-x-16 gap-y-6">
                <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Total Lifecycle</span>
                    <div className="text-5xl font-black tracking-tighter text-slate-900">{stats.totalOrders.toLocaleString()}</div>
                </div>
                
                <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-primary">In Flow (Active)</span>
                    <div className="text-5xl font-black tracking-tighter text-primary">{stats.active.toLocaleString()}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatusStat label="Designing" count={stats.designing} color="bg-orange-400" />
                <StatusStat label="In Progress" count={stats.inProgress} color="bg-blue-300" />
                <StatusStat label="Design Ready" count={stats.designReady} color="bg-purple-500" />
                <StatusStat label="Production" count={stats.onProduction} color="bg-emerald-500" />
                <StatusStat label="Delivered" count={stats.delivered} color="bg-blue-600" />
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <span>Flow Distribution</span>
                    <span>{stats.totalOrders} Units</span>
                </div>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200/50">
                    <div style={{ width: `${stats.totalOrders > 0 ? (stats.active / stats.totalOrders) * 100 : 0}%` }} className="bg-primary/80" />
                    <div style={{ width: `${stats.totalOrders > 0 ? (stats.designing / stats.totalOrders) * 100 : 0}%` }} className="bg-orange-400" />
                    <div style={{ width: `${stats.totalOrders > 0 ? (stats.inProgress / stats.totalOrders) * 100 : 0}%` }} className="bg-blue-300" />
                    <div style={{ width: `${stats.totalOrders > 0 ? (stats.designReady / stats.totalOrders) * 100 : 0}%` }} className="bg-purple-500" />
                    <div style={{ width: `${stats.totalOrders > 0 ? (stats.onProduction / stats.totalOrders) * 100 : 0}%` }} className="bg-emerald-500" />
                    <div style={{ width: `${stats.totalOrders > 0 ? (stats.delivered / stats.totalOrders) * 100 : 0}%` }} className="bg-blue-600" />
                </div>
            </div>
          </CardContent>
        </Card>

        {canViewFinancials && (
          <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md ring-1 ring-slate-200/50 overflow-hidden">
            <CardHeader className="pb-0">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-accent" /> Revenue
                </CardTitle>
                <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-70">Payment Distribution</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="relative h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={revenueData}
                              cx="50%"
                              cy="85%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius={70}
                              outerRadius={95}
                              paddingAngle={6}
                              dataKey="value"
                              stroke="none"
                          >
                              {revenueData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} className="outline-none" />
                              ))}
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Projected Total</p>
                      <p className="text-3xl font-black tracking-tight text-slate-900">{formatCurrency(stats.revenue)}</p>
                      <div className="flex items-center text-[10px] font-bold text-rose-500 mt-2 bg-rose-50 px-2 py-0.5 rounded-full">
                          <TrendingDown className="h-2.5 w-2.5 mr-1" />
                          -7.2%
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 px-2">
                  <div className="bg-background/40 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Prepaid</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{formatCurrency(stats.prepaid)}</span>
                  </div>
                  <div className="bg-background/40 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Balance</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{formatCurrency(Math.max(0, stats.revenue - stats.prepaid))}</span>
                  </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-bold font-headline tracking-tight">Recent Activity</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary/5">
                <Link href="/orders">Manage all <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
        </div>
        <Card className="border-none shadow-xl bg-white/40 backdrop-blur-sm ring-1 ring-slate-200/50 overflow-hidden rounded-3xl">
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
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/40 border border-slate-100/50 shadow-sm hover:shadow-md hover:bg-white/80 transition-all group cursor-default">
            <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-125", color)} />
                <span className="text-[9px] uppercase tracking-[0.1em] font-black text-muted-foreground/70">{label}</span>
            </div>
            <span className="text-2xl font-black leading-none tracking-tight text-slate-800">{count}</span>
        </div>
    )
}
