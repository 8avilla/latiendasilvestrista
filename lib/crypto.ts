import crypto from 'crypto';

const SECRET = process.env.ADMIN_TOKEN || 'verzus-fallback-secret-2026';

/**
 * Generates a PBKDF2 hash of a password with a random salt.
 * Returns the salt and hash in the format "salt:hash".
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored "salt:hash" string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch {
    return false;
  }
}

/**
 * Signs a payload with HMAC-SHA256, adding a 7-day expiration time.
 * Returns a simple dot-separated token: "payloadBase64.signatureBase64"
 */
export function signToken(payload: object): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const dataStr = JSON.stringify({ ...payload, exp });
  const data = Buffer.from(dataStr).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'admin' | 'editor';
  exp: number;
}

/**
 * Verifies a token's signature and expiration.
 * Returns the decoded payload or null if invalid/expired.
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    if (signature !== expectedSignature) return null;
    
    const payloadStr = Buffer.from(data, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr) as SessionPayload;
    
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Checks cookies for a valid session token.
 * Returns payload if authenticated, otherwise null.
 */
export async function checkAuth(): Promise<{ userId: string; email?: string; role: 'admin' | 'editor' } | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (!session) return null;
  
  if (session === process.env.ADMIN_TOKEN) {
    return { userId: 'legacy', role: 'admin' };
  }
  
  const payload = verifyToken(session);
  if (!payload || !payload.userId) return null;
  
  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role || 'admin',
  };
}

