import { getDb } from '@/lib/mongodb';

export async function GET() {
  const db = await getDb();
  const docs = await db.collection('categories').find({}).sort({ order: 1, name: 1 }).toArray();
  const categories = docs.map(({ _id, ...rest }) => ({ ...rest, id: _id.toString() }));
  return Response.json(categories);
}

export async function POST(request: Request) {
  const db = await getDb();
  const data = await request.json();
  const now = new Date();

  const existing = await db.collection('categories').findOne({ slug: data.slug });
  if (existing) {
    return Response.json({ error: 'Ya existe una categoría con ese slug' }, { status: 409 });
  }

  const result = await db.collection('categories').insertOne({
    name: data.name,
    slug: data.slug,
    order: data.order ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id: result.insertedId.toString() }, { status: 201 });
}
