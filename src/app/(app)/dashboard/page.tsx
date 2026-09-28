
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderTable } from "@/components/app/order-table"
import { TrendingUp, TrendingDown, ArrowRight, Loader2, Activity, Layers, Target, CheckCircle2, Clock, Wallet, BarChart3, TrendingUp as ProfitIcon, CreditCard, Banknote, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useMemo, useState } from "react"
import { formatCurrency, cn } from "@/lib/utils"
import { useCustomers } from "@/hooks/use-customers"
import { useUser } from "@/hooks/use-user"
import { useExpenses } from "@/hooks/use-expenses"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { isWithinInterval, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { user, role, loading: userLoading } = useUser();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const canViewFinancials = role === 'Admin' || role === 'Sales';

  const parseDate = (date: any): Date | null => {
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
        const creationDate = parseDate(order.creationDate);
        if (!creationDate) return false;
        const start = startOfDay(dateRange.from!);
        const end = endOfDay(dateRange.to || dateRange.from!);
        return isWithinInterval(creationDate, { start, end });
    });
  }, [dashboardOrders, dateRange]);

  const filteredExpensesByDate = useMemo(() => {
    if (!dateRange?.from) return expenses;
    return expenses.filter(exp => {
        const expDate = parseDate(exp.date);
        if (!expDate) return false;
        const start = startOfDay(dateRange.from!);
        const end = endOfDay(dateRange.to || dateRange.from!);
        return isWithinInterval(expDate, { start, end });
    });
  }, [expenses, dateRange]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrdersByDate.length;
    const active = filteredOrdersByDate.filter(o => !['Completed', 'Shipped', 'Cancelled', 'Pending'].includes(o.status)).length;
    const designing = filteredOrdersByDate.filter(o => o.status === 'Designing').length;
    const inProgress = filteredOrdersByDate.filter(o => o.status === 'In Progress').length;
    const designReady = filteredOrdersByDate.filter(o => o.status === 'Design Ready').length;
    const onProduction = filteredOrdersByDate.filter(o => ['Manufacturing', 'Painting'].includes(o.status)).length;
    const delivered = filteredOrdersByDate.filter(o => o.status === 'Completed' || o.status === 'Shipped').length;
    
    const revenue = filteredOrdersByDate.reduce((sum, order) => sum + (order.totalWithVat || order.incomeAmount || 0), 0);
    const prepaid = filteredOrdersByDate.reduce((sum, order) => sum + (order.prepaidAmount || 0), 0);
    const totalExp = filteredExpensesByDate.reduce((sum, exp) => sum + exp.amount, 0);
    const profit = revenue - totalExp;
    const unpaid = revenue - prepaid;
    
    return { totalOrders, active, designing, inProgress, designReady, onProduction, delivered, revenue, prepaid, totalExp, profit, unpaid };
  }, [filteredOrdersByDate, filteredExpensesByDate]);

  if (ordersLoading || customersLoading || userLoading || expensesLoading) {
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
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Layers className="h-5 w-5 text-primary" /> Operational Metrics
                    </CardTitle>
                    <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-70">Workshop Flow Status</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-10">
            <div className="flex items-center gap-x-12 gap-y-6">
                <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Total Lifecycle</span>
                    <div className="text-5xl font-black tracking-tighter text-slate-900 leading-none">{stats.totalOrders.toLocaleString()}</div>
                </div>
                
                <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">In Flow (Active)</span>
                    <div className="text-5xl font-black tracking-tighter text-slate-900 leading-none">{stats.active.toLocaleString()}</div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {stats.designing > 0 && <StatusStat label="Designing" count={stats.designing} color="bg-orange-400" />}
                {stats.inProgress > 0 && <StatusStat label="In Progress" count={stats.inProgress} color="bg-blue-300" />}
                {stats.designReady > 0 && <StatusStat label="Design Ready" count={stats.designReady} color="bg-purple-500" />}
                {stats.onProduction > 0 && <StatusStat label="Production" count={stats.onProduction} color="bg-emerald-500" />}
                {stats.delivered > 0 && <StatusStat label="Delivered" count={stats.delivered} color="bg-blue-600" />}
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <span>Flow Distribution</span>
                    <span>{stats.totalOrders} Units</span>
                </div>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200/50">
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
            <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <Target className="h-5 w-5 text-primary" /> Financial Overview
                </CardTitle>
                <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-70">Profitability Performance</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {/* Primary Profit Metric */}
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group hover:bg-primary/[0.08] transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <ProfitIcon className="h-20 w-20 text-primary" />
                </div>
                <div className="relative z-10 space-y-1">
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.15em]">Estimated Profit</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">{formatCurrency(stats.profit)}</p>
                        <div className="flex items-center text-xs font-bold text-emerald-600 mb-1">
                            <ArrowUpRight className="h-3 w-3 mr-0.5" />
                            12%
                        </div>
                    </div>
                </div>
              </div>

              {/* Sub-Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Total Sales</span>
                    </div>
                    <p className="text-lg font-black text-slate-800">{formatCurrency(stats.revenue)}</p>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Banknote className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Expenses</span>
                    </div>
                    <p className="text-lg font-black text-slate-800">{formatCurrency(stats.totalExp)}</p>
                  </div>
              </div>

              {/* Secondary Balance Metric */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Unpaid Balance</p>
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(stats.unpaid)}</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Pending Collection</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-bold font-headline tracking-tight text-slate-800">Recent Activity</h2>
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
        <div className="flex flex-col gap-2 p-4 min-w-[120px] rounded-2xl bg-white/40 border border-slate-100/50 shadow-sm hover:shadow-md hover:bg-white/80 transition-all group cursor-default">
            <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-125", color)} />
                <span className="text-[9px] uppercase tracking-[0.1em] font-black text-muted-foreground/70">{label}</span>
            </div>
            <span className="text-2xl font-black leading-none tracking-tight text-slate-800">{count}</span>
        </div>
    )
}
