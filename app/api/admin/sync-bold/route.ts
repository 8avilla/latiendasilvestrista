import { getDb } from '@/lib/mongodb';
import { sendOrderConfirmedEmail } from '@/lib/mail';
import { Order } from '@/types';

const BOLD_API_URL = 'https://api.bold.co/v1/transactions';
const BOLD_API_KEY = process.env.NEXT_PUBLIC_BOLD_API_KEY;

interface BoldTransaction {
  id?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_method?: string;
  created_at?: string;
}

function boldStatusToOrder(status: string): 'CONFIRMADO' | 'CANCELADO' | null {
  const s = status.toUpperCase();
  if (s === 'APPROVED') return 'CONFIRMADO';
  if (s === 'REJECTED' || s === 'VOIDED' || s === 'FAILED') return 'CANCELADO';
  return null;
}

export async function POST() {
  if (!BOLD_API_KEY) {
    return Response.json({ error: 'BOLD_API_KEY no configurada' }, { status: 500 });
  }

  const db = await getDb();

  const pendingOrders = await db
    .collection('orders')
    .find({ status: 'PAGO PENDIENTE', deleted: { $ne: true } })
    .toArray();

  if (pendingOrders.length === 0) {
    return Response.json({ synced: 0, updated: 0, results: [] });
  }

  const results: { orderId: string; boldStatus: string | null; newStatus: string | null; error?: string }[] = [];
  let updated = 0;

  await Promise.all(
    pendingOrders.map(async (order) => {
      const url = `${BOLD_API_URL}?reference=${encodeURIComponent(order.orderId)}`;

      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${BOLD_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          results.push({ orderId: order.orderId, boldStatus: null, newStatus: null, error: `Bold ${res.status}: ${body.slice(0, 200)}` });
          return;
        }

        const data: BoldTransaction = await res.json();
        const boldStatus = data.status ?? '';
        const newStatus = boldStatusToOrder(boldStatus);

        if (newStatus && newStatus !== order.status) {
          await db.collection('orders').updateOne(
            { orderId: order.orderId },
            {
              $set: {
                status: newStatus,
                updatedAt: new Date(),
                ...(data.id ? { 'transactionDetails.paymentId': data.id } : {}),
              },
            }
          );

          if (newStatus === 'CONFIRMADO' && order.shippingDetails?.email) {
            sendOrderConfirmedEmail({ ...order, status: newStatus } as unknown as Order)
              .catch(err => console.error('[sync-bold] email error:', err));
          }

          updated++;
          results.push({ orderId: order.orderId, boldStatus, newStatus });
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
