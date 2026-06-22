import { createHash } from 'crypto';

export async function POST(request: Request) {
  try {
    const { orderId, amount, currency = 'COP' } = await request.json();

    if (!orderId) {
      return Response.json({ error: 'Falta orderId' }, { status: 400 });
    }

    if (!amount) {
      return Response.json({ error: 'Falta amount' }, { status: 400 });
    }

    const secretKey = process.env.BOLD_SECRET_KEY;
    if (!secretKey) {
      console.error('[Bold signature] Falta BOLD_SECRET_KEY');
      return Response.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    // Forzar entero para evitar problemas de punto flotante
    const amountInt = String(Math.round(Number(amount)));
    if (isNaN(Number(amount))) {
      console.error('[Bold signature] Monto inválido:', amount);
      return Response.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // El orden de concatenación requerido por Bold es:
    // {Identificador_de_orden}{Monto_de_transaccion}{Divisa}{Llave_secreta}
    const concatString = `${orderId}${amountInt}${currency}${secretKey}`;
    const signature = createHash('sha256').update(concatString).digest('hex');

    console.log(`[Bold signature] orderId=${orderId} amount=${amountInt} currency=${currency} secretKey=****${secretKey.slice(-4)} sig=${signature.slice(0, 8)}...`);

    return Response.json({ signature });
  } catch (error) {
    console.error('Error al generar firma:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
