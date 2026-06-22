'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (res.ok) {
        window.location.href = '/admin';
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciales incorrectas');
        setLoading(false);
      }
    } catch {
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Image
            src="/images/logo_verzus.svg"
            alt="Verzus"
            height={46}
            width={230}
            style={{ height: '46px', width: 'auto' }}
            priority
          />
          <p className="text-xs uppercase tracking-widest text-black font-semibold mt-3">Panel Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="admin@verzus.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-black">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
