import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyPassword, hashPassword, signToken } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!password) {
      return Response.json({ error: 'Contraseña requerida' }, { status: 400 });
    }

    const db = await getDb();
    const usersCol = db.collection('admin_users');
    const totalUsers = await usersCol.countDocuments();

    let userToLogin = null;

    if (totalUsers === 0) {
      // Auto-seeding: Si no hay usuarios creados, permitimos crear el primero con ADMIN_PASSWORD
      const defaultEmail = 'admin@verzus.com';
      const isDefaultAttempt = !email || email.toLowerCase() === defaultEmail;
      
      if (isDefaultAttempt && password === process.env.ADMIN_PASSWORD) {
        const passwordHash = hashPassword(password);
        const newUser = {
          name: 'Administrador',
          email: defaultEmail,
          passwordHash,
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const result = await usersCol.insertOne(newUser);
        userToLogin = {
          _id: result.insertedId.toString(),
          email: newUser.email,
          role: newUser.role,
        };
      } else {
        return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 });
      }
    } else {
      if (!email) {
        return Response.json({ error: 'Correo electrónico requerido' }, { status: 400 });
      }
      
      const user = await usersCol.findOne({ email: email.toLowerCase() });
      if (!user) {
        return Response.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
      }
      
      if (!user.active) {
        return Response.json({ error: 'Usuario inactivo' }, { status: 403 });
      }
      
      const isMatch = verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        return Response.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
      }
      
      userToLogin = {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
      };
    }

    const token = signToken({
      userId: userToLogin._id,
      email: userToLogin.email,
      role: userToLogin.role,
    });

    const cookieStore = await cookies();
    cookieStore.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

