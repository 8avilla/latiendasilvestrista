import crypto from 'node:crypto';

// Polyfill globalThis.crypto for Node 18 environments where it's not defined globally
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = crypto.webcrypto;
}

import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_DEFAULT_CONTAINER || 'uploads';

function getContainerClient() {
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient.getContainerClient(containerName);
}

export async function uploadBlob(
  originalName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'jpg';
  const blobName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

export async function deleteBlob(url: string): Promise<void> {
  try {
    const blobName = url.split('/').pop()!;
    const containerClient = getContainerClient();
    await containerClient.deleteBlob(blobName);
  } catch {
    // Ignorar si el blob no existe
  }
}
