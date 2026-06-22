'use client';

import { useState } from 'react';

interface Settings {
  announcement: { text: string; enabled: boolean };
  whatsapp: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  storeInfo: {
    name: string;
    description: string;
    logoUrl: string;
  };
  shipping: {
    baseCost: number;
    freeThreshold: number;
    enabled: boolean;
  };
  integrations: {
    boldSandbox: boolean;
    adminEmail: string;
  };
}

interface Props {
  initial: Settings;
}

type Tab = 'GENERAL' | 'SHIPPING' | 'INTEGRATIONS' | 'SOCIAL';

export default function ConfigForm({ initial }: Props) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');

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

  // Helper to handle deep updates
  const updateNested = (section: keyof Settings, field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...((prev[section] as Record<string, unknown>) || {}),
        [field]: value
      }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
      {error && (
        <p className="bg-gray-50 border border-red-200 text-black text-sm px-4 py-3 rounded-lg">{error}</p>
      )}
      {saved && (
        <p className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">Configuración guardada correctamente.</p>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-px overflow-x-auto">
        {(['GENERAL', 'SHIPPING', 'INTEGRATIONS', 'SOCIAL'] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = {
            GENERAL: 'General & SEO',
            SHIPPING: 'Envíos',
            INTEGRATIONS: 'Integraciones',
            SOCIAL: 'Redes Sociales'
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        {/* TAB: GENERAL */}
        {activeTab === 'GENERAL' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Store Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-black">Información de la Tienda</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Nombre de la Tienda</label>
                  <input
                    type="text"
                    value={settings.storeInfo?.name || ''}
                    onChange={e => updateNested('storeInfo', 'name', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Logo URL</label>
                  <input
                    type="text"
                    value={settings.storeInfo?.logoUrl || ''}
                    onChange={e => updateNested('storeInfo', 'logoUrl', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                    placeholder="/logo.png"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Descripción (SEO Meta Description)</label>
                <textarea
                  rows={2}
                  value={settings.storeInfo?.description || ''}
                  onChange={e => updateNested('storeInfo', 'description', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
                />
              </div>
            </div>

            {/* Announcement bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-black">Barra de anuncios</h2>
                  <p className="text-xs text-gray-400 mt-0.5">El banner que se desplaza en la parte superior de la tienda</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateNested('announcement', 'enabled', !settings.announcement?.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    settings.announcement?.enabled ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    settings.announcement?.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Texto del anuncio</label>
                <textarea
                  rows={2}
                  value={settings.announcement?.text || ''}
                  onChange={e => updateNested('announcement', 'text', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
                  placeholder="Colección Oficial · Envíos a toda Colombia..."
                />
                <p className="text-[10px] text-gray-400">Usa · para separar los mensajes</p>
              </div>

              {/* Live Preview */}
              {settings.announcement?.enabled && settings.announcement?.text && (
                <div className="mt-2 border border-black rounded overflow-hidden shadow-sm">
                  <div className="bg-black text-white text-[11px] font-bold uppercase tracking-widest py-1.5 whitespace-nowrap overflow-hidden relative flex">
                    <div className="animate-marquee shrink-0 px-4">
                      {settings.announcement.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SHIPPING */}
        {activeTab === 'SHIPPING' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-semibold text-black">Cálculo de Envíos</h2>
                <p className="text-xs text-gray-400 mt-0.5">Configura las reglas para el cobro de domicilios</p>
              </div>
              <button
                type="button"
                onClick={() => updateNested('shipping', 'enabled', !settings.shipping?.enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  settings.shipping?.enabled ? 'bg-black' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  settings.shipping?.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 transition-opacity duration-300" style={{ opacity: settings.shipping?.enabled ? 1 : 0.4 }}>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Costo Base ($)</label>
                <input
                  type="number"
                  disabled={!settings.shipping?.enabled}
                  value={settings.shipping?.baseCost || 0}
                  onChange={e => updateNested('shipping', 'baseCost', Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black disabled:bg-gray-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Umbral Envío Gratis ($)</label>
                <input
                  type="number"
                  disabled={!settings.shipping?.enabled}
                  value={settings.shipping?.freeThreshold || 0}
                  onChange={e => updateNested('shipping', 'freeThreshold', Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black disabled:bg-gray-50"
                />
                <p className="text-[10px] text-gray-400">Si la compra supera este monto, el envío es $0</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INTEGRATIONS */}
        {activeTab === 'INTEGRATIONS' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-black">Pasarela de Pagos (Bold)</h2>
              <div className="flex items-center gap-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <button
                  type="button"
                  onClick={() => updateNested('integrations', 'boldSandbox', !settings.integrations?.boldSandbox)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    !settings.integrations?.boldSandbox ? 'bg-black' : 'bg-blue-500'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    !settings.integrations?.boldSandbox ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <div>
                  <p className="text-sm font-semibold text-black">
                    {!settings.integrations?.boldSandbox ? 'Modo Producción (Dinero Real)' : 'Modo Pruebas (Sandbox)'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Rojo = Cobros reales activados. Azul = Tarjetas de prueba habilitadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-black">Notificaciones</h2>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Email del Administrador</label>
                <input
                  type="email"
                  value={settings.integrations?.adminEmail || ''}
                  onChange={e => updateNested('integrations', 'adminEmail', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder="admin@verzus.com"
                />
                <p className="text-[10px] text-gray-400">Recibirá alertas de nuevas ventas (próximamente)</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SOCIAL */}
        {activeTab === 'SOCIAL' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-black">Contacto y Redes Sociales</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">WhatsApp (número sin prefijo)</label>
                <input
                  type="text"
                  value={settings.whatsapp || ''}
                  onChange={e => setSettings(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder="3004340482"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Instagram (URL)</label>
                <input
                  type="url"
                  value={settings.instagram || ''}
                  onChange={e => setSettings(prev => ({ ...prev, instagram: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder="https://instagram.com/silvestredangond"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">TikTok (URL)</label>
                <input
                  type="url"
                  value={settings.tiktok || ''}
                  onChange={e => setSettings(prev => ({ ...prev, tiktok: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder="https://tiktok.com/@silvestredangond"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Facebook (URL)</label>
                <input
                  type="url"
                  value={settings.facebook || ''}
                  onChange={e => setSettings(prev => ({ ...prev, facebook: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  placeholder="https://facebook.com/silvestredangond"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}
