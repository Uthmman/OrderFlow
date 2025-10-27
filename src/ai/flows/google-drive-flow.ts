'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getGoogleDriveClient() {
  const serviceAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT environment variable is not set.');
  }

  const credentials = JSON.parse(serviceAccount);

  const auth = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    SCOPES
  );

  return google.drive({ version: 'v3', auth });
}


// Schema for file upload input
const FileUploadInputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().describe("Base64 encoded content of the file."),
  mimeType: z.string(),
});
export type FileUploadInput = z.infer<typeof FileUploadInputSchema>;

// Schema for the output of the file upload flow
const FileUploadOutputSchema = z.object({
  id: z.string(),
  webViewLink: z.string(),
});
export type FileUploadOutput = z.infer<typeof FileUploadOutputSchema>;

// Genkit Flow for uploading a file
export const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: FileUploadInputSchema,
    outputSchema: FileUploadOutputSchema,
  },
  async (input) => {
    const drive = getGoogleDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set.');
    }

    const fileMetadata = {
      name: input.fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: input.mimeType,
      body: Readable.from(Buffer.from(input.fileContent, 'base64')),
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    if (!response.data.id || !response.data.webViewLink) {
        throw new Error('Failed to get file ID or link from Google Drive.');
    }

    return {
        id: response.data.id,
        webViewLink: response.data.webViewLink,
    };
  }
);


// Genkit Flow for deleting a file
export const deleteFileFlow = ai.defineFlow(
  {
    name: 'deleteFileFlow',
    inputSchema: z.string().describe("The ID of the file to delete from Google Drive."),
    outputSchema: z.void(),
  },
  async (fileId) => {
    const drive = getGoogleDriveClient();
    
    try {
        await drive.files.delete({
            fileId: fileId,
        });
    } catch (error: any) {
        // If the file is already deleted, Drive API returns a 404. We can safely ignore this.
        if (error.code !== 404) {
            console.error('Failed to delete file from Google Drive:', error);
            throw error; // Re-throw other errors
        }
    }
  }
);
