'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface PopupConfig {
  enabled: boolean;
  image: string;
}

export default function PopupAdminPage() {
  const [config, setConfig] = useState<PopupConfig>({ enabled: false, image: '' });
  const [local, setLocal] = useState<PopupConfig>({ enabled: false, image: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/popup')
      .then(r => r.json())
      .then((d: PopupConfig) => {
        setConfig(d);
        setLocal(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Error subiendo imagen');
      setLocal(prev => ({ ...prev, image: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      });
      if (!res.ok) throw new Error('Error guardando configuración');
      setConfig(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = local.enabled !== config.enabled || local.image !== config.image;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-10">
        <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif italic text-black mb-1">Popup de Aviso</h1>
        <p className="text-sm text-gray-500">
          Muestra una imagen de aviso cuando el cliente agrega cualquier producto al carrito.
        </p>
      </div>

      {/* Toggle activar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-black">Activar popup</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {local.enabled
                ? 'El popup se mostrará al agregar al carrito'
                : 'El popup está desactivado — no aparecerá en la tienda'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocal(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              local.enabled ? 'bg-black' : 'bg-gray-200'
            }`}
            aria-label="Toggle popup"
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              local.enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Imagen */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Imagen del popup</p>

        {local.image ? (
          <div className="flex flex-col gap-3">
            <div className="relative w-full max-w-xs aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <Image
                src={local.image}
                alt="Imagen del popup"
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs border border-gray-200 hover:border-black text-gray-600 hover:text-black px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : 'Cambiar imagen'}
              </button>
              <button
                type="button"
                onClick={() => setLocal(prev => ({ ...prev, image: '' }))}
                className="text-xs text-red-500 hover:text-black transition-colors"
              >
                Eliminar imagen
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full max-w-xs aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-400 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                <span className="text-xs">Subiendo...</span>
              </>
            ) : (
              <>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium">Subir imagen</span>
                <span className="text-[10px] text-gray-300">Recomendado: 800×600 px</span>
              </>
            )}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <p className="text-xs text-gray-400 mt-3">
          Esta imagen aparece en un modal antes de que el cliente confirme agregar el producto. Ideal para comunicar políticas de cambio, tallas o condiciones.
        </p>
      </div>

      {/* Preview */}
      {local.image && local.enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">Vista previa</p>
          <p className="text-xs text-amber-600">
            El popup aparecerá cuando el cliente haga clic en "Agregar al carrito" en cualquier producto.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      {/* Botones */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-black hover:bg-gray-800 disabled:opacity-40 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Guardado correctamente
          </span>
        )}
        {hasChanges && !saving && !saved && (
          <span className="text-xs text-amber-500 font-medium">Cambios sin guardar</span>
        )}
      </div>
    </div>
  );
}
