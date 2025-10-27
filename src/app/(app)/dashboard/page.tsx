
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderTable } from "@/components/app/order-table"
import { DollarSign, Package, Users, Activity } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import { useCustomers } from "@/hooks/use-customers"

export default function Dashboard() {
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();

  const stats = useMemo(() => {
    if (!orders) return { totalRevenue: 0, ordersInProgress: 0, urgentOrders: 0 };
    const totalRevenue = orders.reduce((acc, order) => acc + (order.incomeAmount || 0), 0);
    const ordersInProgress = orders.filter(o => o.status === "In Progress" || o.status === "Designing" || o.status === "Manufacturing").length;
    const urgentOrders = orders.filter(o => o.isUrgent && o.status !== "Completed" && o.status !== "Shipped" && o.status !== "Cancelled").length;
    
    return {
      totalRevenue,
      ordersInProgress,
      urgentOrders
    }
  }, [orders]);

  if (ordersLoading || customersLoading) {
    return <div>Loading...</div>;
  }


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          An overview of your business operations.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
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
              Based on all orders
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders in Progress</CardTitle>
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
      
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Recent Orders</CardTitle>
            <CardDescription>A list of the most recent orders.</CardDescription>
        </CardHeader>
        <CardContent>
            <OrderTable />
        </CardContent>
      </Card>

    </div>
  )
}
