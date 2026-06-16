import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/crypto';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') return NextResponse.next();

  const session = request.cookies.get('admin_session')?.value;
  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Soporte temporal de transición
  if (session === process.env.ADMIN_TOKEN) {
    return NextResponse.next();
  }

  // Verificar token firmado
  const payload = verifyToken(session);
  if (!payload || !payload.userId) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

