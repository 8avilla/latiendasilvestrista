import { getDb } from '@/lib/mongodb';

const FILTER = { type: 'globalPopup' };

export async function GET() {
  const db = await getDb();
  const doc = await db.collection('config').findOne(FILTER);
  return Response.json({
    enabled: doc?.enabled ?? false,
    image: doc?.image ?? '',
  });
}

export async function PUT(request: Request) {
  const db = await getDb();
  const { enabled, image } = await request.json();
  await db.collection('config').updateOne(
    FILTER,
    { $set: { type: 'globalPopup', enabled: Boolean(enabled), image: image ?? '', updatedAt: new Date() } },
    { upsert: true }
  );
  return Response.json({ ok: true });
}
