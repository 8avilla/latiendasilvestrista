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
      console.error('Falta la variable de entorno BOLD_SECRET_KEY');
      return Response.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    // El orden de concatenación requerido por Bold es:
    // {Identificador_de_orden}{Monto_de_transaccion}{Divisa}{Llave_secreta}
    const concatString = `${orderId}${amount}${currency}${secretKey}`;
    
    // Generación del hash SHA-256
    const signature = createHash('sha256').update(concatString).digest('hex');

    return Response.json({ signature });
  } catch (error) {
    console.error('Error al generar firma:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
