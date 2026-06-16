import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();
  const { sessionId, name, email, phone, city, items, total } = body;
  if (!sessionId || !email) return Response.json({ ok: true }); // Silently ignore incomplete

  await db.collection('abandonos').updateOne(
    { sessionId },
    { $set: { sessionId, name, email, phone, city, items, total, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), converted: false } },
    { upsert: true }
  );
  return Response.json({ ok: true });
}

export async function GET() {
  const db = await getDb();
  const docs = await db.collection('abandonos').find({ converted: { $ne: true } }).sort({ updatedAt: -1 }).toArray();
  return Response.json(docs.map(d => ({ ...d, _id: d._id.toString() })));
}

export async function DELETE(request: Request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Falta id' }, { status: 400 });
  await db.collection('abandonos').updateOne({ _id: new ObjectId(id) }, { $set: { converted: true } });
  return Response.json({ ok: true });
}
