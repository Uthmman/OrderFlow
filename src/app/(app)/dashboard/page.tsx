"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderTable } from "@/components/app/order-table";
import { 
  TrendingUp, 
  ArrowRight, 
  Loader2, 
  Activity, 
  Layers, 
  Target, 
  Clock, 
  BarChart3, 
  Banknote,
  PieChart,
  CreditCard
} from "lucide-react";
import { useOrders } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/use-customers";
import { useUser } from "@/hooks/use-user";
import { useExpenses } from "@/hooks/use-expenses";
import { useFinancialSettings } from "@/hooks/use-financial-settings";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StatusStatProps {
  label: string;
  count: number;
  color: string;
}

function StatusStat({ label, count, color }: StatusStatProps) {
  return (
    <div className="flex flex-col gap-2 p-3 md:p-4 rounded-2xl bg-white/40 border border-slate-100/50 shadow-sm hover:shadow-md hover:bg-white/80 transition-all group cursor-default">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <div className={cn("h-1.5 w-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125", color)} />
        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.05em] md:tracking-[0.1em] font-black text-muted-foreground/70 truncate">{label}</span>
      </div>
      <span className="text-xl md:text-2xl font-black leading-none tracking-tight text-slate-800">{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { settings: finSettings, loading: financialLoading } = useFinancialSettings();
  const { role, loading: userLoading } = useUser();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const canViewFinancials = role === 'Admin' || role === 'Sales' || role === 'AdminView';

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date && typeof date.seconds === 'number') {
      return new Date(date.seconds * 1000);
    }
    if (typeof date === 'string') {
      try {
        const d = parseISO(date);
        return isNaN(d.getTime()) ? null : d;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const dashboardOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'Pending' || role === 'Admin' || role === 'AdminView');
  }, [orders, role]);

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
    
    // Revenue is only full price if completed, shipped or explicitly paid. 
    // Otherwise it is just the prepayment.
    const realizedRevenue = filteredOrdersByDate.reduce((sum, order) => {
      const total = order.totalWithVat || order.incomeAmount || 0;
      const prepaid = order.prepaidAmount || 0;
      const isFullIncome = ['Completed', 'Shipped'].includes(order.status) || order.paymentStatus === 'Paid';
      return sum + (isFullIncome ? total : prepaid);
    }, 0);

    const totalPotentialSales = filteredOrdersByDate.reduce((sum, order) => sum + (order.totalWithVat || order.incomeAmount || 0), 0);
    
    const totalExp = filteredExpensesByDate.reduce((sum, exp) => sum + exp.amount, 0);
    const profit = realizedRevenue - totalExp;
    const unpaid = totalPotentialSales - realizedRevenue;
    
    return { 
      totalOrders, 
      active, 
      designing, 
      inProgress, 
      designReady, 
      onProduction, 
      delivered, 
      revenue: realizedRevenue, 
      totalExp, 
      profit, 
      unpaid 
    };
  }, [filteredOrdersByDate, filteredExpensesByDate]);

  const shareholderBreakdown = useMemo(() => {
    if (!finSettings?.shareholders || stats.profit <= 0) return [];
    return finSettings.shareholders.map(sh => ({
      ...sh,
      profitShare: (stats.profit * sh.percentage) / 100
    }));
  }, [finSettings, stats.profit]);

  const activeStatuses = useMemo(() => {
    return [
      { label: "Designing", count: stats.designing, color: "bg-orange-400" },
      { label: "In Progress", count: stats.inProgress, color: "bg-blue-300" },
      { label: "Design Ready", count: stats.designReady, color: "bg-purple-500" },
      { label: "Production", count: stats.onProduction, color: "bg-emerald-500" },
      { label: "Delivered", count: stats.delivered, color: "bg-blue-600" },
    ].filter(s => s.count > 0);
  }, [stats]);

  if (ordersLoading || customersLoading || userLoading || expensesLoading || financialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
      </div>
    );
  }

  const gridColsClass = activeStatuses.length <= 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-2";

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
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Layers className="h-5 w-5 text-primary" /> Operational Metrics
              </CardTitle>
              <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-70">Workshop Flow Status</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-10">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-100/50 border border-slate-200/60 relative overflow-hidden group hover:bg-slate-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Layers className="h-20 w-20 text-slate-900" />
                </div>
                <div className="relative z-10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.15em]">Total Lifecycle</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">{stats.totalOrders.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group hover:bg-primary/[0.08] transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Activity className="h-20 w-20 text-primary" />
                </div>
                <div className="relative z-10 space-y-1">
                  <p className="text-[10px] font-black uppercase text-primary tracking-[0.15em]">In Flow (Active)</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">{stats.active.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className={cn("grid gap-2 md:gap-3", gridColsClass)}>
              {activeStatuses.map((status) => (
                <StatusStat key={status.label} label={status.label} count={status.count} color={status.color} />
              ))}
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
          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md ring-1 ring-slate-200/50 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Target className="h-5 w-5 text-primary" /> Financial Overview
                </CardTitle>
                <CardDescription className="text-[11px] font-bold uppercase tracking-widest mt-1 opacity-70">Realized Profitability</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-900 text-white relative overflow-hidden group shadow-lg shadow-slate-900/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-20 w-20" />
                  </div>
                  <div className="relative z-10 space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Realized Profit</p>
                    <p className="text-4xl font-black tracking-tighter leading-tight">{formatCurrency(stats.profit)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Realized Sales</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.revenue)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Banknote className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Expenses</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalExp)}</p>
                  </div>
                </div>

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
                  {stats.unpaid > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Pending</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {shareholderBreakdown.length > 0 && stats.profit > 0 && (
              <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md ring-1 ring-slate-200/50 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-700">
                    <PieChart className="h-4 w-4 text-primary" /> Shareholder Payouts
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 pb-6 px-6">
                  <div className="space-y-4">
                    {shareholderBreakdown.map(sh => (
                      <div key={sh.id} className="space-y-1.5">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{sh.name}</span>
                            <Badge variant="outline" className="h-4 px-1.5 py-0 text-[8px] font-black border-slate-200 text-slate-400 uppercase tracking-tighter">{sh.percentage}%</Badge>
                          </div>
                          <span className="text-xs font-black text-primary">{formatCurrency(sh.profitShare)}</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary/40 rounded-full" 
                            style={{ width: `${sh.percentage}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
  );
}
