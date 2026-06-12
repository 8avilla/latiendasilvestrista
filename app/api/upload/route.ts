import sharp from 'sharp';
import { uploadBlob } from '@/lib/azure';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_DIMENSION = 1200;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return Response.json({ error: 'No se envió ningún archivo' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
  }

  const raw = Buffer.from(await file.arrayBuffer());

  const optimized = await sharp(raw)
    .resize(MAX_DIMENSION, MAX_DIMENSION * 2, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const url = await uploadBlob('image.webp', optimized, 'image/webp');

  return Response.json({ url });
}
