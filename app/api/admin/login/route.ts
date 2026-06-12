import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set('admin_session', process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return Response.json({ ok: true });
}
