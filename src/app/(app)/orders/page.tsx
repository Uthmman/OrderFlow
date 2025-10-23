"use client";

import { OrderTable } from "@/components/app/order-table"
import { Card, CardContent } from "@/components/ui/card"
import { useOrders } from "@/hooks/use-orders"

export default function OrdersPage() {
  const { orders } = useOrders();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage all {orders.length} orders in the system.
        </p>
      </div>
      <Card>
          <CardContent className="pt-6">
            <OrderTable />
          </CardContent>
      </Card>
    </div>
  )
}
