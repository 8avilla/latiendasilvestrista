'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = '/admin/productos';
    } else {
      setError('Contraseña incorrecta');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full border-2 border-red-600 flex items-center justify-center">
            <span className="text-xs font-black text-red-600">SD</span>
          </div>
          <div>
            <p className="font-serif italic text-lg text-black leading-none">La Tienda Silvestrista</p>
            <p className="text-xs uppercase tracking-widest text-red-600 font-semibold">Panel Admin</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
