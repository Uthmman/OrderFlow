"use server";
/**
 * @fileOverview An AI assistant for managing orders.
 *
 * - generateOrderChatResponse: A function that handles the AI chat response.
 * - OrderChatInput: The input type for the generateOrderChatResponse function.
 * - OrderChatOutput: The return type for the generateOrderChatResponse function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { Order } from "@/lib/types";

// Define Zod schemas from TypeScript types
const OrderSchema = z.object({
    id: z.string(),
    customerName: z.string(),
    customerId: z.string(),
    description: z.string(),
    status: z.enum(["Pending", "In Progress", "Designing", "Manufacturing", "Completed", "Shipped", "Cancelled"]),
    deadline: z.string(),
    incomeAmount: z.number(),
    prepaidAmount: z.number().optional(),
    isUrgent: z.boolean(),
    creationDate: z.string(),
    attachments: z.array(z.object({
        type: z.enum(['image', 'voice']),
        url: z.string(),
        fileName: z.string()
    })).optional(),
    colors: z.array(z.string()).optional(),
    material: z.string().optional(),
    dimensions: z.object({
        width: z.number(),
        height: z.number(),
        depth: z.number()
    }).optional(),
    paymentDetails: z.string(),
    assignedTo: z.array(z.string()),
    ownerId: z.string(),
    chatMessages: z.array(z.object({
        user: z.object({
            id: z.string(),
            name: z.string(),
            avatarUrl: z.string()
        }),
        text: z.string(),
        imageUrl: z.string().optional(),
        timestamp: z.string()
    })).optional(),
});


export const OrderChatInputSchema = z.object({
  order: OrderSchema,
  message: z.string().describe("The user's message in the chat."),
});
export type OrderChatInput = z.infer<typeof OrderChatInputSchema>;

export const OrderChatOutputSchema = z.object({
  text: z.string().describe("The AI's response text."),
  imageUrl: z.string().optional().describe("A URL to a generated image, if requested."),
});
export type OrderChatOutput = z.infer<typeof OrderChatOutputSchema>;


export async function generateOrderChatResponse(input: OrderChatInput): Promise<OrderChatOutput> {
  return orderChatFlow(input);
}


const orderChatFlow = ai.defineFlow(
  {
    name: "orderChatFlow",
    inputSchema: OrderChatInputSchema,
    outputSchema: OrderChatOutputSchema,
  },
  async (input) => {
    
    // Check if the user is asking for an image
    const isImageRequest = /^(draw|generate|create|show me|design)\s/i.test(input.message);

    if (isImageRequest) {
        const { media } = await ai.generate({
            model: 'googleai/imagen-4.0-fast-generate-001',
            prompt: `A product design sketch for the following request: ${input.message}`,
        });

        return {
            text: `Here is a design concept based on your request.`,
            imageUrl: media.url,
        };
    }
    
    // If not an image request, generate a text response
    const llmResponse = await ai.generate({
      prompt: `You are an AI assistant helping manage a customer order.
      The user is sending a message in the chat for this order.
      
      Order Details:
      - Description: ${input.order.description}
      - Status: ${input.order.status}
      - Deadline: ${input.order.deadline}
      - Customer: ${input.order.customerName}
      - Urgency: ${input.order.isUrgent ? 'Urgent' : 'Normal'}

      User's message: "${input.message}"
      
      Your task:
      1. Analyze the user's message in the context of the order details.
      2. If the user is asking a question about the order, answer it based on the details provided.
      3. If the user is giving an update, acknowledge it.
      4. If the order status is 'Pending' for a long time, you can suggest changing it to 'In Progress'.
      5. Keep your responses concise and helpful.
      
      Generate a helpful response text.`,
    });

    return {
      text: llmResponse.text,
    };
  }
);
