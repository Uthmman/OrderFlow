
import { notFound } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getSdks } from "@/firebase"; // We need a way to get firestore on the server
import type { Order, Customer } from "@/lib/types";
import { OrderReceiptClientPage } from "./receipt-client-page";
import { initializeFirebase } from "@/firebase";

// This will now be the main Server Component
export default async function OrderReceiptPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  // We cannot use hooks on the server, so we fetch data directly.
  // This requires a server-side way to get the firestore instance.
  // We assume initializeFirebase can be adapted or we have a dedicated server function.
  const { firestore } = initializeFirebase();

  const orderRef = doc(firestore, "orders", id);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    notFound();
  }
  const order = orderSnap.data() as Order;

  let customer: Customer | null = null;
  if (order.customerId) {
      const customerRef = doc(firestore, "customers", order.customerId);
      const customerSnap = await getDoc(customerRef);
      if(customerSnap.exists()) {
          customer = customerSnap.data() as Customer;
      }
  }
  
  // We pass the fetched data as props to the client component
  return <OrderReceiptClientPage order={order} customer={customer} />;
}
