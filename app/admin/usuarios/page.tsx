'use client';

import { useState, useEffect } from 'react';
import { AdminUser } from '@/types';

export default function UsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'editor'>('editor');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    
    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/usuarios');
        if (!res.ok) throw new Error('No se pudieron obtener los usuarios');
        const data = await res.json();
        if (active) setUsers(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Show status message helper
  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  // Open modal for creating
  function handleOpenCreate() {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('editor');
    setActive(true);
    setFormError('');
    setShowModal(true);
  }

  // Open modal for editing
  function handleOpenEdit(user: AdminUser) {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // Empty = do not change
    setRole(user.role);
    setActive(user.active);
    setFormError('');
    setShowModal(true);
  }

  // Form submission (Create / Edit)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (password && password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres');
      setFormLoading(false);
      return;
    }

    try {
      const url = editingUser 
        ? `/api/admin/usuarios/${editingUser._id}`
        : '/api/admin/usuarios';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? { name, email, role, active, ...(password ? { password } : {}) }
        : { name, email, password, role };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el usuario');
      }

      flashSuccess(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      setShowModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setFormLoading(false);
    }
  }

  // Handle toggle active status quickly from table
  async function handleToggleActive(user: AdminUser) {
    try {
      const res = await fetch(`/api/admin/usuarios/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          active: !user.active
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar estado');
      }

      flashSuccess(`Usuario ${!user.active ? 'activado' : 'desactivado'} correctamente`);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  // Handle user deletion
  async function handleDelete(user: AdminUser) {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${user.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/usuarios/${user._id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      flashSuccess('Usuario eliminado correctamente');
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif italic text-black">Usuarios Administrativos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Gestiona los accesos y roles del personal en el panel</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-gray-50 border border-red-200 text-black text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl transition-all">
          {success}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            No hay usuarios registrados aparte del administrador por defecto.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Nombre</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Correo Electrónico</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Rol</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Estado</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Creado</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-black">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-black border border-gray-200">
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-100">
                          Editor
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                          user.active ? 'bg-black' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          user.active ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="text-gray-400 hover:text-black transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-gray-400 hover:text-black transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-serif italic text-lg text-black">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {formError && (
                <div className="bg-gray-50 border border-red-200 text-black text-xs px-3.5 py-2.5 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder="juan@verzus.com"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
                  Contraseña {editingUser && '(dejar en blanco para no cambiar)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                />
              </div>

              {/* Role */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Rol</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'admin' | 'editor')}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                >
                  <option value="editor">Editor (Acceso de lectura/escritura general)</option>
                  <option value="admin">Administrador (Acceso total, gestión de usuarios)</option>
                </select>
              </div>

              {/* Active Toggle for editing */}
              {editingUser && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-1">
                  <div>
                    <h3 className="text-sm font-semibold text-black">Usuario Activo</h3>
                    <p className="text-[10px] text-gray-400">Si se desactiva, no podrá ingresar al panel</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      active ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      active ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              )}

              <div className="border-t border-gray-100 pt-5 mt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-black text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
