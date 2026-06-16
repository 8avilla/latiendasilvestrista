import { getDb } from '@/lib/mongodb';

const DEFAULT: Record<string, unknown> = {
  announcement: { text: 'Colección Oficial · Envíos a toda Colombia · Pago Seguro con Bold · El Rey del Vallenato · Silvestre Dangond · Productos Originales', enabled: true },
  whatsapp: '3004340482',
  instagram: '',
  tiktok: '',
  facebook: '',
};

export async function GET() {
  const db = await getDb();
  const doc = await db.collection('settings').findOne({ _id: 'main' as unknown as import('mongodb').ObjectId });
  const { _id, ...rest } = (doc ?? {}) as Record<string, unknown>;
  return Response.json({ ...DEFAULT, ...rest });
}

export async function PUT(request: Request) {
  const db = await getDb();
  const body = await request.json();
  await db.collection('settings').updateOne(
    { _id: 'main' as unknown as import('mongodb').ObjectId },
    { $set: { ...body, updatedAt: new Date() } },
    { upsert: true }
  );
  return Response.json({ ok: true });
}
