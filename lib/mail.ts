import { Order } from '@/types';

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;
const MAILGUN_BASE_URL = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net';
const FROM = `${process.env.MAILGUN_FROM_NAME || 'Verzus'} <${process.env.MAILGUN_FROM_EMAIL || `no-responder@${MAILGUN_DOMAIN}`}>`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://verzus.com';

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

function logoHtml() {
  return `<img src="${SITE_URL}/images/logo_verzus.svg" alt="Verzus" width="220" height="57" style="display:block;height:57px;width:auto;max-width:220px;border:0;" />`;
}

function itemsHtml(order: Order) {
  return order.items.map(item => {
    const sel = item.selections
      ? `<br/><span style="color:#9ca3af;font-size:11px;font-style:italic;">${Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>`
      : '';
    const subtotal = item.product.price * item.quantity;
    return `
      <tr>
        <td style="padding:13px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">
          <span style="font-weight:600;">${item.quantity}&times; ${item.product.name}</span>${sel}
        </td>
        <td style="padding:13px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:700;color:#111827;white-space:nowrap;">
          ${formatPrice(subtotal)}
        </td>
      </tr>`;
  }).join('');
}

function divider() {
  return `<div style="height:1px;background:linear-gradient(to right,#000000,#111827);margin:28px 0;opacity:0.15;"></div>`;
}

function sectionLabel(text: string) {
  return `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:800;color:#9ca3af;letter-spacing:3px;text-transform:uppercase;">${text}</p>`;
}

function referenceBox(orderId: string, accentColor = '#000000') {
  return `
    <div style="background:#111827;border-radius:10px;padding:22px 28px;margin-bottom:28px;text-align:center;">
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#6b7280;letter-spacing:3px;text-transform:uppercase;">Referencia del pedido</p>
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:800;letter-spacing:2px;color:${accentColor};">${orderId}</p>
    </div>`;
}

function ctaButton(href: string, text: string, color = '#000000') {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:${color};border-radius:50px;text-align:center;">
          <a href="${href}" style="display:inline-block;padding:15px 38px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap;">${text}</a>
        </td>
      </tr>
    </table>`;
}

function addressBlock(shippingDetails: Order['shippingDetails']) {
  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #e5e7eb;border-left:4px solid #000000;border-radius:8px;">
      <tr>
        <td style="padding:18px 20px;font-size:13px;color:#374151;line-height:1.8;">
          <strong style="color:#111827;font-size:15px;display:block;margin-bottom:6px;">${shippingDetails.name}</strong>
          ${shippingDetails.address}<br/>
          ${shippingDetails.city}${shippingDetails.department ? ', ' + shippingDetails.department : ''}<br/>
          ${shippingDetails.phone}
        </td>
      </tr>
    </table>`;
}

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Verzus</title>
</head>
<body style="margin:0;padding:0;background:#efefef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#efefef;padding:36px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header con logo -->
        <tr><td style="background:#ffffff;padding:26px 32px;text-align:center;border-radius:12px 12px 0 0;border:1px solid #e5e7eb;border-bottom:3px solid #000000;">
          ${logoHtml()}
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 32px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">
            &copy; ${new Date().getFullYear()} Verzus &middot; Ropa para gente como tú
          </p>
          <p style="margin:0;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
            <a href="${SITE_URL}" style="color:#000000;text-decoration:none;font-weight:700;">verzus.com</a>
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
    <!-- Icono estado -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#fee2e2;line-height:64px;font-size:30px;text-align:center;">&#x1F389;</div>
    </div>

    <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;font-style:italic;color:#111827;text-align:center;">&#161;Pago confirmado!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;text-align:center;line-height:1.7;">
      Hola <strong style="color:#111827;">${shippingDetails.name.split(' ')[0]}</strong>, gracias por tu compra.<br/>
      Estamos preparando todo con cuidado para enviarte tu pedido lo antes posible.
    </p>

    ${referenceBox(order.orderId, '#f87171')}

    ${sectionLabel('Resumen de tu compra')}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${itemsHtml(order)}
    </table>

    <!-- Totales -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:28px;">
      <tr><td style="padding:18px 20px;">
        ${order.shippingPrice != null ? `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Subtotal</td>
            <td style="font-size:13px;color:#374151;font-weight:600;text-align:right;padding-bottom:8px;">${formatPrice(order.totalPrice - order.shippingPrice)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:14px;">Envío</td>
            <td style="font-size:13px;color:#374151;font-weight:600;text-align:right;padding-bottom:14px;">${order.shippingPrice === 0 ? 'Gratis' : formatPrice(order.shippingPrice)}</td>
          </tr>
        </table>
        <div style="height:1px;background:#e5e7eb;margin-bottom:14px;"></div>` : ''}
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:15px;font-weight:800;color:#111827;">Total pagado</td>
            <td style="font-size:20px;font-weight:800;color:#000000;text-align:right;">${formatPrice(order.totalPrice)}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    ${divider()}
    ${sectionLabel('Dirección de entrega')}
    ${addressBlock(shippingDetails)}

    <div style="margin-top:32px;text-align:center;">
      ${ctaButton(trackingUrl, 'Rastrear mi pedido')}
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
        O copia este enlace en tu navegador:<br/>
        <a href="${trackingUrl}" style="color:#000000;text-decoration:underline;word-break:break-all;font-size:11px;">${trackingUrl}</a>
      </p>
    </div>
  `);

  await sendMail(shippingDetails.email, `Pago confirmado · Pedido ${order.orderId}`, html);
}

export async function sendOrderReceivedEmail(order: Order): Promise<void> {
  const { shippingDetails } = order;
  const trackingUrl = `${SITE_URL}/seguimiento?id=${order.orderId}`;

  const html = baseTemplate(`
    <!-- Icono estado -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#eff6ff;line-height:64px;font-size:30px;text-align:center;">&#x1F4CB;</div>
    </div>

    <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;font-style:italic;color:#111827;text-align:center;">Pedido recibido</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;text-align:center;line-height:1.7;">
      Hola <strong style="color:#111827;">${shippingDetails.name.split(' ')[0]}</strong>, recibimos tu pedido.<br/>
      Un asesor te contactar&aacute; pronto por WhatsApp para coordinar el pago y el env&iacute;o.
    </p>

    ${referenceBox(order.orderId, '#93c5fd')}

    ${sectionLabel('Productos solicitados')}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${itemsHtml(order)}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="font-size:15px;font-weight:800;color:#111827;border-top:2px solid #111827;padding-top:14px;">Total estimado</td>
        <td style="font-size:20px;font-weight:800;color:#000000;text-align:right;border-top:2px solid #111827;padding-top:14px;">${formatPrice(order.totalPrice)}</td>
      </tr>
    </table>

    ${divider()}
    ${sectionLabel('Dirección de entrega')}
    ${addressBlock(shippingDetails)}

    <div style="margin-top:32px;text-align:center;">
      ${ctaButton(trackingUrl, 'Ver estado del pedido', '#111827')}
    </div>
  `);

  await sendMail(shippingDetails.email, `Pedido recibido · ${order.orderId}`, html);
}

export async function sendOrderInPreparationEmail(order: Order): Promise<void> {
  const { shippingDetails } = order;
  const trackingUrl = `${SITE_URL}/seguimiento?id=${order.orderId}`;

  const html = baseTemplate(`
    <!-- Icono estado -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#fef3c7;line-height:64px;font-size:30px;text-align:center;">&#x1F4E6;</div>
    </div>

    <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;font-style:italic;color:#111827;text-align:center;">&#161;Tu pedido est&aacute; en preparaci&oacute;n!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;text-align:center;line-height:1.7;">
      Hola <strong style="color:#111827;">${shippingDetails.name.split(' ')[0]}</strong>,<br/>
      ya estamos empacando tu pedido con todo el cuidado que se merece. &#x1F3B5;
    </p>

    ${referenceBox(order.orderId, '#fbbf24')}

    <!-- Pasos del proceso -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="text-align:center;width:33%;padding:0 6px;">
          <div style="width:36px;height:36px;border-radius:50%;background:#111827;margin:0 auto 8px;line-height:36px;text-align:center;font-size:14px;font-weight:800;color:#fff;font-family:Arial,Helvetica,sans-serif;">&#10003;</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#111827;font-family:Arial,Helvetica,sans-serif;">Confirmado</p>
        </td>
        <td style="text-align:center;padding:0 6px;padding-top:14px;">
          <div style="height:2px;background:linear-gradient(to right,#111827,#000000);border-radius:2px;"></div>
        </td>
        <td style="text-align:center;width:33%;padding:0 6px;">
          <div style="width:36px;height:36px;border-radius:50%;background:#000000;margin:0 auto 8px;line-height:36px;text-align:center;font-size:14px;font-weight:800;color:#fff;font-family:Arial,Helvetica,sans-serif;">2</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#000000;font-family:Arial,Helvetica,sans-serif;">En preparaci&oacute;n</p>
        </td>
        <td style="text-align:center;padding:0 6px;padding-top:14px;">
          <div style="height:2px;background:#e5e7eb;border-radius:2px;"></div>
        </td>
        <td style="text-align:center;width:33%;padding:0 6px;">
          <div style="width:36px;height:36px;border-radius:50%;background:#e5e7eb;margin:0 auto 8px;line-height:36px;text-align:center;font-size:14px;font-weight:800;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">3</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">Enviado</p>
        </td>
      </tr>
    </table>

    ${divider()}

    <div style="text-align:center;">
      ${ctaButton(trackingUrl, 'Ver seguimiento', '#111827')}
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
        <a href="${trackingUrl}" style="color:#000000;text-decoration:underline;word-break:break-all;font-size:11px;">${trackingUrl}</a>
      </p>
    </div>
  `);

  await sendMail(shippingDetails.email, `Tu pedido está en preparación · ${order.orderId}`, html);
}

export async function sendOrderShippedEmail(order: Order): Promise<void> {
  const { shippingDetails } = order;
  const trackingUrl = `${SITE_URL}/seguimiento?id=${order.orderId}`;

  const html = baseTemplate(`
    <!-- Icono estado -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#ede9fe;line-height:64px;font-size:30px;text-align:center;">&#x1F69A;</div>
    </div>

    <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;font-style:italic;color:#111827;text-align:center;">&#161;Tu pedido va en camino!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;text-align:center;line-height:1.7;">
      Hola <strong style="color:#111827;">${shippingDetails.name.split(' ')[0]}</strong>,<br/>
      tu paquete ya est&aacute; en manos de la transportadora y va rumbo a tu direcci&oacute;n.
    </p>

    ${referenceBox(order.orderId, '#a78bfa')}

    <!-- Datos de guía -->
    ${(order.carrier || order.trackingNumber) ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#f5f3ff;border:1px solid #ddd6fe;border-left:4px solid #7c3aed;border-radius:8px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:800;color:#7c3aed;letter-spacing:3px;text-transform:uppercase;">Datos de tu gu&iacute;a de env&iacute;o</p>
        ${order.carrier ? `<p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong style="color:#111827;">Transportadora:</strong> ${order.carrier}</p>` : ''}
        ${order.trackingNumber ? `
        <p style="margin:4px 0 0;font-size:10px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">N&uacute;mero de gu&iacute;a</p>
        <p style="margin:4px 0 0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:800;color:#111827;letter-spacing:2px;">${order.trackingNumber}</p>
        ` : ''}
      </td></tr>
    </table>
    ` : ''}

    ${divider()}
    ${sectionLabel('Dirección de entrega')}
    ${addressBlock(shippingDetails)}

    <div style="margin-top:32px;text-align:center;">
      ${ctaButton(trackingUrl, 'Rastrear env&iacute;o')}
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
        <a href="${trackingUrl}" style="color:#000000;text-decoration:underline;word-break:break-all;font-size:11px;">${trackingUrl}</a>
      </p>
    </div>
  `);

  await sendMail(shippingDetails.email, `Tu pedido va en camino · ${order.orderId}`, html);
}
