import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const db = await getDb();
  const data = await request.json();

  await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...data,
        price: Number(data.price),
        variantGroups: data.variantGroups ?? [],
        updatedAt: new Date(),
      },
    }
  );

  return Response.json({ ok: true });
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const db = await getDb();
  const doc = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });
  const { _id, ...rest } = doc;
  return Response.json({ ...rest, id: _id.toString() });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const db = await getDb();
  const data = await request.json();

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof data.active === 'boolean') update.active = data.active;
  if (typeof data.price === 'number' && data.price > 0) update.price = data.price;
  if (data.stock !== undefined) update.stock = typeof data.stock === 'number' ? Math.max(0, data.stock) : null;
  if (data.stockTracked !== undefined) update.stockTracked = data.stockTracked;

  await db.collection('products').updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const db = await getDb();
  await db.collection('products').deleteOne({ _id: new ObjectId(id) });
  return Response.json({ ok: true });
}
