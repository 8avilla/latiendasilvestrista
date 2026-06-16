import { getDb } from '@/lib/mongodb';

export async function GET() {
  const db = await getDb();
  const docs = await db.collection('products').find({}).sort({ position: 1, createdAt: -1 }).toArray();
  const products = docs.map(({ _id, ...rest }) => ({ ...rest, id: _id.toString() }));
  return Response.json(products);
}

export async function POST(request: Request) {
  const db = await getDb();
  const data = await request.json();
  const now = new Date();

  const result = await db.collection('products').insertOne({
    ...data,
    price: Number(data.price),
    variantGroups: data.variantGroups ?? [],
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id: result.insertedId.toString() }, { status: 201 });
}
