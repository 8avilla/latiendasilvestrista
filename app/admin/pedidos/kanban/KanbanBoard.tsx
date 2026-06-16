'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/types';
import { ClientDateTime } from '@/components/ClientDateTime';

const COLUMNS: { status: OrderStatus; label: string; color: string; bg: string; border: string }[] = [
  { status: 'NUEVO PEDIDO',   label: 'Nuevo pedido',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { status: 'PAGO PENDIENTE', label: 'Pago pendiente', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { status: 'CONFIRMADO',     label: 'Confirmado',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  { status: 'EN PREPARACIÓN', label: 'Preparación',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { status: 'ENVIADO',        label: 'Enviado',        color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { status: 'ENTREGADO',      label: 'Entregado',      color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
];

interface Props { orders: Order[] }

export default function KanbanBoard({ orders: initial }: Props) {
  const [orders, setOrders] = useState(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<OrderStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function moveOrder(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o));
    } catch {
      alert('Error al actualizar el estado del pedido.');
    } finally {
      setUpdatingId(null);
    }
  }

  function onDragStart(orderId: string) {
    setDraggingId(orderId);
  }

  function onDrop(status: OrderStatus) {
    if (!draggingId) return;
    const order = orders.find(o => o.orderId === draggingId);
    if (order && order.status !== status) {
      moveOrder(draggingId, status);
    }
    setDraggingId(null);
    setDragOverCol(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
      {COLUMNS.map(col => {
        const colOrders = orders.filter(o => o.status === col.status);
        const isOver = dragOverCol === col.status;
        return (
          <div
            key={col.status}
            className={`flex-shrink-0 w-64 flex flex-col rounded-xl border-2 transition-all ${isOver ? col.border + ' ' + col.bg : 'border-gray-200 bg-gray-50/50'}`}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.status); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => onDrop(col.status)}
          >
            {/* Column header */}
            <div className={`px-4 py-3 border-b ${isOver ? col.border : 'border-gray-200'} flex items-center justify-between`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bg} ${col.color} border ${col.border}`}>
                {colOrders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '65vh' }}>
              {colOrders.length === 0 && (
                <div className={`text-center py-8 text-xs text-gray-400 border-2 border-dashed rounded-lg ${isOver ? col.border + ' ' + col.bg : 'border-gray-200'}`}>
                  Arrastra aquí
                </div>
              )}
              {colOrders.map(order => (
                <div
                  key={order.orderId}
                  draggable
                  onDragStart={() => onDragStart(order.orderId)}
                  onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                  className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${
                    draggingId === order.orderId ? 'opacity-40 scale-95' : ''
                  } ${updatingId === order.orderId ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-black leading-snug truncate">{order.shippingDetails.name}</p>
                    {updatingId === order.orderId && (
                      <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-gray-400 mb-2">{order.orderId}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black">${order.totalPrice.toLocaleString('es-CO')}</span>
                    <span className="text-[10px] text-gray-400">
                      <ClientDateTime date={order.createdAt} />
                    </span>
                  </div>
                  {order.items.length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate">
                      {order.items.length} artículo{order.items.length > 1 ? 's' : ''}: {order.items[0].product.name}{order.items.length > 1 ? ', ...' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
