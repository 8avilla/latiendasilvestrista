import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { checkAuth, hashPassword } from '@/lib/crypto';

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Permisos insuficientes. Solo administradores pueden gestionar usuarios.' }, { status: 403 });
  }

  const { id } = await props.params;

  try {
    const body = await request.json();
    const { name, email, password, role, active } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Nombre, correo y rol son requeridos' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }

    const db = await getDb();
    const usersCol = db.collection('admin_users');

    let userObjectId;
    try {
      userObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
    }

    const existingUser = await usersCol.findOne({ _id: userObjectId });
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Seguridad: Impedir que el usuario se desactive o se quite el rol de admin a sí mismo
    if (auth.userId === id) {
      if (active === false) {
        return NextResponse.json({ error: 'No puedes desactivar tu propio usuario' }, { status: 400 });
      }
      if (role !== 'admin') {
        return NextResponse.json({ error: 'No puedes cambiar tu propio rol de administrador' }, { status: 400 });
      }
    }

    const duplicateEmail = await usersCol.findOne({
      email: email.toLowerCase(),
      _id: { $ne: userObjectId }
    });
    if (duplicateEmail) {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso por otro usuario' }, { status: 400 });
    }

    const updateData: Record<string, string | boolean> = {
      name,
      email: email.toLowerCase(),
      role,
      active: active !== undefined ? active : true,
      updatedAt: new Date().toISOString()
    };

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      updateData.passwordHash = hashPassword(password);
    }

    await usersCol.updateOne(
      { _id: userObjectId },
      { $set: updateData }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Permisos insuficientes. Solo administradores pueden gestionar usuarios.' }, { status: 403 });
  }

  const { id } = await props.params;

  if (auth.userId === id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
  }

  try {
    let userObjectId;
    try {
      userObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('admin_users').deleteOne({ _id: userObjectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
