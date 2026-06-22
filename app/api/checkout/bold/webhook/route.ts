import { getDb } from '@/lib/mongodb';
import { sendOrderConfirmedEmail } from '@/lib/mail';
import { Order } from '@/types';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('bold-signature');
    const rawBody = await request.text();
    
    const secretKey = process.env.BOLD_SECRET_KEY;
    if (!secretKey) {
      console.error('Falta la variable de entorno BOLD_SECRET_KEY');
      return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
    }

    if (!signature) {
      return Response.json({ error: 'Firma ausente' }, { status: 400 });
    }

    const hashed = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody)
      .digest('hex');

    if (hashed !== signature) {
      console.warn('Firma de Webhook inválida:', { received: signature, expected: hashed });
      return Response.json({ error: 'Firma inválida' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    console.log('Webhook de Bold recibido y validado:', JSON.stringify(payload, null, 2));

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

    const transactionDetails = {
      paymentId: data.payment_id,
      subject: payload.subject,
      time: payload.time,
      payloadType: type,
    };

    if (nextStatus !== order.status) {
      const setFields: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: new Date(),
        transactionDetails,
      };

      if (nextStatus === 'CONFIRMADO' && !order.stockDecremented) {
        setFields.stockDecremented = true;
      }

      await db.collection('orders').updateOne({ orderId }, { $set: setFields });
      console.log(`Pedido ${orderId} actualizado a estado: ${nextStatus}`);

      if (nextStatus === 'CONFIRMADO' && !order.stockDecremented) {
        const { decrementStock } = await import('@/lib/stock');
        await decrementStock(db, order.items as import('@/types').OrderItem[]);
      }

      if (nextStatus === 'CONFIRMADO' && order.shippingDetails?.email) {
        const updatedOrder = { ...order, status: nextStatus } as unknown as Order;
        sendOrderConfirmedEmail(updatedOrder).catch(err =>
          console.error('Error enviando email de confirmación:', err)
        );
      }
    } else if (data.payment_id && !order.transactionDetails?.paymentId) {
      // El estado ya era correcto (confirmado manualmente antes del webhook),
      // solo guardamos el ID de transacción para trazabilidad.
      await db.collection('orders').updateOne(
        { orderId },
        { $set: { transactionDetails, updatedAt: new Date() } }
      );
      console.log(`Pedido ${orderId}: guardado paymentId Bold sin cambio de estado`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error al procesar webhook de Bold:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
