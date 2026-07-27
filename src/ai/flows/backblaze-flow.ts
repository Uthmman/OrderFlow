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

/**
 * The main flow function for uploading a file to cPanel API.
 * It uses base64 content from the client, converts it to a Blob on the server,
 * and sends it via multipart/form-data to the PHP endpoint.
 */
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
      // Use provided filename or generate one based on timestamp
      const fileName = input.fileName || `upload-${Date.now()}.${input.contentType.split('/')[1] || 'bin'}`;
      formData.append("file", blob, fileName);

      const response = await fetch("https://ensratech.com/api/upload.php", {
        method: "POST",
        body: formData,
        headers: {
          // Some cPanel firewalls block requests without a standard browser User-Agent
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      const statusCode = response.status;
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Upload server responded with status: ${statusCode}. Body: ${responseText.substring(0, 100) || '[Empty Response]'}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse cPanel response:", responseText);
        throw new Error(`Invalid JSON from server (HTTP ${statusCode}). Raw response: ${responseText.substring(0, 200) || '[Empty Response]'}. Please check your PHP script for errors or file size limits.`);
      }

      if (data && data.status === "success") {
        return {
          url: data.url,
          fileName: data.url.split('/').pop() || fileName,
        };
      } else {
        throw new Error(data?.message || `The cPanel API reported an unsuccessful upload status (HTTP ${statusCode}).`);
      }
    } catch (error) {
      console.error("cPanel Upload flow error:", error);
      throw error;
    }
  }
);

/**
 * Placeholder for deleting files. 
 * Note: If cPanel provides a delete endpoint, it should be implemented here.
 */
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
