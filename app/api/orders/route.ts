import { getDb } from '@/lib/mongodb';
import { NextRequest } from 'next/server';
import { sendOrderConfirmedEmail, sendOrderReceivedEmail, sendOrderInPreparationEmail, sendOrderShippedEmail } from '@/lib/mail';
import { Order } from '@/types';

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const { items, totalPrice, shippingPrice = 0, shippingDetails, paymentMethod = 'BOLD', status, salesChannel, notes, analyticsSessionId } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    if (!totalPrice || typeof totalPrice !== 'number') {
      return Response.json({ error: 'Monto de orden inválido' }, { status: 400 });
    }

    if (!shippingDetails || !shippingDetails.name || !shippingDetails.address || !shippingDetails.phone) {
      return Response.json({ error: 'Faltan datos de envío obligatorios' }, { status: 400 });
    }

    let finalStatus = status;
    if (!finalStatus) {
      finalStatus = paymentMethod === 'WHATSAPP' ? 'NUEVO PEDIDO' : 'PAGO PENDIENTE';
    }

    let finalChannel = salesChannel;
    if (!finalChannel) {
      finalChannel = paymentMethod === 'WHATSAPP' ? 'Whatsapp' : 'Tienda Online';
    }

    // Deduplicar: reutilizar pedido PAGO PENDIENTE reciente del mismo email con el mismo total
    if (finalStatus === 'PAGO PENDIENTE' && shippingDetails.email) {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000); // últimos 30 min
      const existing = await db.collection('orders').findOne({
        'shippingDetails.email': shippingDetails.email,
        status: 'PAGO PENDIENTE',
        totalPrice,
        createdAt: { $gte: cutoff },
        deleted: { $ne: true },
      }, { sort: { createdAt: -1 } });

      if (existing) {
        return Response.json({ orderId: existing.orderId, order: existing }, { status: 200 });
      }
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `LTS-${timestamp}-${randomSuffix}`;

    const now = new Date();
    const orderDoc = {
      orderId,
      items,
      totalPrice,
      shippingPrice,
      shippingDetails,
      paymentMethod,
      status: finalStatus,
      salesChannel: finalChannel,
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('orders').insertOne(orderDoc);

    db.collection('analytics').insertOne({
      event: 'order_completed',
      sessionId: analyticsSessionId || null,
      date: now,
    }).catch(() => {});

    if (paymentMethod === 'WHATSAPP' && shippingDetails.email) {
      sendOrderReceivedEmail(orderDoc as unknown as Order).catch(err =>
        console.error('Error enviando email de pedido recibido:', err)
      );
    }

    return Response.json({ orderId, order: orderDoc }, { status: 201 });
  } catch (error) {
    console.error('Error al crear el pedido:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || searchParams.get('bold-order-id');
    const boldTxStatus = searchParams.get('bold-tx-status');

    if (orderId) {
      const order = await db.collection('orders').findOne({ orderId });
      if (!order) {
        return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }

      if (order.status === 'PAGO PENDIENTE') {
        let updatedStatus = '';
        if (boldTxStatus === 'approved') {
          updatedStatus = 'CONFIRMADO';
        } else if (boldTxStatus === 'rejected') {
          updatedStatus = 'CANCELADO';
        }

        if (updatedStatus) {
          await db.collection('orders').updateOne(
            { orderId },
            { $set: { status: updatedStatus, updatedAt: new Date() } }
          );
          order.status = updatedStatus;

          if (updatedStatus === 'PAGADO' && order.shippingDetails?.email) {
            sendOrderConfirmedEmail(order as unknown as Order).catch(err =>
              console.error('Error enviando email de confirmación:', err)
            );
          }
        }
      }

      return Response.json(order);
    }

    const orders = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray();
    return Response.json(orders);
  } catch (error) {
    console.error('Error al consultar pedidos:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const db = await getDb();
    const { orderId, status, salesChannel, paymentMethod, notes, trackingNumber, carrier, deleted, shippingDetails, items, totalPrice } = await request.json();

    if (!orderId) {
      return Response.json({ error: 'Falta el ID del pedido' }, { status: 400 });
    }

    const prevOrder = await db.collection('orders').findOne({ orderId });
    if (!prevOrder) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };

    if (status !== undefined) updateFields.status = status;
    if (salesChannel !== undefined) updateFields.salesChannel = salesChannel;
    if (paymentMethod !== undefined) updateFields.paymentMethod = paymentMethod;
    if (notes !== undefined) updateFields.notes = notes;
    if (trackingNumber !== undefined) updateFields.trackingNumber = trackingNumber;
    if (carrier !== undefined) updateFields.carrier = carrier;
    if (shippingDetails !== undefined) updateFields.shippingDetails = shippingDetails;
    if (items !== undefined) updateFields.items = items;
    if (totalPrice !== undefined) updateFields.totalPrice = totalPrice;
    if (deleted !== undefined) {
      updateFields.deleted = deleted;
      if (!deleted) updateFields.deletedAt = null;
    }

    // Decrement stock when order transitions to CONFIRMADO for the first time
    if (status === 'CONFIRMADO' && prevOrder.status !== 'CONFIRMADO' && !prevOrder.stockDecremented) {
      const { decrementStock } = await import('@/lib/stock');
      await decrementStock(db, prevOrder.items as import('@/types').OrderItem[]);
      updateFields.stockDecremented = true;
    }

    await db.collection('orders').updateOne({ orderId }, { $set: updateFields });

    if (status === 'CONFIRMADO' && prevOrder.status !== 'CONFIRMADO' && prevOrder.shippingDetails?.email) {
      const updatedOrder = { ...prevOrder, ...updateFields } as unknown as Order;
      sendOrderConfirmedEmail(updatedOrder).catch(err =>
        console.error('Error enviando email de confirmación:', err)
      );
    }

    if (status === 'EN PREPARACIÓN' && prevOrder.status !== 'EN PREPARACIÓN' && prevOrder.shippingDetails?.email) {
      const updatedOrder = { ...prevOrder, ...updateFields } as unknown as Order;
      sendOrderInPreparationEmail(updatedOrder).catch(err =>
        console.error('Error enviando email de en preparación:', err)
      );
    }

    if (status === 'ENVIADO' && prevOrder.status !== 'ENVIADO' && prevOrder.shippingDetails?.email) {
      const updatedOrder = { ...prevOrder, ...updateFields } as unknown as Order;
      sendOrderShippedEmail(updatedOrder).catch(err =>
        console.error('Error enviando email de envío:', err)
      );
    }

    return Response.json({ success: true, message: 'Pedido actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return Response.json({ error: 'Falta el ID del pedido' }, { status: 400 });
    }

    const result = await db.collection('orders').updateOne(
      { orderId },
      { $set: { deleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Pedido movido a la papelera' });
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
