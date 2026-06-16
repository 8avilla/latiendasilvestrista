import sharp from 'sharp';
import { uploadBlob } from '@/lib/azure';

export async function POST(request: Request) {
  const { url, direction } = await request.json() as { url: string; direction: 'left' | 'right' };

  if (!url || (direction !== 'left' && direction !== 'right')) {
    return Response.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) {
    return Response.json({ error: 'No se pudo descargar la imagen' }, { status: 502 });
  }

  const raw = Buffer.from(await res.arrayBuffer());
  const degrees = direction === 'right' ? 90 : 270;

  const rotated = await sharp(raw)
    .rotate(degrees)
    .webp({ quality: 82 })
    .toBuffer();

  const newUrl = await uploadBlob('image.webp', rotated, 'image/webp');

  return Response.json({ url: newUrl });
}
