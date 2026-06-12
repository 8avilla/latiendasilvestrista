import { BlobServiceClient } from '@azure/storage-blob';
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';

// Polyfill crypto for Node 18 environments (if any)
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = crypto.webcrypto;
}

// Manual .env.local loader
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.error('Failed to load .env.local:', e);
}

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_DEFAULT_CONTAINER || 'uploads';

console.log('Connection string exists:', !!connectionString);
console.log('Container name:', containerName);

async function test() {
  if (!connectionString) {
    console.error('No connection string found in .env.local!');
    return;
  }
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const originalName = 'test-image.webp';
    const ext = originalName.split('.').pop() ?? 'jpg';
    const blobName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    console.log(`Uploading test blob: ${blobName}`);
    const data = Buffer.from('test-vps-data-azure');
    await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: 'image/webp' },
    });
    
    console.log('Upload successful! URL:', blockBlobClient.url);
    
    console.log('Deleting test blob...');
    await containerClient.deleteBlob(blobName);
    console.log('Deletion successful!');
  } catch (error) {
    console.error('Azure Storage Error:', error);
  }
}

test();
