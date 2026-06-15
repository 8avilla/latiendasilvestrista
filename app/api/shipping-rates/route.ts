import { getDb } from '@/lib/mongodb';

const COLLECTION = 'shippingConfig';
const FILTER = { type: 'shippingRates' };

export async function GET() {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne(FILTER);
  return Response.json({
    defaultPrice: doc?.defaultPrice ?? 20000,
    rates: doc?.rates ?? {},
  });
}

export async function PUT(request: Request) {
  const db = await getDb();
  const { defaultPrice, rates } = await request.json();

  await db.collection(COLLECTION).updateOne(
    FILTER,
    {
      $set: {
        type: 'shippingRates',
        defaultPrice: Number(defaultPrice),
        rates,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return Response.json({ ok: true });
}
