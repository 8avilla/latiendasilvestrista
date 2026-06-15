import { getDb } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const { items, totalPrice, shippingPrice = 0, shippingDetails, paymentMethod = 'BOLD', status, salesChannel, notes } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    if (!totalPrice || typeof totalPrice !== 'number') {
      return Response.json({ error: 'Monto de orden inválido' }, { status: 400 });
    }

    if (!shippingDetails || !shippingDetails.name || !shippingDetails.address || !shippingDetails.phone) {
      return Response.json({ error: 'Faltan datos de envío obligatorios' }, { status: 400 });
    }

    // Determinar estado por defecto si no viene
    let finalStatus = status;
    if (!finalStatus) {
      finalStatus = paymentMethod === 'WHATSAPP' ? 'PEDIDO SIN CONFIRMAR' : 'PAGO SIN CONFIRMAR';
    }

    // Determinar canal de venta
    let finalChannel = salesChannel;
    if (!finalChannel) {
      finalChannel = paymentMethod === 'WHATSAPP' ? 'Whatsapp' : 'Tienda Online';
    }

    // Generar un ID de orden único que cumpla con los requisitos de Bold:
    // Alfanumérico, guiones bajos o medios, máximo 60 caracteres.
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
      // Buscar una orden en particular
      const order = await db.collection('orders').findOne({ orderId });
      if (!order) {
        return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }

      // Si la transacción fue aprobada o rechazada en la redirección y está PAGO SIN CONFIRMAR, actualizamos base de datos
      if (order.status === 'PAGO SIN CONFIRMAR') {
        let updatedStatus = '';
        if (boldTxStatus === 'approved') {
          updatedStatus = 'PAGADO';
        } else if (boldTxStatus === 'rejected') {
          updatedStatus = 'CANCELADO';
        }

        if (updatedStatus) {
          await db.collection('orders').updateOne(
            { orderId },
            {
              $set: {
                status: updatedStatus,
                updatedAt: new Date(),
              },
            }
          );
          order.status = updatedStatus;
        }
      }

      return Response.json(order);
    }

    // Si no hay orderId, listar todos los pedidos (para la vista de administrador)
    // Ordenar por fecha de creación descendente
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
    const { orderId, status, salesChannel, notes } = await request.json();

    if (!orderId) {
      return Response.json({ error: 'Falta el ID del pedido' }, { status: 400 });
    }

    const updateFields: {
      updatedAt: Date;
      status?: string;
      salesChannel?: string;
      notes?: string;
    } = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateFields.status = status;
    }
    if (salesChannel !== undefined) {
      updateFields.salesChannel = salesChannel;
    }
    if (notes !== undefined) {
      updateFields.notes = notes;
    }

    const result = await db.collection('orders').updateOne(
      { orderId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
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

    const result = await db.collection('orders').deleteOne({ orderId });

    if (result.deletedCount === 0) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Pedido eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

