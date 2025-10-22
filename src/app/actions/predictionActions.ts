"use server"

import { predictOrderStatus } from "@/ai/flows/predict-order-status"
import type { Order } from "@/lib/types"

export async function runPrediction(order: Order) {
  try {
    const result = await predictOrderStatus({
      orderId: order.id,
      customerName: order.customerName,
      orderDescription: order.description,
      deadline: order.deadline,
      creationDate: order.creationDate,
      status: order.status,
      priority: order.isUrgent ? "High" : "Normal",
      paymentDetails: order.paymentDetails,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error("AI Prediction failed:", error)
    return { success: false, error: "An error occurred while running the prediction." }
  }
}
