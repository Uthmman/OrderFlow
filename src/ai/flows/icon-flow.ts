
'use server';
/**
 * @fileOverview A Genkit flow for generating product category icons.
 *
 * - generateIconFlow - A function that creates a simple icon for a product category.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateIconInputSchema = z.object({
  categoryName: z.string().describe('The name of the product category (e.g., "Sofa", "Dining Table").'),
});
export type GenerateIconInput = z.infer<typeof GenerateIconInputSchema>;

const GenerateIconOutputSchema = z.object({
  iconDataUri: z.string().describe('The generated icon as a data URI.'),
});
export type GenerateIconOutput = z.infer<typeof GenerateIconOutputSchema>;

// Wrapper function to be called from the client
export async function generateIcon(input: GenerateIconInput): Promise<GenerateIconOutput> {
  return generateIconFlow(input);
}

// Genkit flow definition
const generateIconFlow = ai.defineFlow(
  {
    name: 'generateIconFlow',
    inputSchema: GenerateIconInputSchema,
    outputSchema: GenerateIconOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a single, simple, minimalist, flat, 2D vector icon for a "${input.categoryName}". The icon should be on a pure white background, with no text or other elements. Use a clean and modern style. Centered.`,
      config: {
        // You might want to experiment with these settings
        aspectRatio: '1:1',
      }
    });

    if (!media || !media.url) {
      throw new Error('Icon generation failed to return an image.');
    }

    return {
      iconDataUri: media.url,
    };
  }
);
