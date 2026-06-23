'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Order, OrderStatus, SalesChannel, PaymentMethod } from '@/types';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { ClientDateTime } from '@/components/ClientDateTime';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});
const showError = (msg: string) => Toast.fire({ icon: 'error', title: msg });
const showSuccess = (msg: string) => Toast.fire({ icon: 'success', title: msg });

const PAYMENT_METHODS: PaymentMethod[] = ['Bold', 'Efectivo', 'Nequi', 'Bancolombia', 'Daviplata', 'Otros'];
const PM_LABELS: Record<PaymentMethod, string> = {
  Bold: 'Bold (Tarjeta / PSE)',
  Efectivo: 'Efectivo',
  Nequi: 'Nequi',
  Bancolombia: 'Bancolombia',
  Daviplata: 'Daviplata',
  Otros: 'Otros',
};

function normalizePM(raw: string | undefined): PaymentMethod {
  if (!raw) return 'Bold';
  if (raw === 'BOLD') return 'Bold';
  if (raw === 'WHATSAPP' || raw === 'MANUAL') return 'Efectivo';
  if ((PAYMENT_METHODS as string[]).includes(raw)) return raw as PaymentMethod;
  return 'Otros';
}

const ACTIVE_STATUSES: OrderStatus[] = ['CONFIRMADO', 'EN PREPARACIÓN'];

interface GestorV2Props {
  initialOrders: Order[];
}

export default function GestorV2({ initialOrders }: GestorV2Props) {
  const [prevOrders, setPrevOrders] = useState(initialOrders);
  const [orders, setOrders] = useState(initialOrders);
  if (initialOrders !== prevOrders) {
    setPrevOrders(initialOrders);
    setOrders(initialOrders);
  }

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  // Drawer
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>('CONFIRMADO');
  const [editChannel, setEditChannel] = useState<SalesChannel>('Tienda Online');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('Bold');
  const [editNotes, setEditNotes] = useState('');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editCarrier, setEditCarrier] = useState('');
  const [editShipping, setEditShipping] = useState<Order['shippingDetails'] | null>(null);
  const [editItems, setEditItems] = useState<Order['items']>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const pagados = useMemo(() => {
    return orders
      .filter(o => {
        if (!matchesSearch(o, search)) return false;
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (new Date(o.createdAt) < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (new Date(o.createdAt) > to) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, dateFrom, dateTo]);

  const totalPagado = useMemo(
    () => pagados.reduce((s, o) => s + o.totalPrice, 0),
    [pagados]
  );

  function matchesSearch(order: Order, q: string): boolean {
    if (!q.trim()) return true;
    const query = q.toLowerCase();
    return (
      order.orderId.toLowerCase().includes(query) ||
      (order.shippingDetails?.name?.toLowerCase().includes(query) ?? false) ||
      (order.shippingDetails?.phone?.includes(query) ?? false) ||
      (order.shippingDetails?.city?.toLowerCase().includes(query) ?? false) ||
      order.items.some(i => i.product?.name?.toLowerCase().includes(query))
    );
  }

  function openDrawer(order: Order) {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditChannel(order.salesChannel || 'Tienda Online');
    setEditPaymentMethod(normalizePM(order.paymentMethod as string | undefined));
    setEditNotes(order.notes || '');
    setEditTrackingNumber(order.trackingNumber || '');
    setEditCarrier(order.carrier || 'Interrapidísimo');
    setEditShipping({ ...order.shippingDetails });
    setEditItems(JSON.parse(JSON.stringify(order.items || [])));
    setConfirmDelete(false);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingOrder(null);
  }

  async function handleSave() {
    if (!editingOrder) return;
    setIsSaving(true);
    const newTotalPrice =
      editItems.reduce((s, i) => s + i.product.price * i.quantity, 0) +
      (editingOrder.shippingPrice ?? 0);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editingOrder.orderId,
          status: editStatus,
          salesChannel: editChannel,
          paymentMethod: editPaymentMethod,
          notes: editNotes,
          trackingNumber: editTrackingNumber || '',
          carrier: editCarrier || '',
          shippingDetails: editShipping,
          items: editItems,
          totalPrice: newTotalPrice,
        }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev =>
        prev
          .map(o =>
            o.orderId === editingOrder.orderId
              ? {
                  ...o,
                  status: editStatus,
                  salesChannel: editChannel,
                  paymentMethod: editPaymentMethod,
                  notes: editNotes,
                  trackingNumber: editTrackingNumber,
                  carrier: editCarrier,
                  shippingDetails: editShipping!,
                  items: editItems,
                  totalPrice: newTotalPrice,
                  updatedAt: new Date().toISOString(),
                }
              : o
          )
          .filter(o => ACTIVE_STATUSES.includes(o.status))
      );
      closeDrawer();
    } catch {
      showError('Error al guardar los cambios. Intente de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingOrder) return;
    const result = await Swal.fire({
      title: '¿Mover a papelera?',
      text: 'El pedido se ocultará de este gestor.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, mover',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/orders?orderId=${editingOrder.orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.filter(o => o.orderId !== editingOrder.orderId));
      closeDrawer();
    } catch {
      showError('Error al mover el pedido a la papelera.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSendEmail(orderIds: string[]) {
    if (orderIds.length === 0) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/admin/orders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Correos enviados: ${data.sent}. Fallidos: ${data.failed}.`);
      } else {
        showError(data.error || 'Error al enviar correos.');
      }
    } catch {
      showError('Error de conexión al enviar correos.');
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error();
      const raw = (await res.json()) as Record<string, unknown>[];
      const fresh = raw
        .filter(doc => {
          const s = doc.status as string;
          return (
            (ACTIVE_STATUSES.includes(s as OrderStatus) ||
              s === 'PAID' ||
              s === 'PAGADO' ||
              s === 'PEDIDO TOMADO') &&
            doc.deleted !== true
          );
        })
        .map(doc => {
          const rawStatus = doc.status as string;
          const mappedStatus: OrderStatus =
            rawStatus === 'PEDIDO TOMADO' || rawStatus === 'EN PREPARACIÓN'
              ? 'EN PREPARACIÓN'
              : 'CONFIRMADO';
          return {
            _id: String(doc._id),
            orderId: doc.orderId as string,
            items: doc.items as Order['items'],
            totalPrice: doc.totalPrice as number,
            shippingPrice: (doc.shippingPrice as number) ?? 0,
            shippingDetails: doc.shippingDetails as Order['shippingDetails'],
            paymentMethod: doc.paymentMethod as Order['paymentMethod'],
            status: mappedStatus,
            salesChannel: (doc.salesChannel as Order['salesChannel']) ?? 'Tienda Online',
            notes: (doc.notes as string) ?? '',
            trackingNumber: (doc.trackingNumber as string) ?? '',
            carrier: (doc.carrier as string) ?? '',
            transactionDetails: doc.transactionDetails as Order['transactionDetails'],
            createdAt: doc.createdAt as string,
            updatedAt: doc.updatedAt as string,
            deleted: false,
          };
        });
      setOrders(fresh);
      setLastRefresh(
        new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      showError('Error al actualizar los pedidos.');
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleExportExcel() {
    if (pagados.length === 0) {
      showError('No hay pedidos para exportar.');
      return;
    }
    const rawData: Record<string, unknown>[] = [];
    const summaryMap = new Map<
      string,
      { Producto: string; Variantes: string; 'Cantidad Total': number }
    >();
    pagados.forEach(order => {
      order.items.forEach(item => {
        const variantsStr = item.selections
          ? Object.entries(item.selections)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          : 'N/A';
        rawData.push({
          'ID Pedido': order.orderId,
          Fecha: new Date(order.createdAt).toLocaleDateString('es-CO', {
            timeZone: 'America/Bogota',
          }),
          Cliente: order.shippingDetails.name,
          Teléfono: order.shippingDetails.phone,
          Ciudad: order.shippingDetails.city,
          Dirección: order.shippingDetails.address,
          Producto: item.product.name,
          Variantes: variantsStr,
          Cantidad: item.quantity,
          'Precio Und': item.product.price,
        });
        const key = `${item.product.id}|${variantsStr}`;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            Producto: item.product.name,
            Variantes: variantsStr,
            'Cantidad Total': 0,
          });
        }
        summaryMap.get(key)!['Cantidad Total'] += item.quantity;
      });
    });
    const summaryData = Array.from(summaryMap.values()).sort((a, b) =>
      String(a.Producto).localeCompare(String(b.Producto))
    );
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(rawData);
    ws1['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }];
    ws2['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
      { wch: 18 }, { wch: 35 }, { wch: 35 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Empaque');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Pedidos');
    XLSX.writeFile(wb, `Empaque_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isDrawerOpen && !isSaving && !isDeleting) closeDrawer();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen, isSaving, isDeleting]);

  return (
    <div>
      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-green-600 font-semibold mb-1">
            Pedidos pagados
          </p>
          <p
            className="text-3xl font-bold text-green-700"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            {orders.length}
          </p>
          <p className="text-xs text-green-500 mt-1">
            pedido{orders.length !== 1 ? 's' : ''} por despachar
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Total en cola
          </p>
          <p
            className="text-3xl font-bold text-black"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            ${totalPagado.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-gray-400 mt-1">suma de todos los pagados</p>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col gap-3">
        {/* Fila 1: búsqueda + acciones */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar por ID, cliente, ciudad o producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-black placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {lastRefresh && (
              <span className="text-[10px] text-gray-400">actualizado {lastRefresh}</span>
            )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 border border-emerald-600 hover:bg-emerald-600 text-emerald-700 hover:text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Excel Empaque
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 border border-gray-200 hover:border-black text-gray-600 hover:text-black disabled:opacity-50 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
        </div>

        {/* Fila 2: filtro por fechas */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400 font-medium">Periodo:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-black"
          />
          <span className="text-xs text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-black"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Encabezado de lista */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Pagados</h2>
        <span className="ml-auto text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          {pagados.length}
        </span>
      </div>

      {/* Lista */}
      {pagados.length === 0 ? (
        <div className="border-2 border-dashed border-green-100 rounded-xl py-20 text-center bg-green-50/30">
          <svg
            className="w-12 h-12 text-green-200 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-green-600 font-medium">Sin pedidos pagados pendientes</p>
          <p className="text-green-400 text-xs mt-1">¡Todo al día!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pagados.map(order => (
            <OrderCard key={order._id} order={order} onOpen={() => openDrawer(order)} />
          ))}
        </div>
      )}

      {/* Drawer gestión */}
      {isDrawerOpen && editingOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => { if (!isSaving && !isDeleting) closeDrawer(); }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 flex flex-col border-l border-gray-200 shadow-2xl text-black">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h2
                  className="text-lg font-semibold italic"
                  style={{ fontFamily: 'var(--font-dm-serif)' }}
                >
                  Gestionar Pedido
                </h2>
                <p className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase tracking-wider">
                  {editingOrder.orderId}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                disabled={isSaving || isDeleting}
                className="text-gray-400 hover:text-black transition-colors p-1 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Datos de envío */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Datos de Envío
                </h3>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs space-y-3 text-gray-700">
                  {editShipping && (
                    <>
                      <div>
                        <strong className="block text-black mb-1">Nombre:</strong>
                        <input
                          type="text"
                          value={editShipping.name}
                          onChange={e => setEditShipping({ ...editShipping, name: e.target.value })}
                          disabled={isSaving}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <strong className="block text-black mb-1">Celular:</strong>
                          <input
                            type="text"
                            value={editShipping.phone}
                            onChange={e =>
                              setEditShipping({ ...editShipping, phone: e.target.value })
                            }
                            disabled={isSaving}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded"
                          />
                        </div>
                        <a
                          href={`https://wa.me/57${editShipping.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${editShipping.name.split(' ')[0]}, te escribimos de La Tienda Silvestrista sobre tu pedido ${editingOrder.orderId}. `)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-3 py-1.5 rounded text-[11px] font-semibold transition-colors h-[34px]"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z" />
                          </svg>
                          WhatsApp
                        </a>
                      </div>
                      <div>
                        <strong className="block text-black mb-1">Ciudad:</strong>
                        <input
                          type="text"
                          value={editShipping.city}
                          onChange={e => setEditShipping({ ...editShipping, city: e.target.value })}
                          disabled={isSaving}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                        />
                      </div>
                      <div>
                        <strong className="block text-black mb-1">Dirección:</strong>
                        <input
                          type="text"
                          value={editShipping.address}
                          onChange={e =>
                            setEditShipping({ ...editShipping, address: e.target.value })
                          }
                          disabled={isSaving}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Mover a estado
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as OrderStatus)}
                  disabled={isSaving || isDeleting}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
                >
                  <option value="CONFIRMADO">Pagado</option>
                  <option value="EN PREPARACIÓN">Pagado</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="ENTREGADO">Entregado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              {/* Guía — solo cuando ENVIADO */}
              {editStatus === 'ENVIADO' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs uppercase tracking-wider text-purple-700 font-bold">
                    Guía de Transporte
                  </h3>
                  <div>
                    <label className="block text-xs text-purple-700 font-semibold mb-1">
                      Transportadora
                    </label>
                    <select
                      value={editCarrier}
                      onChange={e => setEditCarrier(e.target.value)}
                      disabled={isSaving || isDeleting}
                      className="block w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-500 transition-all"
                    >
                      <option value="">— Seleccionar —</option>
                      <option value="Coordinadora">Coordinadora</option>
                      <option value="Servientrega">Servientrega</option>
                      <option value="TCC">TCC</option>
                      <option value="Deprisa">Deprisa</option>
                      <option value="Interrapidísimo">Interrapidísimo</option>
                      <option value="472">472</option>
                      <option value="Envia">Envia</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-purple-700 font-semibold mb-1">
                      Número de guía
                    </label>
                    <input
                      type="text"
                      value={editTrackingNumber}
                      onChange={e => setEditTrackingNumber(e.target.value)}
                      disabled={isSaving || isDeleting}
                      placeholder="Ej: 12345678901"
                      className="block w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-500 transition-all font-mono tracking-wider"
                    />
                  </div>
                </div>
              )}

              {/* Método de pago */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Método de Pago
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={e => setEditPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={isSaving || isDeleting}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all"
                >
                  {PAYMENT_METHODS.map(pm => (
                    <option key={pm} value={pm}>
                      {PM_LABELS[pm]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Notas internas
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  disabled={isSaving || isDeleting}
                  placeholder="Observaciones sobre este pedido..."
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all resize-none"
                />
              </div>

              {/* Artículos */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Artículos ({editItems.length})
                </h3>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {editItems.map((item, idx) => {
                    const selections = item.selections
                      ? Object.entries(item.selections)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                      : '';
                    return (
                      <li key={idx} className="p-3 flex items-center gap-3 text-xs bg-white">
                        <div className="relative w-9 h-9 rounded overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                          {item.product.images?.[0] ? (
                            <Image
                              src={item.product.images[0]}
                              alt={item.product.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-black block truncate">
                            {item.quantity}× {item.product.name}
                          </span>
                          {selections && (
                            <span className="text-gray-400 block truncate">{selections}</span>
                          )}
                        </div>
                        <span className="text-black font-semibold shrink-0">
                          ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-xs font-bold text-black">
                  <span>Total</span>
                  <span
                    className="text-red-600"
                    style={{ fontFamily: 'var(--font-dm-serif)' }}
                  >
                    $
                    {(
                      editItems.reduce((s, i) => s + i.product.price * i.quantity, 0) +
                      (editingOrder.shippingPrice ?? 0)
                    ).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* Enviar correo */}
              <button
                onClick={() => handleSendEmail([editingOrder.orderId])}
                disabled={isSendingEmail}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {isSendingEmail ? 'Enviando...' : 'Enviar correo al cliente'}
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-3 shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
                <button
                  onClick={() => { if (!isSaving && !isDeleting) closeDrawer(); }}
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 bg-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
              </div>

              <div className="pt-2 border-t border-gray-200">
                {confirmDelete ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <p className="text-[11px] text-red-800 font-medium">
                      El pedido se moverá a la papelera.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting || isSaving}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider"
                      >
                        {isDeleting ? 'Moviendo...' : 'Sí, papelera'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={isDeleting || isSaving}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={isSaving || isDeleting}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Mover a papelera
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tarjeta de pedido ──────────────────────────────────────────────────────────

const PM_COLORS: Record<PaymentMethod, string> = {
  Bold:        'bg-blue-50 text-blue-700 border-blue-200',
  Efectivo:    'bg-green-50 text-green-700 border-green-200',
  Nequi:       'bg-pink-50 text-pink-700 border-pink-200',
  Bancolombia: 'bg-orange-50 text-orange-700 border-orange-200',
  Daviplata:   'bg-purple-50 text-purple-700 border-purple-200',
  Otros:       'bg-gray-50 text-gray-600 border-gray-200',
};

interface OrderCardProps {
  order: Order;
  onOpen: () => void;
}

function OrderCard({ order, onOpen }: OrderCardProps) {
  const pm = normalizePM(order.paymentMethod as string | undefined);
  const txId = order.transactionDetails?.paymentId;
  const isBold = pm === 'Bold';

  return (
    <div className="bg-white rounded-xl border border-green-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-green-50 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-mono text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
          {order.orderId}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Pagado
          </span>
          <span className="text-[10px] text-gray-400 shrink-0">
            <ClientDateTime date={order.createdAt} />
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="font-bold text-black text-sm leading-tight">{order.shippingDetails.name}</p>

        {/* Datos de envío */}
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
          {order.shippingDetails.address && (
            <>
              <span className="text-gray-400 font-medium">Dirección:</span>
              <span className="text-gray-700">{order.shippingDetails.address}</span>
            </>
          )}
          {order.shippingDetails.department && (
            <>
              <span className="text-gray-400 font-medium">Departamento:</span>
              <span className="text-gray-700">{order.shippingDetails.department}</span>
            </>
          )}
          {order.shippingDetails.city && (
            <>
              <span className="text-gray-400 font-medium">Ciudad:</span>
              <span className="text-gray-700">{order.shippingDetails.city}</span>
            </>
          )}
          {order.shippingDetails.phone && (
            <>
              <span className="text-gray-400 font-medium">Celular:</span>
              <span className="text-gray-700">{order.shippingDetails.phone}</span>
            </>
          )}
          {order.shippingDetails.email && (
            <>
              <span className="text-gray-400 font-medium">Email:</span>
              <span className="text-gray-700 truncate">{order.shippingDetails.email}</span>
            </>
          )}
        </div>

        {/* Canal + Medio de pago */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {order.salesChannel && (
            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
              {order.salesChannel}
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PM_COLORS[pm]}`}>
            {pm}
          </span>
        </div>

        {/* ID Bold + link */}
        {isBold && txId && (
          <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-mono text-blue-700 truncate flex-1">{txId}</span>
            <a
              href={`https://panel.bold.co/misventas/historial-de-transacciones/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver en Bold
            </a>
          </div>
        )}

        <ul className="mt-2.5 space-y-1">
          {order.items.map((item, i) => {
            const vars = item.selections
              ? ` (${Object.values(item.selections).join(' / ')})`
              : '';
            return (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                <span className="text-gray-300 mt-0.5 shrink-0">•</span>
                <span>{item.quantity}× {item.product.name}{vars}</span>
              </li>
            );
          })}
        </ul>

        {order.notes && (
          <p className="mt-2 text-[10px] text-gray-500 italic border-t border-gray-100 pt-2">
            {order.notes}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <span
          className="text-base font-bold text-red-600"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          ${order.totalPrice.toLocaleString('es-CO')}
        </span>
        <button
          onClick={onOpen}
          className="border border-gray-300 hover:border-black text-black hover:bg-black hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
        >
          Gestionar
        </button>
      </div>
    </div>
  );
}
