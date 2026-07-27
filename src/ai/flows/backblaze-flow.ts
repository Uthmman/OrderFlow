'use server';
/**
 * @fileOverview A Genkit flow for handling file uploads to a custom cPanel API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define input schema for file uploads
const UploadFileInputSchema = z.object({
  fileContent: z.string().describe('The base64-encoded content of the file.'),
  contentType: z.string().describe('The MIME type of the file (e.g., image/jpeg).'),
  fileName: z.string().optional().describe('The original name of the file.'),
});
export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

// Define output schema for file uploads
const UploadFileOutputSchema = z.object({
  url: z.string().describe('The public URL of the uploaded file.'),
  fileName: z.string().describe('The name of the file stored on the server.'),
});
export type UploadFileOutput = z.infer<typeof UploadFileOutputSchema>;

// The main flow function for uploading a file to cPanel API
export const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
  },
  async (input) => {
    try {
      const fileBuffer = Buffer.from(input.fileContent, 'base64');
      const blob = new Blob([fileBuffer], { type: input.contentType });
      
      const formData = new FormData();
      // Use provided filename or generate one
      const fileName = input.fileName || `upload-${Date.now()}.${input.contentType.split('/')[1] || 'bin'}`;
      formData.append("file", blob, fileName);

      const response = await fetch("https://ensratech.com/api/upload.php", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload server responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        return {
          url: data.url,
          fileName: data.url.split('/').pop() || fileName,
        };
      } else {
        throw new Error(data.message || "cPanel API upload failed");
      }
    } catch (error) {
      console.error("cPanel Upload error:", error);
      throw error;
    }
  }
);

// Note: If cPanel provides a delete endpoint, it should be implemented here.
// For now, we'll keep the flow defined to avoid breaking hook imports.
export const deleteFileFlow = ai.defineFlow(
    {
        name: 'deleteFileFlow',
        inputSchema: z.object({ fileName: z.string() }),
        outputSchema: z.void(),
    },
    async (input) => {
        console.warn(`Delete requested for ${input.fileName}, but no cPanel delete API is currently configured.`);
    }
);
