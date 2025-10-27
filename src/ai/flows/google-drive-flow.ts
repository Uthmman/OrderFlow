
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getGoogleDriveClient() {
  const serviceAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    console.error(`
      ================================================================================
      ERROR: GOOGLE_DRIVE_SERVICE_ACCOUNT environment variable is not set.
      File uploads will fail.
      
      To fix this:
      1. Create a Google Cloud Service Account.
      2. Enable the Google Drive API for your project.
      3. Create a JSON key for the service account and download it.
      4. Paste the entire content of the JSON key file into the .env file as the
         value for GOOGLE_DRIVE_SERVICE_ACCOUNT.
      Example: GOOGLE_DRIVE_SERVICE_ACCOUNT='{"type": "service_account", ...}'
      ================================================================================
    `);
    return null;
  }

  try {
    const credentials = JSON.parse(serviceAccount);
    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      SCOPES
    );
    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error("Error parsing GOOGLE_DRIVE_SERVICE_ACCOUNT. Make sure it's a valid JSON string.", error);
    return null;
  }
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
    if (!drive) {
      throw new Error('Google Drive client is not configured. Please check server logs for details.');
    }
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      console.error(`
        ================================================================================
        ERROR: GOOGLE_DRIVE_FOLDER_ID environment variable is not set.
        File uploads will fail.

        To fix this:
        1. Create a folder in your Google Drive.
        2. Share that folder with your service account's email address (e.g., your-service-account@your-project.iam.gserviceaccount.com).
        3. Copy the folder ID from the URL (it's the long string of characters).
        4. Add it to your .env file: GOOGLE_DRIVE_FOLDER_ID=your_folder_id
        ================================================================================
      `);
      throw new Error('Google Drive folder ID is not configured. Please check server logs for details.');
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
    if (!drive) {
      // If client isn't configured, we can't delete. Log it but don't throw an error
      // as the primary operation (e.g., deleting an order) should still succeed.
      console.warn("Skipping file deletion because Google Drive client is not configured.");
      return;
    }
    
    try {
        await drive.files.delete({
            fileId: fileId,
        });
    } catch (error: any) {
        // If the file is already deleted, Drive API returns a 404. We can safely ignore this.
        if (error.code !== 404) {
            console.error('Failed to delete file from Google Drive:', error);
            // We don't re-throw here to avoid breaking the parent operation (e.g., order deletion).
        }
    }
  }
);
