import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { checkAuth, hashPassword } from '@/lib/crypto';

export async function GET() {
  const auth = await checkAuth();
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const users = await db.collection('admin_users')
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Permisos insuficientes. Solo administradores pueden gestionar usuarios.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const db = await getDb();
    const usersCol = db.collection('admin_users');

    const existing = await usersCol.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const newUser = {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await usersCol.insertOne(newUser);

    return NextResponse.json({
      ok: true,
      user: {
        _id: result.insertedId.toString(),
        name,
        email: newUser.email,
        role,
        active: true,
        createdAt: newUser.createdAt,
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
