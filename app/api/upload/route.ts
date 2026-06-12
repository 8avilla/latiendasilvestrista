import { uploadBlob } from '@/lib/azure';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return Response.json({ error: 'No se envió ningún archivo' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadBlob(file.name, buffer, file.type);

  return Response.json({ url });
}
