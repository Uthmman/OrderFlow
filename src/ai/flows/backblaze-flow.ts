
'use server';
/**
 * @fileOverview A Genkit flow for handling file uploads and deletions with Backblaze B2.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Define input schema for file uploads
const UploadFileInputSchema = z.object({
  fileContent: z.string().describe('The base64-encoded content of the file.'),
  contentType: z.string().describe('The MIME type of the file (e.g., image/jpeg).'),
});
export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

// Define output schema for file uploads
const UploadFileOutputSchema = z.object({
  url: z.string().describe('The public URL of the uploaded file.'),
  fileName: z.string().describe('The name of the file stored in the bucket.'),
});
export type UploadFileOutput = z.infer<typeof UploadFileOutputSchema>;

// Define input schema for file deletions
const DeleteFileInputSchema = z.object({
    fileName: z.string().describe('The name of the file to delete from the bucket.'),
});

// Helper function to initialize S3 client for B2
let s3Client: S3Client | null = null;

function getB2Client() {
  if (s3Client) {
    return s3Client;
  }

  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const endpoint = process.env.B2_ENDPOINT;

  if (!keyId || !applicationKey || !endpoint) {
    // Return null if configuration is incomplete. The flow will handle this.
    return null;
  }

  s3Client = new S3Client({
    endpoint: `https://${endpoint}`,
    region: endpoint.split('.')[1], // e.g., us-east-005
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
  });

  return s3Client;
}


// The main flow function for uploading a file
export const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
  },
  async (input) => {
    const client = getB2Client();
    const bucketName = process.env.B2_BUCKET_NAME;
    const publicUrlPrefix = process.env.B2_PUBLIC_URL_PREFIX;

    if (!client || !bucketName || !publicUrlPrefix) {
        throw new Error('Backblaze B2 storage is not configured on the server. Please check environment variables.');
    }

    const fileBuffer = Buffer.from(input.fileContent, 'base64');
    const fileExtension = input.contentType.split('/')[1] || 'bin';
    const fileName = `${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: input.contentType,
    });

    await client.send(command);

    // Correct public URL structure using the public URL prefix from .env
    const url = `${publicUrlPrefix}/${fileName}`;

    return {
      url: url,
      fileName: fileName,
    };
  }
);


// The main flow function for deleting a file
export const deleteFileFlow = ai.defineFlow(
    {
        name: 'deleteFileFlow',
        inputSchema: DeleteFileInputSchema,
        outputSchema: z.void(),
    },
    async (input) => {
        const client = getB2Client();
        const bucketName = process.env.B2_BUCKET_NAME;

        if (!client || !bucketName) {
            console.warn('Backblaze B2 client not configured. Skipping file deletion.');
            return;
        }

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: input.fileName,
        });

        try {
            await client.send(command);
        } catch (error) {
            console.error(`Failed to delete file '${input.fileName}' from B2:`, error);
            // Don't re-throw, just log the error. We don't want to block order deletion if a file is already gone.
        }
    }
);
