import { getDb } from '@/lib/mongodb';

const BOLD_API_URL = 'https://payments.api.bold.co/v2/payment-voucher';
const BOLD_API_KEY = process.env.NEXT_PUBLIC_BOLD_API_KEY;

interface BoldTransaction {
  transaction_id?: string;
  payment_status?: string;
}

const TARGET_STATUSES = ['CONFIRMADO', 'EN PREPARACIÓN'];

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = cronSecret && request.headers.get('x-cron-secret') === cronSecret;
  if (!hasCronSecret) {
    const { checkAuth } = await import('@/lib/crypto');
    const session = await checkAuth();
    if (!session) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  if (!BOLD_API_KEY) {
    return Response.json({ error: 'BOLD_API_KEY no configurada' }, { status: 500 });
  }

  const db = await getDb();

  const orders = await db
    .collection('orders')
    .find({
      paymentMethod: { $in: ['Bold', 'BOLD'] },
      status: { $in: TARGET_STATUSES },
      deleted: { $ne: true },
      $or: [
        { 'transactionDetails.paymentId': { $exists: false } },
        { 'transactionDetails.paymentId': null },
        { 'transactionDetails.paymentId': '' },
      ],
    })
    .toArray();

  const results: { orderId: string; paymentId: string | null; error?: string }[] = [];
  let updated = 0;

  await Promise.all(
    orders.map(async (order) => {
      const url = `${BOLD_API_URL}/${encodeURIComponent(order.orderId)}`;
      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `x-api-key ${BOLD_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 404) {
          results.push({ orderId: order.orderId, paymentId: null });
          return;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          results.push({ orderId: order.orderId, paymentId: null, error: `Bold ${res.status}: ${body.slice(0, 100)}` });
          return;
        }

        const payload = await res.json();
        const data: BoldTransaction = payload.payment || payload;

        if (data.transaction_id) {
          await db.collection('orders').updateOne(
            { orderId: order.orderId },
            { $set: { 'transactionDetails.paymentId': data.transaction_id, updatedAt: new Date() } }
          );
          updated++;
          results.push({ orderId: order.orderId, paymentId: data.transaction_id });
        } else {
          results.push({ orderId: order.orderId, paymentId: null });
        }
      } catch (err) {
        results.push({ orderId: order.orderId, paymentId: null, error: String(err) });
      }
    })
  );

  return Response.json({ checked: orders.length, updated, results });
}
