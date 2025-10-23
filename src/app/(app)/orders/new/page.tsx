
import { OrderForm } from "@/components/app/order-form"

export default function NewOrderPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Create New Order
        </h1>
        <p className="text-muted-foreground">
          Fill out the form below to add a new order to the system.
        </p>
      </div>
      <OrderForm />
    </div>
  )
}
