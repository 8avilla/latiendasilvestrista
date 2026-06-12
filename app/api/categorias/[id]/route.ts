import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const db = await getDb();
  const data = await request.json();

  const existing = await db.collection('categories').findOne({
    slug: data.slug,
    _id: { $ne: new ObjectId(id) },
  });
  if (existing) {
    return Response.json({ error: 'Ya existe una categoría con ese slug' }, { status: 409 });
  }

  await db.collection('categories').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        name: data.name,
        slug: data.slug,
        order: data.order ?? 0,
        updatedAt: new Date(),
      },
    }
  );

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const db = await getDb();
  await db.collection('categories').deleteOne({ _id: new ObjectId(id) });
  return Response.json({ ok: true });
}
