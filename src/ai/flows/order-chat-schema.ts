
import { z } from "genkit";

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
