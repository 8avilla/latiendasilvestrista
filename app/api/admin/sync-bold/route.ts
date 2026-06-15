import { getDb } from '@/lib/mongodb';
import { sendOrderConfirmedEmail } from '@/lib/mail';
import { Order } from '@/types';

const BOLD_API_URL = 'https://integrations.bold.co/v1/payment-voucher';
const BOLD_API_KEY = process.env.NEXT_PUBLIC_BOLD_API_KEY;

type BoldVoucherStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'VOIDED' | string;

interface BoldVoucherResponse {
  payment_status?: BoldVoucherStatus;
  status?: BoldVoucherStatus;
  transaction_status?: BoldVoucherStatus;
  id?: string;
}

function boldStatusToOrder(boldStatus: string): 'PAGADO' | 'CANCELADO' | null {
  const s = boldStatus.toUpperCase();
  if (s === 'APPROVED') return 'PAGADO';
  if (s === 'REJECTED' || s === 'VOIDED' || s === 'FAILED') return 'CANCELADO';
  return null;
}

export async function POST() {
  if (!BOLD_API_KEY) {
    return Response.json({ error: 'BOLD_API_KEY no configurada' }, { status: 500 });
  }

  try {
    const db = await getDb();

    const pendingOrders = await db
      .collection('orders')
      .find({ status: 'PAGO SIN CONFIRMAR', deleted: { $ne: true } })
      .toArray();

    if (pendingOrders.length === 0) {
      return Response.json({ synced: 0, updated: 0, results: [] });
    }

    const results: { orderId: string; newStatus: string | null; error?: string }[] = [];
    let updated = 0;

    await Promise.all(
      pendingOrders.map(async (order) => {
        const paymentId = order.transactionDetails?.paymentId as string | undefined;

        // Si tenemos el paymentId de Bold lo usamos; si no, intentamos con el orderId como referencia
        const lookupId = paymentId ?? order.orderId;

        const url = `${BOLD_API_URL}/${encodeURIComponent(lookupId)}`;
        console.log(`[sync-bold] ${order.orderId} → GET ${url} (usando ${paymentId ? 'paymentId de Bold' : 'orderId propio — sin webhook recibido'})`);

        try {
          const res = await fetch(url, {
            headers: {
              'Authorization': `x-api-key ${BOLD_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error(`[sync-bold] ${order.orderId} → Bold respondió ${res.status}: ${body}`);
            results.push({ orderId: order.orderId, newStatus: null, error: `Bold respondió ${res.status}` });
            return;
          }

          const data: BoldVoucherResponse = await res.json();

          // Bold puede devolver el estado en distintos campos según la versión de la API
          const rawStatus = data.payment_status ?? data.status ?? data.transaction_status ?? '';
          const newStatus = boldStatusToOrder(rawStatus);

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

            if (newStatus === 'PAGADO' && order.shippingDetails?.email) {
              const updatedOrder = { ...order, status: newStatus } as unknown as Order;
              sendOrderConfirmedEmail(updatedOrder).catch(err =>
                console.error('Error enviando email de confirmación tras sync Bold:', err)
              );
            }

            updated++;
            results.push({ orderId: order.orderId, newStatus });
          } else {
            results.push({ orderId: order.orderId, newStatus: null });
          }
        } catch (err) {
          console.error(`[sync-bold] ${order.orderId} → fetch failed:`, err);
          results.push({ orderId: order.orderId, newStatus: null, error: String(err) });
        }
      })
    );

    return Response.json({ synced: pendingOrders.length, updated, results });
  } catch (error) {
    console.error('Error en sync-bold:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
