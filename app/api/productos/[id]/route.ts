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
        variants: data.variants ?? [],
        updatedAt: new Date(),
      },
    }
  );

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const db = await getDb();
  await db.collection('products').deleteOne({ _id: new ObjectId(id) });
  return Response.json({ ok: true });
}
