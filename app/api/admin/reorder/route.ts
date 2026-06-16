import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  const body = await request.json() as { collection: string; ids: string[] };
  const { collection, ids } = body;

  if (!collection || !Array.isArray(ids)) {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  if (!['products', 'categories'].includes(collection)) {
    return Response.json({ error: 'Colección no permitida' }, { status: 400 });
  }

  const positionField = collection === 'categories' ? 'order' : 'position';
  const db = await getDb();

  await db.collection(collection).bulkWrite(
    ids.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { [positionField]: index } },
      },
    })),
    { ordered: false }
  );

  return Response.json({ ok: true });
}
