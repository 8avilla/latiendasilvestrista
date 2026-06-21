import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { sendOrderConfirmedEmail, sendOrderInPreparationEmail, sendOrderShippedEmail } from '@/lib/mail';
import { Order } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const { orderIds } = await req.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orderIds provided' }, { status: 400 });
    }

    const db = await getDb();
    const ordersCollection = db.collection('orders');

    const orders = await ordersCollection.find({ orderId: { $in: orderIds } }).toArray();

    let sent = 0;
    let failed = 0;

    for (const orderDoc of orders) {
      try {
        const order = orderDoc as unknown as Order;
        if (!order.shippingDetails?.email) {
          failed++;
          continue; // No email to send to
        }

        if (order.status === 'CONFIRMADO') {
          await sendOrderConfirmedEmail(order);
          sent++;
        } else if (order.status === 'EN PREPARACIÓN') {
          await sendOrderInPreparationEmail(order);
          sent++;
        } else if (order.status === 'ENVIADO') {
          await sendOrderShippedEmail(order);
          sent++;
        } else {
          // No email for this status from this button
          failed++;
          continue;
        }
        
        // Pausa de 400ms entre envíos para no saturar el límite de Mailgun (Error 429)
        await delay(400);
      } catch (err) {
        console.error(`Error sending email for order ${orderDoc.orderId}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
