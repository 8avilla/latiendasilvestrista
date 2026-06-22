'use client';

import { useState } from 'react';

interface AbandonoItem {
  product: { name: string; price: number };
  quantity: number;
}

interface Abandono {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  total: number;
  items: AbandonoItem[];
  updatedAt: string;
}

interface Props {
  initial: Abandono[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

export default function AbandonosList({ initial }: Props) {
  const [abandonos, setAbandonos] = useState(initial);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleResolve(id: string) {
    if (!confirm('¿Marcar este carrito como resuelto?')) return;
    setResolvingId(id);
    try {
      await fetch(`/api/abandonos?id=${id}`, { method: 'DELETE' });
      setAbandonos(prev => prev.filter(a => a._id !== id));
    } catch {
      alert('Error al resolver el carrito');
    } finally {
      setResolvingId(null);
    }
  }

  function buildWhatsAppLink(a: Abandono): string {
    const phone = a.phone?.replace(/\D/g, '');
    if (!phone) return '#';
    const itemsText = a.items?.slice(0, 3).map(i => `- ${i.product.name} x${i.quantity}`).join('\n') ?? '';
    const msg = `Hola ${a.name || 'cliente'}, notamos que dejaste productos en tu carrito en Verzus. ¿Puedo ayudarte a completar tu compra?\n\n${itemsText}\n\nTotal: $${(a.total ?? 0).toLocaleString('es-CO')}`;
    return `https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`;
  }

  if (abandonos.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
        No hay carritos abandonados sin resolver.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {abandonos.map(a => {
        const firstItem = a.items?.[0];
        const moreItems = (a.items?.length ?? 0) - 1;
        return (
          <div key={a._id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <p className="text-sm font-semibold text-black">{a.name || 'Anónimo'}</p>
                <p className="text-xs text-gray-400">{timeAgo(a.updatedAt)}</p>
              </div>
              <p className="text-xs text-gray-500 mb-0.5">{a.email}</p>
              {a.phone && <p className="text-xs text-gray-500 mb-0.5">{a.phone}</p>}
              {a.city && <p className="text-xs text-gray-400 mb-1">{a.city}</p>}
              {firstItem && (
                <p className="text-xs text-gray-500 truncate">
                  {firstItem.product.name} x{firstItem.quantity}
                  {moreItems > 0 && <span className="text-gray-400"> +{moreItems} más</span>}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <p className="text-sm font-bold text-black">${(a.total ?? 0).toLocaleString('es-CO')}</p>
              <div className="flex gap-2">
                {a.phone && (
                  <a
                    href={buildWhatsAppLink(a)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => handleResolve(a._id)}
                  disabled={resolvingId === a._id}
                  className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-black hover:text-black transition-colors disabled:opacity-50"
                >
                  {resolvingId === a._id ? '...' : 'Resolver'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
