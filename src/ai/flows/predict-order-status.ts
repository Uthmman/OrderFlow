'use server';

/**
 * @fileOverview This file defines a Genkit flow to predict potential order delays.
 *
 * - predictOrderStatus - An asynchronous function that takes order details as input and returns a prediction of potential delays.
 * - PredictOrderStatusInput - The input type for the predictOrderStatus function.
 * - PredictOrderStatusOutput - The output type for the predictOrderStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictOrderStatusInputSchema = z.object({
  orderId: z.string().describe('The unique identifier for the order.'),
  customerName: z.string().describe('The name of the customer who placed the order.'),
  orderDescription: z.string().describe('A detailed description of the order.'),
  deadline: z.string().describe('The deadline for the order (ISO date string).'),
  creationDate: z.string().describe('The date the order was created (ISO date string).'),
  status: z.string().describe('Current status of the order'),
  priority: z.string().describe('The priority of the order'),
  paymentDetails: z.string().describe('Payment details of the order'),
});
export type PredictOrderStatusInput = z.infer<typeof PredictOrderStatusInputSchema>;

const PredictOrderStatusOutputSchema = z.object({
  delayLikelihood: z.string().describe('A prediction of the likelihood of a delay (e.g., High, Medium, Low).'),
  delayReason: z.string().describe('The predicted reason for the potential delay.'),
  recommendedActions: z.string().describe('Recommended actions to mitigate the potential delay.'),
});
export type PredictOrderStatusOutput = z.infer<typeof PredictOrderStatusOutputSchema>;

export async function predictOrderStatus(input: PredictOrderStatusInput): Promise<PredictOrderStatusOutput> {
  return predictOrderStatusFlow(input);
}

const predictOrderStatusPrompt = ai.definePrompt({
  name: 'predictOrderStatusPrompt',
  input: {schema: PredictOrderStatusInputSchema},
  output: {schema: PredictOrderStatusOutputSchema},
  prompt: `You are an AI assistant specializing in predicting potential delays in order fulfillment.
  Analyze the following order details and predict the likelihood of a delay, the reason for the delay, and recommend actions to prevent it.

  Order ID: {{{orderId}}}
  Customer Name: {{{customerName}}}
  Order Description: {{{orderDescription}}}
  Deadline: {{{deadline}}}
  Creation Date: {{{creationDate}}}
  Status: {{{status}}}
  Priority: {{{priority}}}
  Payment Details: {{{paymentDetails}}}

  Respond with the likelihood of delay, reason, and recommended actions.
  Be concise and direct.
  Ensure that the output strictly conforms to the PredictOrderStatusOutputSchema description.`, // Ensure schema adherence
});

const predictOrderStatusFlow = ai.defineFlow(
  {
    name: 'predictOrderStatusFlow',
    inputSchema: PredictOrderStatusInputSchema,
    outputSchema: PredictOrderStatusOutputSchema,
  },
  async input => {
    const {output} = await predictOrderStatusPrompt(input);
    return output!;
  }
);
