
'use server';
/**
 * @fileOverview A Genkit flow for handling audio processing, specifically converting raw audio data to WAV format.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';

// Define input schema for audio conversion
const AudioToWavInputSchema = z.string().describe('The base64-encoded raw audio data.');
export type AudioToWavInput = z.infer<typeof AudioToWavInputSchema>;

// Define output schema for audio conversion
const AudioToWavOutputSchema = z.object({
  wavBase64: z.string().describe('The base64-encoded WAV audio data.'),
});
export type AudioToWavOutput = z.infer<typeof AudioToWavOutputSchema>;


/**
 * Converts a raw PCM data buffer to a WAV file buffer.
 * @param pcmData The raw audio data.
 * @returns A Promise that resolves with the base64-encoded WAV data.
 */
async function toWav(pcmData: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels: 1, // Mono
      sampleRate: 48000, // Standard web audio sample rate
      bitDepth: 16,
    });

    const buffers: Buffer[] = [];
    writer.on('data', (chunk) => buffers.push(chunk));
    writer.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
    writer.on('error', reject);

    // Write the raw PCM data and end the stream
    writer.write(pcmData);
    writer.end();
  });
}

// The main flow function for converting audio to WAV
export const audioToWavFlow = ai.defineFlow(
  {
    name: 'audioToWavFlow',
    inputSchema: AudioToWavInputSchema,
    outputSchema: AudioToWavOutputSchema,
  },
  async (rawBase64) => {
    const audioBuffer = Buffer.from(rawBase64, 'base64');
    const wavBase64 = await toWav(audioBuffer);
    
    return {
      wavBase64,
    };
  }
);
