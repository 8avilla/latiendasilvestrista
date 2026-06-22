import { getDb } from '@/lib/mongodb';
import { sendOrderConfirmedEmail } from '@/lib/mail';
import { Order } from '@/types';

const BOLD_API_URL = 'https://payments.api.bold.co/v2/payment-voucher';
const BOLD_API_KEY = process.env.NEXT_PUBLIC_BOLD_API_KEY;

interface BoldTransaction {
  transaction_id?: string;
  reference_id?: string;
  amount?: number;
  currency?: string;
  payment_status?: string;
  payment_method?: string;
  transaction_date?: string;
}

function boldStatusToOrder(status: string): 'CONFIRMADO' | 'CANCELADO' | null {
  const s = status.toUpperCase();
  if (s === 'APPROVED') return 'CONFIRMADO';
  if (s === 'REJECTED' || s === 'VOIDED' || s === 'FAILED' || s === 'CANCELED') return 'CANCELADO';
  return null;
}

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

  const pendingOrders = await db
    .collection('orders')
    .find({ paymentMethod: { $in: ['Bold', 'BOLD'] }, status: 'PAGO PENDIENTE', deleted: { $ne: true } })
    .toArray();

  if (pendingOrders.length === 0) {
    return Response.json({ synced: 0, updated: 0, results: [] });
  }

  const results: { orderId: string; boldStatus: string | null; newStatus: string | null; paymentId?: string; error?: string }[] = [];
  let updated = 0;

  await Promise.all(
    pendingOrders.map(async (order) => {
      const url = `${BOLD_API_URL}/${encodeURIComponent(order.orderId)}`;

      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `x-api-key ${BOLD_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 404) {
          results.push({ orderId: order.orderId, boldStatus: 'NOT_FOUND', newStatus: null });
          return;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          results.push({ orderId: order.orderId, boldStatus: null, newStatus: null, error: `Bold ${res.status}: ${body.slice(0, 200)}` });
          return;
        }

        const payload = await res.json();
        const data: BoldTransaction = payload.payment || payload;
        const boldStatus = data.payment_status ?? '';
        const newStatus = boldStatusToOrder(boldStatus);

        if (newStatus && newStatus !== order.status) {
          const setFields: Record<string, unknown> = {
            status: newStatus,
            updatedAt: new Date(),
            ...(data.transaction_id ? { 'transactionDetails.paymentId': data.transaction_id } : {}),
          };

          if (newStatus === 'CONFIRMADO' && !order.stockDecremented) {
            setFields.stockDecremented = true;
          }

          await db.collection('orders').updateOne(
            { orderId: order.orderId },
            { $set: setFields }
          );

          if (newStatus === 'CONFIRMADO' && !order.stockDecremented) {
            const { decrementStock } = await import('@/lib/stock');
            await decrementStock(db, order.items as import('@/types').OrderItem[]);
          }

          if (newStatus === 'CONFIRMADO' && order.shippingDetails?.email) {
            sendOrderConfirmedEmail({ ...order, status: newStatus } as unknown as Order)
              .catch(err => console.error('[sync-bold] email error:', err));
          }

          updated++;
          results.push({ orderId: order.orderId, boldStatus, newStatus, ...(data.transaction_id ? { paymentId: data.transaction_id } : {}) });
        } else {
          results.push({ orderId: order.orderId, boldStatus, newStatus: null });
        }
      } catch (err) {
        results.push({ orderId: order.orderId, boldStatus: null, newStatus: null, error: String(err) });
      }
    })
  );

  return Response.json({ synced: pendingOrders.length, updated, results });
}
