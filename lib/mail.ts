import { Order } from '@/types';

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;
const MAILGUN_BASE_URL = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net';
const FROM = `${process.env.MAILGUN_FROM_NAME || 'La Tienda Silvestrista'} <${process.env.MAILGUN_FROM_EMAIL || `no-responder@${MAILGUN_DOMAIN}`}>`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://latiendasilvestrista.com';

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const body = new URLSearchParams({ from: FROM, to, subject, html });
  const credentials = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

  const res = await fetch(`${MAILGUN_BASE_URL}/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mailgun error ${res.status}: ${text}`);
  }
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

function itemsHtml(order: Order) {
  return order.items.map(item => {
    const sel = item.selections
      ? `<br/><span style="color:#6b7280;font-size:12px;">${Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>`
      : '';
    const subtotal = item.product.price * item.quantity;
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:14px;color:#111827;font-weight:600;">${item.quantity}× ${item.product.name}</span>${sel}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:700;color:#111827;white-space:nowrap;">
          ${formatPrice(subtotal)}
        </td>
      </tr>`;
  }).join('');
}

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>La Tienda Silvestrista</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:#000;padding:24px 32px;text-align:center;border-radius:12px 12px 0 0;">
          <span style="color:#fff;font-size:11px;letter-spacing:4px;font-weight:700;text-transform:uppercase;">La Tienda Silvestrista</span>
          <div style="width:32px;height:2px;background:#dc2626;margin:8px auto 0;"></div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            © ${new Date().getFullYear()} La Tienda Silvestrista · El Rey del Vallenato<br/>
            <a href="${SITE_URL}" style="color:#9ca3af;text-decoration:none;">latiendasilvestrista.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmedEmail(order: Order): Promise<void> {
  const { shippingDetails } = order;
  const trackingUrl = `${SITE_URL}/seguimiento?id=${order.orderId}`;

  const html = baseTemplate(`
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#f0fdf4;line-height:56px;text-align:center;font-size:28px;">✓</div>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">¡Pago Confirmado!</h1>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7280;text-align:center;">
      Hola <strong>${shippingDetails.name.split(' ')[0]}</strong>, tu pedido fue confirmado y estamos preparando tu envío.
    </p>

    <!-- Reference -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
      <span style="font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Referencia del pedido</span><br/>
      <span style="font-size:18px;font-weight:700;color:#111827;font-family:monospace;">${order.orderId}</span>
    </div>

    <!-- Items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsHtml(order)}
    </table>

    <!-- Totals -->
    ${order.shippingPrice != null ? `
    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;color:#6b7280;">
      <span>Subtotal</span>
      <span>${formatPrice(order.totalPrice - order.shippingPrice)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;color:#6b7280;">
      <span>Envío</span>
      <span>${order.shippingPrice === 0 ? 'Gratis' : formatPrice(order.shippingPrice)}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #111827;margin-bottom:24px;">
      <span style="font-size:14px;font-weight:700;color:#111827;">Total pagado</span>
      <span style="font-size:18px;font-weight:700;color:#dc2626;">${formatPrice(order.totalPrice)}</span>
    </div>

    <!-- Shipping -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:28px;">
      <div style="font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;margin-bottom:12px;">Datos de envío</div>
      <div style="font-size:13px;color:#374151;line-height:1.8;">
        <strong>${shippingDetails.name}</strong><br/>
        ${shippingDetails.address}<br/>
        ${shippingDetails.city}${shippingDetails.department ? `, ${shippingDetails.department}` : ''}<br/>
        ${shippingDetails.phone}
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="${trackingUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
        Seguir mi pedido →
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
        También puedes copiar este enlace: <a href="${trackingUrl}" style="color:#dc2626;">${trackingUrl}</a>
      </p>
    </div>
  `);

  await sendMail(shippingDetails.email, `Pedido confirmado · ${order.orderId}`, html);
}

export async function sendOrderReceivedEmail(order: Order): Promise<void> {
  const { shippingDetails } = order;
  const trackingUrl = `${SITE_URL}/seguimiento?id=${order.orderId}`;

  const html = baseTemplate(`
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#eff6ff;line-height:56px;text-align:center;font-size:28px;">📋</div>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Pedido Recibido</h1>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7280;text-align:center;">
      Hola <strong>${shippingDetails.name.split(' ')[0]}</strong>, recibimos tu pedido.<br/>
      Un asesor te contactará por WhatsApp para coordinar el pago y el envío.
    </p>

    <!-- Reference -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
      <span style="font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;">Referencia del pedido</span><br/>
      <span style="font-size:18px;font-weight:700;color:#111827;font-family:monospace;">${order.orderId}</span>
    </div>

    <!-- Items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsHtml(order)}
    </table>

    <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #111827;margin-bottom:24px;">
      <span style="font-size:14px;font-weight:700;color:#111827;">Total estimado</span>
      <span style="font-size:18px;font-weight:700;color:#dc2626;">${formatPrice(order.totalPrice)}</span>
    </div>

    <!-- Shipping -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:28px;">
      <div style="font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;margin-bottom:12px;">Datos de envío</div>
      <div style="font-size:13px;color:#374151;line-height:1.8;">
        <strong>${shippingDetails.name}</strong><br/>
        ${shippingDetails.address}<br/>
        ${shippingDetails.city}${shippingDetails.department ? `, ${shippingDetails.department}` : ''}<br/>
        ${shippingDetails.phone}
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="${trackingUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
        Ver estado del pedido →
      </a>
    </div>
  `);

  await sendMail(shippingDetails.email, `Pedido recibido · ${order.orderId}`, html);
}
