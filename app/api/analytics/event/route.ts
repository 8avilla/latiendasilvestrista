import { getDb } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      event: string;
      sessionId?: string;
      meta?: Record<string, string | number>;
    };
    const { event, sessionId, meta } = body;
    if (!event) return Response.json({ ok: false }, { status: 400 });

    const db = await getDb();
    await db.collection('analytics').insertOne({
      event,
      sessionId: sessionId || null,
      meta: meta || null,
      date: new Date(),
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
