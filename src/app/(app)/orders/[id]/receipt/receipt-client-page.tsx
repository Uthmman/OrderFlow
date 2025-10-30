
"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { Boxes } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatOrderId, formatTimestamp } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Order, Customer } from "@/lib/types";

interface OrderReceiptClientPageProps {
    order: Order | null;
    customer: Customer | null;
}

export function OrderReceiptClientPage({ order, customer }: OrderReceiptClientPageProps) {
  
  // Automatically trigger print dialog once on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => window.print(), 500);
    }
  }, []);

  if (!order) {
    notFound();
  }

  const prepaid = order.prepaidAmount || 0;
  const balance = (order.incomeAmount || 0) - prepaid;

  return (
    <div className="bg-white text-black p-8 md:p-12 max-w-4xl mx-auto font-sans">
      <header className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <Boxes className="h-10 w-10 text-slate-800" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">OrderFlow</h1>
            <p className="text-slate-500">Order Receipt</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold">{formatOrderId(order.id)}</h2>
          <p className="text-slate-500">
            Order Date: {formatTimestamp(order.creationDate)}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-slate-600 mb-2 border-b pb-1">
            Billed To
          </h3>
          {customer ? (
            <>
              <p className="font-bold text-lg">{customer.name}</p>
              {customer.location?.town && <p>{customer.location.town}</p>}
              {customer.email && <p>{customer.email}</p>}
              <p>{customer.phoneNumbers?.find((p) => p.type === "Mobile")?.number}</p>
            </>
          ) : (
            <p>Customer not found.</p>
          )}
        </div>
        <div className="text-right">
          <h3 className="font-semibold text-slate-600 mb-2 border-b pb-1">
            Payment Status
          </h3>
          <Badge
            className={`text-lg ${
              balance <= 0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {balance <= 0 ? "Paid in Full" : "Balance Due"}
          </Badge>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-slate-600 mb-2 border-b pb-1">
          Order Summary
        </h3>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-semibold">Description</th>
              <th className="text-right py-2 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-4 align-top">
                <p className="font-semibold">{order.material || "Custom Product"}</p>
                <p className="text-sm text-slate-600 max-w-prose">
                  {order.description}
                </p>
              </td>
              <td className="text-right py-4 font-semibold">
                {formatCurrency(order.incomeAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(order.incomeAmount)}</span>
            </div>
             <div className="flex justify-between">
                <span className="text-slate-600">Pre-paid Amount</span>
                <span className="font-semibold text-green-600">-{formatCurrency(prepaid)}</span>
            </div>
            <Separator />
             <div className="flex justify-between text-lg font-bold">
                <span>Balance Due</span>
                <span>{formatCurrency(balance)}</span>
            </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-600 mb-2">Notes</h3>
        <p className="text-sm text-slate-500">
          Payment details: {order.paymentDetails || "Not specified."}
          <br />
          Thank you for your business!
        </p>
      </div>

      <footer className="text-center mt-12 text-xs text-slate-400 border-t pt-4">
        <p>OrderFlow Inc. | 123 Business Rd, Commerce City, USA</p>
        <p>This is a computer-generated receipt and does not require a signature.</p>
      </footer>
    </div>
  );
}
