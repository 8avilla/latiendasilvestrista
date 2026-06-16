import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const db = await getDb();
  const docs = await db.collection('templates').find({}).sort({ createdAt: -1 }).toArray();
  return Response.json(docs.map(d => ({ ...d, _id: d._id.toString() })));
}

export async function POST(request: Request) {
  const db = await getDb();
  const { name, body } = await request.json();
  if (!name?.trim() || !body?.trim()) return Response.json({ error: 'Nombre y cuerpo son obligatorios' }, { status: 400 });
  const result = await db.collection('templates').insertOne({ name: name.trim(), body: body.trim(), createdAt: new Date() });
  return Response.json({ _id: result.insertedId.toString(), name, body }, { status: 201 });
}

export async function PUT(request: Request) {
  const db = await getDb();
  const { id, name, body } = await request.json();
  await db.collection('templates').updateOne({ _id: new ObjectId(id) }, { $set: { name, body, updatedAt: new Date() } });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Falta id' }, { status: 400 });
  await db.collection('templates').deleteOne({ _id: new ObjectId(id) });
  return Response.json({ ok: true });
}
