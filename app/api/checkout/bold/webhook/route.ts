import { getDb } from '@/lib/mongodb';
import { sendOrderConfirmedEmail } from '@/lib/mail';
import { Order } from '@/types';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Webhook de Bold recibido:', JSON.stringify(payload, null, 2));

    const { type, data } = payload;

    if (!type || !data) {
      return Response.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const orderId = data.reference;
    if (!orderId) {
      return Response.json({ error: 'Falta el campo reference en data' }, { status: 400 });
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne({ orderId });

    if (!order) {
      console.warn(`Webhook recibido para una orden inexistente: ${orderId}`);
      return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    let nextStatus = order.status;

    if (type === 'SALE_APPROVED') {
      nextStatus = 'CONFIRMADO';
    } else if (type === 'SALE_REJECTED') {
      nextStatus = 'CANCELADO';
    }

    if (nextStatus !== order.status) {
      await db.collection('orders').updateOne(
        { orderId },
        {
          $set: {
            status: nextStatus,
            updatedAt: new Date(),
            transactionDetails: {
              paymentId: data.payment_id,
              subject: payload.subject,
              time: payload.time,
              payloadType: type,
            },
          },
        }
      );
      console.log(`Pedido ${orderId} actualizado a estado: ${nextStatus}`);

      if (nextStatus === 'CONFIRMADO' && order.shippingDetails?.email) {
        const updatedOrder = { ...order, status: nextStatus } as unknown as Order;
        sendOrderConfirmedEmail(updatedOrder).catch(err =>
          console.error('Error enviando email de confirmación:', err)
        );
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error al procesar webhook de Bold:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
