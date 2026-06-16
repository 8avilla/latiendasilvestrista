'use client';

import { useState } from 'react';

interface Settings {
  announcement: { text: string; enabled: boolean };
  whatsapp: string;
  instagram: string;
  tiktok: string;
  facebook: string;
}

interface Props {
  initial: Settings;
}

export default function ConfigForm({ initial }: Props) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Error guardando configuración');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</p>
      )}
      {saved && (
        <p className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Configuración guardada correctamente.</p>
      )}

      {/* Announcement bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-black">Barra de anuncios</h2>
            <p className="text-xs text-gray-400 mt-0.5">El banner que se desplaza en la parte superior de la tienda</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, announcement: { ...prev.announcement, enabled: !prev.announcement.enabled } }))}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              settings.announcement.enabled ? 'bg-black' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              settings.announcement.enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Texto del anuncio</label>
          <textarea
            rows={2}
            value={settings.announcement.text}
            onChange={e => setSettings(prev => ({ ...prev, announcement: { ...prev.announcement, text: e.target.value } }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
            placeholder="Colección Oficial · Envíos a toda Colombia..."
          />
          <p className="text-[10px] text-gray-400">Usa · para separar los mensajes</p>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-black">Contacto y Redes Sociales</h2>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">WhatsApp (número sin prefijo)</label>
          <input
            type="text"
            value={settings.whatsapp}
            onChange={e => setSettings(prev => ({ ...prev, whatsapp: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
            placeholder="3004340482"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Instagram (URL)</label>
          <input
            type="url"
            value={settings.instagram}
            onChange={e => setSettings(prev => ({ ...prev, instagram: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
            placeholder="https://instagram.com/silvestredangond"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">TikTok (URL)</label>
          <input
            type="url"
            value={settings.tiktok}
            onChange={e => setSettings(prev => ({ ...prev, tiktok: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
            placeholder="https://tiktok.com/@silvestredangond"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Facebook (URL)</label>
          <input
            type="url"
            value={settings.facebook}
            onChange={e => setSettings(prev => ({ ...prev, facebook: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
            placeholder="https://facebook.com/silvestredangond"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}
