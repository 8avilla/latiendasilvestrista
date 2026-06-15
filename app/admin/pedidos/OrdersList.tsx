'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Order, Product, OrderStatus, SalesChannel } from '@/types';
import { DEPARTMENTS } from '@/lib/colombia';
import { ClientDateTime } from '@/components/ClientDateTime';

interface OrdersListProps {
  orders: Order[];
  products: Product[];
}

export default function OrdersList({ orders, products }: OrdersListProps) {
  // Mantener estado local para actualizaciones rápidas e interactivas
  const [prevOrders, setPrevOrders] = useState<Order[]>(orders);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  if (orders !== prevOrders) {
    setPrevOrders(orders);
    setLocalOrders(orders);
  }

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | SalesChannel>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'PRICE_DESC' | 'PRICE_ASC'>('NEWEST');

  // Estados para el panel de edición de pedido existente (Drawer 1)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>('PEDIDO SIN CONFIRMAR');
  const [editChannel, setEditChannel] = useState<SalesChannel>('Tienda Online');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quickDeleteId, setQuickDeleteId] = useState<string | null>(null);
  const [quickDeleting, setQuickDeleting] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(orderId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = filteredOrders.map(o => o.orderId);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds));
  }

  // Estados para creación manual de un nuevo pedido (Drawer 2)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [newOrderShipping, setNewOrderShipping] = useState({
    name: '',
    phone: '',
    email: '',
    department: '',
    city: '',
    address: '',
  });

  const newOrderDeptMunicipalities = useMemo(
    () => DEPARTMENTS.find(d => d.name === newOrderShipping.department)?.municipalities ?? [],
    [newOrderShipping.department]
  );
  const [newOrderItems, setNewOrderItems] = useState<{
    product: Product;
    quantity: number;
    selections: Record<string, string>;
  }[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('PAGADO');
  const [newOrderChannel, setNewOrderChannel] = useState<SalesChannel>('Whatsapp');
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');

  // Obtener producto seleccionado para añadir en pedido manual
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProdId) || null;
  }, [products, selectedProdId]);

  const uniqueCategories = useMemo(
    () => [...new Set(products.map(p => p.category))].sort(),
    [products]
  );

  const filteredForSelector = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = !productCategoryFilter || p.category === productCategoryFilter;
      const matchesSearch = !productSearch.trim() ||
        p.name.toLowerCase().includes(productSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, productSearch, productCategoryFilter]);

  // Precargar opciones de variante y resetear cantidad al seleccionar producto
  function handleProductChange(prodId: string) {
    setSelectedProdId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      const initialVariants: Record<string, string> = {};
      prod.variantGroups?.forEach((vg) => {
        if (vg.options && vg.options.length > 0) {
          initialVariants[vg.name] = vg.options[0];
        }
      });
      setSelectedVariants(initialVariants);
    } else {
      setSelectedVariants({});
    }
    setSelectedQty(1);
  }

  // Añadir ítem al pedido manual
  function handleAddItem() {
    if (!selectedProduct) return;
    
    const existsIdx = newOrderItems.findIndex(
      (item) =>
        item.product.id === selectedProduct.id &&
        JSON.stringify(item.selections) === JSON.stringify(selectedVariants)
    );

    if (existsIdx > -1) {
      setNewOrderItems((prev) => {
        const updated = [...prev];
        updated[existsIdx].quantity += selectedQty;
        return updated;
      });
    } else {
      setNewOrderItems((prev) => [
        ...prev,
        {
          product: selectedProduct,
          quantity: selectedQty,
          selections: { ...selectedVariants },
        },
      ]);
    }

    setSelectedProdId('');
  }

  // Remover ítem del pedido manual
  function handleRemoveItem(idx: number) {
    setNewOrderItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Calcular total de pedido manual
  const newOrderTotal = useMemo(() => {
    return newOrderItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [newOrderItems]);

  const trashCount = useMemo(() => localOrders.filter(o => o.deleted).length, [localOrders]);

  const metrics = useMemo(() => {
    const TZ = 'America/Bogota';
    const now = new Date();
    const todayStr = now.toLocaleDateString('es-CO', { timeZone: TZ });
    const thisMonth = now.toLocaleString('es-CO', { timeZone: TZ, month: 'numeric' });
    const thisYear = new Date(now.toLocaleString('en-US', { timeZone: TZ })).getFullYear();

    const paidStatuses = ['PAGADO', 'PEDIDO TOMADO', 'ENVIADO'];
    const active = localOrders.filter(o => !o.deleted);
    const paidOrders = active.filter(o => paidStatuses.includes(o.status));

    const todaySales = paidOrders
      .filter(o => new Date(o.createdAt).toLocaleDateString('es-CO', { timeZone: TZ }) === todayStr)
      .reduce((s, o) => s + o.totalPrice, 0);

    const monthSales = paidOrders.filter(o => {
      const d = new Date(o.createdAt);
      const m = d.toLocaleString('es-CO', { timeZone: TZ, month: 'numeric' });
      const y = new Date(d.toLocaleString('en-US', { timeZone: TZ })).getFullYear();
      return m === thisMonth && y === thisYear;
    }).reduce((s, o) => s + o.totalPrice, 0);

    const pending = active.filter(o => o.status === 'PAGADO' || o.status === 'PEDIDO TOMADO').length;
    const avgTicket = paidOrders.length > 0
      ? Math.round(paidOrders.reduce((s, o) => s + o.totalPrice, 0) / paidOrders.length)
      : 0;

    return { todaySales, monthSales, pending, avgTicket, paidCount: paidOrders.length };
  }, [localOrders]);

  // Calcular conteos de cada estado (solo pedidos activos)
  const counts = useMemo(() => {
    const active = localOrders.filter(o => !o.deleted);
    return {
      ALL: active.length,
      'PEDIDO SIN CONFIRMAR': active.filter((o) => o.status === 'PEDIDO SIN CONFIRMAR').length,
      PAGADO: active.filter((o) => o.status === 'PAGADO').length,
      'PEDIDO TOMADO': active.filter((o) => o.status === 'PEDIDO TOMADO').length,
      CANCELADO: active.filter((o) => o.status === 'CANCELADO').length,
      ENVIADO: active.filter((o) => o.status === 'ENVIADO').length,
      'PAGO SIN CONFIRMAR': active.filter((o) => o.status === 'PAGO SIN CONFIRMAR').length,
    };
  }, [localOrders]);

  // Filtrado y ordenamiento de pedidos
  const filteredOrders = useMemo(() => {
    const source = showTrash
      ? localOrders.filter(o => o.deleted)
      : localOrders.filter(o => !o.deleted);

    return source
      .filter((order) => {
        // Filtro por Estado
        if (statusFilter !== 'ALL' && order.status !== statusFilter) {
          return false;
        }

        // Filtro por Canal de Venta
        if (channelFilter !== 'ALL' && order.salesChannel !== channelFilter) {
          return false;
        }

        // Filtro por rango de fechas
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (new Date(order.createdAt) < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (new Date(order.createdAt) > to) return false;
        }

        // Búsqueda por Texto Libre
        if (search.trim() !== '') {
          const query = search.toLowerCase();
          const matchesId = order.orderId.toLowerCase().includes(query);
          const matchesName = order.shippingDetails?.name?.toLowerCase().includes(query);
          const matchesEmail = order.shippingDetails?.email?.toLowerCase().includes(query);
          const matchesPhone = order.shippingDetails?.phone?.includes(query);
          const matchesCity = order.shippingDetails?.city?.toLowerCase().includes(query);
          const matchesItems = order.items.some((item) =>
            item.product?.name?.toLowerCase().includes(query)
          );

          if (!matchesId && !matchesName && !matchesEmail && !matchesPhone && !matchesCity && !matchesItems) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'PRICE_DESC') {
          return b.totalPrice - a.totalPrice;
        }
        if (sortBy === 'PRICE_ASC') {
          return a.totalPrice - b.totalPrice;
        }
        return 0;
      });
  }, [localOrders, showTrash, search, statusFilter, channelFilter, sortBy, dateFrom, dateTo]);

  // Abrir y precargar Drawer de Edición
  function openDrawer(order: Order) {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditChannel(order.salesChannel || 'Tienda Online');
    setEditNotes(order.notes || '');
    setConfirmDelete(false);
    setIsDrawerOpen(true);
  }

  // Cerrar Drawer de Edición
  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingOrder(null);
  }

  // Abrir Drawer de Creación Manual
  function openCreateDrawer() {
    setNewOrderShipping({
      name: '',
      phone: '',
      email: '',
      department: '',
      city: '',
      address: '',
    });
    setNewOrderItems([]);
    setSelectedProdId('');
    setProductSearch('');
    setProductCategoryFilter('');
    setNewOrderStatus('PAGADO');
    setNewOrderChannel('Whatsapp');
    setNewOrderNotes('');
    setIsCreateDrawerOpen(true);
  }

  // Cerrar Drawer de Creación Manual
  function closeCreateDrawer() {
    setIsCreateDrawerOpen(false);
  }

  // Guardar Cambios en MongoDB y LocalState
  async function handleSave() {
    if (!editingOrder) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: editingOrder.orderId,
          status: editStatus,
          salesChannel: editChannel,
          notes: editNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el pedido');
      }

      setLocalOrders((prev) =>
        prev.map((o) =>
          o.orderId === editingOrder.orderId
            ? { ...o, status: editStatus, salesChannel: editChannel, notes: editNotes, updatedAt: new Date().toISOString() }
            : o
        )
      );
      closeDrawer();
    } catch (err) {
      alert('Error al guardar los cambios del pedido. Intente de nuevo.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickDelete(orderId: string) {
    setQuickDeleting(true);
    try {
      const res = await fetch(`/api/orders?orderId=${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLocalOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, deleted: true } : o));
    } catch {
      alert('Error al mover el pedido a la papelera.');
    } finally {
      setQuickDeleting(false);
      setQuickDeleteId(null);
    }
  }

  // Mover pedido a la papelera
  async function handleDelete() {
    if (!editingOrder) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/orders?orderId=${editingOrder.orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al mover el pedido a la papelera');
      }

      setLocalOrders((prev) => prev.map((o) =>
        o.orderId === editingOrder.orderId ? { ...o, deleted: true } : o
      ));
      closeDrawer();
    } catch (err) {
      alert('Error al mover el pedido a la papelera. Intente de nuevo.');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleQuickTaken(orderId: string) {
    setTakingId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'PEDIDO TOMADO' }),
      });
      if (!res.ok) throw new Error();
      setLocalOrders(prev => prev.map(o =>
        o.orderId === orderId ? { ...o, status: 'PEDIDO TOMADO' as const } : o
      ));
    } catch {
      alert('Error al actualizar el pedido.');
    } finally {
      setTakingId(null);
    }
  }

  async function handleRestore(orderId: string) {
    setRestoringId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, deleted: false }),
      });
      if (!res.ok) throw new Error();
      setLocalOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, deleted: false } : o));
    } catch {
      alert('Error al restaurar el pedido.');
    } finally {
      setRestoringId(null);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      // 1. Re-fetch todos los pedidos de la DB
      const ordersRes = await fetch('/api/orders');
      if (!ordersRes.ok) throw new Error('Error al cargar pedidos');
      const raw = await ordersRes.json();

      // Mapear igual que el server component de la página
      const fresh = (raw as Record<string, unknown>[]).map((doc) => ({
        _id: String(doc._id),
        orderId: doc.orderId as string,
        items: doc.items as Order['items'],
        totalPrice: doc.totalPrice as number,
        shippingPrice: (doc.shippingPrice as number) ?? 0,
        shippingDetails: doc.shippingDetails as Order['shippingDetails'],
        paymentMethod: doc.paymentMethod as Order['paymentMethod'],
        status: doc.status as Order['status'],
        salesChannel: (doc.salesChannel as Order['salesChannel']) ?? 'Tienda Online',
        notes: (doc.notes as string) ?? '',
        transactionDetails: doc.transactionDetails as Order['transactionDetails'],
        createdAt: doc.createdAt as string,
        updatedAt: doc.updatedAt as string,
        deleted: doc.deleted === true,
      }));

      // 2. Sincronizar PAGO SIN CONFIRMAR con Bold (en paralelo)
      const syncRes = await fetch('/api/admin/sync-bold', { method: 'POST' });
      const syncData = syncRes.ok ? await syncRes.json() : { updated: 0, results: [] };

      // Aplicar cambios de Bold sobre los pedidos frescos
      const syncMap = new Map<string, string>(
        (syncData.results ?? [])
          .filter((r: { orderId: string; newStatus: string | null }) => r.newStatus)
          .map((r: { orderId: string; newStatus: string }) => [r.orderId, r.newStatus])
      );

      const merged = fresh.map((o) =>
        syncMap.has(o.orderId) ? { ...o, status: syncMap.get(o.orderId) as Order['status'] } : o
      );

      setLocalOrders(merged);
      setLastRefresh(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));

      if (syncData.updated > 0) {
        alert(`Actualización completa. ${syncData.updated} pedido(s) actualizados desde Bold.`);
      }
    } catch (err) {
      alert('Error al actualizar los pedidos. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }

  // Crear Pedido Manual
  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    const { name, phone, address, department, city } = newOrderShipping;
    if (!name.trim() || !phone.trim() || !address.trim() || !department.trim() || !city.trim()) {
      alert('Por favor completa los campos de envío obligatorios (Nombre, Celular, Dirección, Departamento, Ciudad).');
      return;
    }

    if (newOrderItems.length === 0) {
      alert('Por favor agrega al menos un producto al pedido.');
      return;
    }

    setIsCreating(true);
    try {
      const formattedItems = newOrderItems.map((item) => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          category: item.product.category,
          price: item.product.price,
          images: item.product.images,
        },
        quantity: item.quantity,
        selections: item.selections,
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: formattedItems,
          totalPrice: newOrderTotal,
          shippingDetails: newOrderShipping,
          paymentMethod: newOrderChannel === 'Whatsapp' ? 'WHATSAPP' : 'MANUAL',
          status: newOrderStatus,
          salesChannel: newOrderChannel,
          notes: newOrderNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al registrar el pedido manual');
      }

      const data = await response.json();
      const newOrder = data.order as Order;

      setLocalOrders((prev) => [newOrder, ...prev]);
      closeCreateDrawer();
    } catch (err) {
      alert('Error al registrar el pedido. Intente de nuevo.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  function handlePrintGuides() {
    const selected = localOrders.filter(o => selectedIds.has(o.orderId));
    if (selected.length === 0) return;

    const guidesHtml = selected.map(order => {
      const items = order.items.map(i => {
        const vars = i.selections ? ` (${Object.values(i.selections).join(' / ')})` : '';
        return `<li>${i.quantity}× ${i.product.name}${vars}</li>`;
      }).join('');

      const subtotal = order.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const shipping = order.shippingPrice ?? 0;
      const date = new Date(order.createdAt).toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric',
      });

      return `
        <div class="guide">
          <div class="guide-head">
            <div>
              <div class="store">La Tienda Silvestrista</div>
              <div class="date">${date}</div>
            </div>
            <div class="order-id">${order.orderId}</div>
          </div>

          <div class="section">
            <div class="lbl">Destinatario</div>
            <div class="name">${order.shippingDetails.name}</div>
            <div class="phone">${order.shippingDetails.phone}</div>
            <div>${order.shippingDetails.address}</div>
            <div>${order.shippingDetails.city}${order.shippingDetails.department ? ', ' + order.shippingDetails.department : ''}</div>
            ${order.shippingDetails.email ? `<div class="email">${order.shippingDetails.email}</div>` : ''}
          </div>

          <div class="section">
            <div class="lbl">Productos</div>
            <ul class="items">${items}</ul>
          </div>

          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>$${subtotal.toLocaleString('es-CO')}</span></div>
            <div class="totals-row"><span>Domicilio</span><span>${shipping === 0 ? 'Gratis' : '$' + shipping.toLocaleString('es-CO')}</span></div>
            <div class="totals-row total-row"><span>Total</span><span>$${order.totalPrice.toLocaleString('es-CO')} COP</span></div>
          </div>

          ${order.notes ? `<div class="notes"><strong>Notas:</strong> ${order.notes}</div>` : ''}
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Guías de envío — La Tienda Silvestrista</title>
  <style>
    @page { margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
    .guide {
      border: 1.5px solid #000;
      border-radius: 3px;
      padding: 4mm;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }
    .guide-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3mm;
    }
    .store { font-size: 12px; font-weight: bold; }
    .date { font-size: 9px; color: #666; margin-top: 1mm; }
    .order-id {
      font-family: monospace;
      font-size: 9px;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .section { display: flex; flex-direction: column; gap: 1mm; }
    .lbl {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      font-weight: bold;
    }
    .name { font-size: 16px; font-weight: bold; }
    .phone { font-size: 14px; font-weight: 600; }
    .email { color: #666; font-size: 10px; }
    .items { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5mm; }
    .items li::before { content: "• "; }
    .totals {
      border-top: 1px solid #ddd;
      padding-top: 2mm;
      display: flex;
      flex-direction: column;
      gap: 1mm;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #555;
    }
    .total-row {
      font-size: 12px;
      font-weight: bold;
      color: #000;
      border-top: 1px solid #ddd;
      padding-top: 1.5mm;
      margin-top: 0.5mm;
    }
    .notes {
      font-size: 9px;
      color: #555;
      border-top: 1px dashed #ddd;
      padding-top: 2mm;
    }
  </style>
</head>
<body>
  <div class="grid">${guidesHtml}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function handleExportCSV() {
    const headers = [
      'ID Pedido', 'Fecha', 'Estado', 'Canal',
      'Cliente', 'Teléfono', 'Email', 'Departamento', 'Ciudad', 'Dirección',
      'Artículos', 'Subtotal', 'Domicilio', 'Total', 'Notas',
    ];

    const rows = filteredOrders.map(o => {
      const subtotal = o.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const items = o.items
        .map(i => {
          const vars = i.selections ? Object.values(i.selections).join('/') : '';
          return `${i.quantity}x ${i.product.name}${vars ? ` (${vars})` : ''}`;
        })
        .join(' | ');
      return [
        o.orderId,
        new Date(o.createdAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
        o.status,
        o.salesChannel || '',
        o.shippingDetails.name,
        o.shippingDetails.phone,
        o.shippingDetails.email || '',
        o.shippingDetails.department || '',
        o.shippingDetails.city,
        o.shippingDetails.address,
        items,
        subtotal,
        o.shippingPrice ?? 0,
        o.totalPrice,
        (o.notes || '').replace(/\n/g, ' '),
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Manejar Escape para cerrar paneles
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isDrawerOpen && !isSaving && !isDeleting) closeDrawer();
        if (isCreateDrawerOpen && !isCreating) closeCreateDrawer();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isSaving, isDeleting, isCreateDrawerOpen, isCreating]);

  return (
    <div>
      {/* Panel de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Ventas hoy</p>
          <p className="text-xl font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
            ${metrics.todaySales.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Ventas del mes</p>
          <p className="text-xl font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
            ${metrics.monthSales.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Pedidos por atender</p>
          <p className="text-xl font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
            {metrics.pending}
            <span className="text-xs font-normal text-gray-400 ml-1.5">pedido{metrics.pending !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Ticket promedio</p>
          <p className="text-xl font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
            ${metrics.avgTicket.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {/* Toggle Activos / Papelera */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setShowTrash(false)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            !showTrash ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          }`}
        >
          Pedidos activos
        </button>
        <button
          onClick={() => setShowTrash(true)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            showTrash ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Papelera
          {trashCount > 0 && (
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
              showTrash ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
            }`}>
              {trashCount}
            </span>
          )}
        </button>
      </div>

      {/* Contenedor de Filtros Premium */}
      {!showTrash && <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6 flex flex-col gap-4">
        {/* Fila superior: Búsqueda y Filtros de Selección */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por ID, cliente, celular, ciudad o artículo..."
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black font-normal placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="NEWEST">Más recientes</option>
              <option value="OLDEST">Más antiguos</option>
              <option value="PRICE_DESC">Mayor total</option>
              <option value="PRICE_ASC">Menor total</option>
            </select>
            
            <select
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}
            >
              <option value="ALL">Canal: Todos</option>
              <option value="Whatsapp">WhatsApp</option>
              <option value="Tienda Online">Tienda Online</option>
              <option value="Redes sociales">Redes sociales</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
        </div>

        {/* Fila de fechas */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Periodo:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
          />
          <span className="text-xs text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
            >
              ✕ limpiar
            </button>
          )}
        </div>

        {/* Fila inferior: Filtros de Estado */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PEDIDO SIN CONFIRMAR', 'PAGADO', 'PEDIDO TOMADO', 'CANCELADO', 'ENVIADO', 'PAGO SIN CONFIRMAR'] as const).map((st) => {
              const label = {
                ALL: 'Todos',
                'PEDIDO SIN CONFIRMAR': 'Ped. sin confirmar',
                PAGADO: 'Pagados',
                'PEDIDO TOMADO': 'Pedido tomado',
                CANCELADO: 'Cancelados',
                ENVIADO: 'Enviados',
                'PAGO SIN CONFIRMAR': 'Pago sin confirmar',
              }[st];

              const activeStyles = {
                ALL: 'bg-black text-white border-black',
                'PEDIDO SIN CONFIRMAR': 'bg-blue-600 text-white border-blue-600',
                PAGADO: 'bg-green-600 text-white border-green-600',
                'PEDIDO TOMADO': 'bg-orange-500 text-white border-orange-500',
                CANCELADO: 'bg-gray-600 text-white border-gray-600',
                ENVIADO: 'bg-purple-600 text-white border-purple-600',
                'PAGO SIN CONFIRMAR': 'bg-yellow-500 text-white border-yellow-500',
              }[st];

              const inactiveStyles = {
                ALL: 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200',
                'PEDIDO SIN CONFIRMAR': 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100',
                PAGADO: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100',
                'PEDIDO TOMADO': 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100',
                CANCELADO: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-100',
                ENVIADO: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100',
                'PAGO SIN CONFIRMAR': 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-100',
              }[st];

              const isActive = statusFilter === st;

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive ? activeStyles : inactiveStyles
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200/50 text-gray-600'
                    }`}
                  >
                    {counts[st]}
                  </span>
                </button>
              );
            })}
          </div>

          {(search.trim() !== '' || statusFilter !== 'ALL' || channelFilter !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setChannelFilter('ALL');
                setSortBy('NEWEST');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1.5 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>}

      {/* Barra de selección — aparece cuando hay pedidos marcados */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-black text-white rounded-xl px-5 py-3 mb-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-white/60 hover:text-white transition-colors underline underline-offset-2"
            >
              Deseleccionar todo
            </button>
          </div>
          <button
            onClick={handlePrintGuides}
            className="flex items-center gap-2 bg-white text-black hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir guías
          </button>
        </div>
      )}

      {/* Resultados de Pedidos y Botones de acción */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          {filteredOrders.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.orderId))}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 accent-black cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 group-hover:text-black transition-colors">Todos</span>
            </label>
          )}
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
          </span>
          {lastRefresh && (
            <span className="text-[10px] text-gray-400">
              · actualizado {lastRefresh}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            title="Exportar pedidos visibles a CSV"
            className="flex items-center gap-1.5 border border-gray-200 hover:border-black text-gray-600 hover:text-black disabled:opacity-40 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Actualizar pedidos y sincronizar con Bold"
            className="flex items-center gap-1.5 border border-gray-200 hover:border-black text-gray-600 hover:text-black disabled:opacity-50 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            onClick={openCreateDrawer}
            className="bg-black hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Crear Pedido
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center bg-white shadow-sm">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium mb-1">No se encontraron pedidos</p>
          <p className="text-gray-400 text-xs px-4">Intenta ajustar los criterios de búsqueda o filtros de estado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredOrders.map((order) => {
            const isUnconfirmed = order.status === 'PEDIDO SIN CONFIRMAR';
            const isPaid = order.status === 'PAGADO';
            const isTaken = order.status === 'PEDIDO TOMADO';
            const isCancelled = order.status === 'CANCELADO';
            const isShipped = order.status === 'ENVIADO';
            const isPendingPayment = order.status === 'PAGO SIN CONFIRMAR';

            return (
              <div key={order._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Header del pedido */}
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.orderId)}
                      onChange={() => toggleSelect(order.orderId)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-black cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-mono bg-white border border-gray-200 px-2.5 py-1 text-black font-semibold rounded">
                      {order.orderId}
                    </span>
                    <span className="text-xs text-gray-400">
                      <ClientDateTime date={order.createdAt} />
                    </span>
                    <span className="text-xs text-gray-400 border-l border-gray-200 pl-4">
                      Canal: <strong className="text-black font-semibold">{order.salesChannel || 'Otros'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.deleted && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-red-50 text-red-500 border border-red-200 px-3 py-1 rounded-full line-through opacity-70">
                        Eliminado
                      </span>
                    )}
                    {isUnconfirmed && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                        Pedido sin confirmar
                      </span>
                    )}
                    {isPaid && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                        Pagado
                      </span>
                    )}
                    {isTaken && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full">
                        Pedido tomado
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-gray-50 text-gray-500 border border-gray-200 px-3 py-1 rounded-full">
                        Cancelado
                      </span>
                    )}
                    {isShipped && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                        Enviado
                      </span>
                    )}
                    {isPendingPayment && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full animate-pulse">
                        Pago sin confirmar
                      </span>
                    )}
                    {!isUnconfirmed && !isPaid && !isTaken && !isCancelled && !isShipped && !isPendingPayment && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full">
                        Fallido
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalles */}
                <div className="p-6 grid md:grid-cols-3 gap-6">
                  {/* Columna 1: Cliente y Envío */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">
                      Datos de Envío
                    </h3>
                    <div className="text-xs text-gray-700 flex flex-col gap-1.5">
                      <p><strong className="text-black">Nombre:</strong> {order.shippingDetails.name}</p>
                      <p><strong className="text-black">Dirección:</strong> {order.shippingDetails.address}</p>
                      {order.shippingDetails.department && (
                        <p><strong className="text-black">Departamento:</strong> {order.shippingDetails.department}</p>
                      )}
                      <p><strong className="text-black">Ciudad:</strong> {order.shippingDetails.city}</p>
                      <p><strong className="text-black">Celular:</strong> {order.shippingDetails.phone}</p>
                      <p><strong className="text-black">Email:</strong> {order.shippingDetails.email}</p>
                    </div>
                  </div>

                  {/* Columna 2: Ítems del Pedido */}
                  <div className="md:col-span-2 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">
                        Artículos
                      </h3>
                      <ul className="divide-y divide-gray-100">
                        {order.items.map((item, idx) => {
                          const selections = item.selections
                            ? Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : '';
                          return (
                            <li key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Thumbnail del Producto */}
                                <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                  {item.product.images && item.product.images[0] ? (
                                    <Image 
                                      src={item.product.images[0]} 
                                      alt={item.product.name} 
                                      fill 
                                      sizes="40px"
                                      className="object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[7px] text-gray-400">
                                      Sin foto
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-black block truncate">
                                    {item.quantity}x {item.product.name}
                                  </span>
                                  {selections && (
                                    <span className="text-gray-400 block mt-0.5 truncate">{selections}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-black font-semibold shrink-0">
                                ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Subtotal productos</span>
                        <span className="font-medium text-gray-600">
                          ${order.items.reduce((s, i) => s + i.product.price * i.quantity, 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Domicilio</span>
                        <span className="font-medium text-gray-600">
                          {(order.shippingPrice ?? 0) === 0
                            ? <span className="text-green-600 font-semibold">Gratis</span>
                            : `$${(order.shippingPrice ?? 0).toLocaleString('es-CO')}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 mt-0.5">
                        <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">Total</span>
                        <span className="text-lg font-bold text-red-600" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                          ${order.totalPrice.toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalles de transacción de Bold.co o WhatsApp */}
                {order.transactionDetails && (
                  <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-2.5 flex flex-wrap gap-x-6 text-[10px] text-gray-400 font-mono">
                    <span>ID PAGO BOLD: {order.transactionDetails.paymentId}</span>
                    <span>TIPO NOTIFICACIÓN: {order.transactionDetails.payloadType}</span>
                    {order.transactionDetails.time && (
                      <span>NANO-TIMESTAMP: {order.transactionDetails.time}</span>
                    )}
                  </div>
                )}
                {order.paymentMethod === 'WHATSAPP' && (
                  <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-2.5 flex flex-wrap gap-x-6 text-[10px] text-blue-600 font-mono">
                    <span>MÉTODO DE PAGO: WHATSAPP (SOLICITUD CHAT DIRECTO)</span>
                  </div>
                )}
                {order.paymentMethod === 'MANUAL' && (
                  <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-2.5 flex flex-wrap gap-x-6 text-[10px] text-red-600 font-mono">
                    <span>MÉTODO DE PAGO: CREACIÓN MANUAL (ADMINISTRADOR)</span>
                  </div>
                )}
                
                {/* Notas internas / Guía de envío */}
                {order.notes && (
                  <div className="bg-red-50/20 border-t border-gray-100 px-6 py-3 text-xs text-gray-700">
                    <strong className="text-black">Notas internas / Guía de envío:</strong>
                    <p className="mt-1 whitespace-pre-wrap font-light text-gray-600 leading-relaxed">{order.notes}</p>
                  </div>
                )}

                {/* Acciones del Administrador */}
                <div className="bg-gray-50/30 border-t border-gray-100 px-6 py-3.5 flex items-center justify-between gap-3">
                  {showTrash ? (
                    /* Vista papelera: solo restaurar */
                    <button
                      onClick={() => handleRestore(order.orderId)}
                      disabled={restoringId === order.orderId}
                      className="flex items-center gap-1.5 text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors text-xs font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {restoringId === order.orderId ? 'Restaurando...' : 'Restaurar pedido'}
                    </button>
                  ) : (
                    /* Vista activos: eliminar (soft) + gestionar */
                    <>
                      <div className="flex items-center gap-2">
                        {isPaid && (
                          <button
                            onClick={() => handleQuickTaken(order.orderId)}
                            disabled={takingId === order.orderId}
                            className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            {takingId === order.orderId ? 'Actualizando...' : 'Pedido tomado'}
                          </button>
                        )}
                        {quickDeleteId === order.orderId ? (
                          <>
                            <span className="text-xs text-red-600 font-medium">¿Mover a papelera?</span>
                            <button
                              onClick={() => handleQuickDelete(order.orderId)}
                              disabled={quickDeleting}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            >
                              {quickDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                            <button
                              onClick={() => setQuickDeleteId(null)}
                              disabled={quickDeleting}
                              className="border border-gray-200 hover:border-black text-gray-500 hover:text-black px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setQuickDeleteId(order.orderId)}
                            className="flex items-center gap-1.5 text-gray-400 hover:text-red-600 transition-colors text-xs font-medium"
                            title="Mover a papelera"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Eliminar
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => openDrawer(order)}
                        className="border border-gray-300 hover:border-black text-black hover:bg-black hover:text-white px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Gestionar Pedido
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer de Gestión Deslizable (Editar) */}
      {isDrawerOpen && editingOrder && (
        <>
          {/* Backdrop con Blur */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
            onClick={() => {
              if (!isSaving && !isDeleting) closeDrawer();
            }}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 flex flex-col border-l border-gray-200 shadow-2xl animate-slide-in text-black">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold italic text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                  Gestionar Pedido
                </h2>
                <p className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase tracking-wider">
                  ID: {editingOrder.orderId}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                disabled={isSaving || isDeleting}
                className="text-gray-400 hover:text-black transition-colors p-1 disabled:opacity-50"
                aria-label="Cerrar panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Información del Cliente */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Datos de Envío
                </h3>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs space-y-2 text-gray-700">
                  <p><strong className="text-black">Nombre:</strong> {editingOrder.shippingDetails.name}</p>
                  <div className="flex items-center gap-2">
                    <p><strong className="text-black">Celular:</strong> {editingOrder.shippingDetails.phone}</p>
                    <a
                      href={`https://wa.me/57${editingOrder.shippingDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${editingOrder.shippingDetails.name.split(' ')[0]}, te escribimos de La Tienda Silvestrista sobre tu pedido ${editingOrder.orderId}. `)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z"/>
                      </svg>
                      WhatsApp
                    </a>
                  </div>
                  <p><strong className="text-black">Email:</strong> {editingOrder.shippingDetails.email}</p>
                  {editingOrder.shippingDetails.department && (
                    <p><strong className="text-black">Departamento:</strong> {editingOrder.shippingDetails.department}</p>
                  )}
                  <p><strong className="text-black">Ciudad:</strong> {editingOrder.shippingDetails.city}</p>
                  <p><strong className="text-black">Dirección:</strong> {editingOrder.shippingDetails.address}</p>
                </div>
              </div>

              {/* Formulario de Estado */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Estado del Pedido
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                  disabled={isSaving || isDeleting}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                >
                  <option value="PEDIDO SIN CONFIRMAR">Pedido sin confirmar</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="PEDIDO TOMADO">Pedido tomado</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="PAGO SIN CONFIRMAR">Pago sin confirmar</option>
                </select>
              </div>

              {/* Formulario de Canal */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Canal de Venta
                </label>
                <select
                  value={editChannel}
                  onChange={(e) => setEditChannel(e.target.value as SalesChannel)}
                  disabled={isSaving || isDeleting}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                >
                  <option value="Whatsapp">WhatsApp</option>
                  <option value="Tienda Online">Tienda Online</option>
                  <option value="Redes sociales">Redes sociales</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {/* Formulario de Notas */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Notas de Envío / Guía de Transporte
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={isSaving || isDeleting}
                  placeholder="Escribe la transportadora, número de guía de envío u observaciones internas de este pedido..."
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black resize-none"
                />
              </div>

              {/* Artículos de Compra */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Artículos Facturados
                </h3>
                <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  {editingOrder.items.map((item, idx) => {
                    const selections = item.selections
                      ? Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(', ')
                      : '';
                    return (
                      <li key={idx} className="py-2.5 flex justify-between text-xs first:pt-0 last:pb-0">
                        <div className="pr-4 min-w-0">
                          <span className="font-semibold text-black block truncate">{item.quantity}x {item.product.name}</span>
                          {selections && (
                            <span className="text-gray-400 block mt-0.5 truncate">{selections}</span>
                          )}
                        </div>
                        <span className="text-black font-semibold shrink-0">
                          ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Resumen de precios */}
                <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2.5 text-xs text-gray-500">
                    <span>Subtotal productos</span>
                    <span className="font-medium text-black">
                      ${editingOrder.items.reduce((s, i) => s + i.product.price * i.quantity, 0).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 text-xs text-gray-500 border-t border-gray-100">
                    <span>Domicilio</span>
                    <span className="font-medium text-black">
                      {(editingOrder.shippingPrice ?? 0) === 0
                        ? <span className="text-green-600 font-semibold">Gratis</span>
                        : `$${(editingOrder.shippingPrice ?? 0).toLocaleString('es-CO')}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-black">Total</span>
                    <span className="text-base font-bold text-red-600" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${editingOrder.totalPrice.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!isSaving && !isDeleting) closeDrawer();
                  }}
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 bg-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              {/* Sección de Eliminación */}
              <div className="pt-4 border-t border-gray-200">
                {confirmDelete ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <p className="text-[11px] text-red-800 font-medium leading-relaxed">
                      ⚠️ El pedido se moverá a la papelera. Podrás restaurarlo desde la vista de Papelera.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting || isSaving}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {isDeleting ? 'Moviendo...' : 'Sí, a la papelera'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={isDeleting || isSaving}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={isSaving || isDeleting}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center justify-center gap-1.5 transition-all mx-auto cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Pedido
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Drawer de Creación Manual (Drawer 2) */}
      {isCreateDrawerOpen && (
        <>
          {/* Backdrop con Blur */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
            onClick={() => {
              if (!isCreating) closeCreateDrawer();
            }}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 flex flex-col border-l border-gray-200 shadow-2xl animate-slide-in text-black">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-semibold italic text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                  Crear Nuevo Pedido
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
                  Registro manual en el panel de administración
                </p>
              </div>
              <button
                onClick={closeCreateDrawer}
                disabled={isCreating}
                className="text-gray-400 hover:text-black transition-colors p-1 disabled:opacity-50"
                aria-label="Cerrar panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Sección 1: Datos de Envío */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 pb-1.5">
                  1. Datos del Cliente y Envío
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOrderShipping.name}
                      onChange={(e) => setNewOrderShipping(prev => ({ ...prev, name: e.target.value }))}
                      disabled={isCreating}
                      placeholder="Ej. Juan Pérez"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Celular / Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newOrderShipping.phone}
                      onChange={(e) => setNewOrderShipping(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={isCreating}
                      placeholder="Ej. 3001234567"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={newOrderShipping.email}
                      onChange={(e) => setNewOrderShipping(prev => ({ ...prev, email: e.target.value }))}
                      disabled={isCreating}
                      placeholder="Ej. juan@correo.com"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Departamento *
                    </label>
                    <select
                      required
                      value={newOrderShipping.department}
                      onChange={(e) => setNewOrderShipping(prev => ({ ...prev, department: e.target.value, city: '' }))}
                      disabled={isCreating}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    >
                      <option value="">Selecciona un departamento</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Ciudad *
                    </label>
                    <select
                      required
                      value={newOrderShipping.city}
                      onChange={(e) => setNewOrderShipping(prev => ({ ...prev, city: e.target.value }))}
                      disabled={isCreating || !newOrderShipping.department}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Selecciona una ciudad</option>
                      {newOrderDeptMunicipalities.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOrderShipping.address}
                      onChange={(e) => setNewOrderShipping(prev => ({ ...prev, address: e.target.value }))}
                      disabled={isCreating}
                      placeholder="Ej. Calle 123 # 45-67 Apt 101"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Selección de Artículos */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 pb-1.5">
                  2. Selección de Productos
                </h3>
                
                {/* Selector de Producto */}
                <div className="space-y-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
                  {/* Filtros */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setSelectedProdId(''); }}
                        disabled={isCreating}
                        placeholder="Buscar por nombre..."
                        className="block w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={productCategoryFilter}
                        onChange={e => { setProductCategoryFilter(e.target.value); setSelectedProdId(''); }}
                        disabled={isCreating}
                        className="block w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                      >
                        <option value="">Todas las categorías</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Select de producto filtrado */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                        Elegir Producto
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {filteredForSelector.length} de {products.length}
                      </span>
                    </div>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      disabled={isCreating}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    >
                      <option value="">-- Selecciona un producto --</option>
                      {filteredForSelector.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${p.price.toLocaleString('es-CO')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProduct && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {/* Opciones de Variantes */}
                      {selectedProduct.variantGroups?.map((vg) => (
                        <div key={vg.name}>
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                            {vg.name}
                          </label>
                          <select
                            value={selectedVariants[vg.name] || ''}
                            onChange={(e) =>
                              setSelectedVariants((prev) => ({ ...prev, [vg.name]: e.target.value }))
                            }
                            disabled={isCreating}
                            className="block w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                          >
                            {vg.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}

                      {/* Cantidad */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedQty}
                          onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={isCreating}
                          className="block w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                        />
                      </div>

                      <div className="col-span-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="w-full bg-black hover:bg-red-600 text-white py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Añadir al Pedido
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de Artículos Agregados */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                    Artículos en la Orden ({newOrderItems.length})
                  </h4>
                  {newOrderItems.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-xs text-gray-400 bg-gray-50/20">
                      No has agregado ningún artículo aún.
                    </div>
                  ) : (
                    <ul className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden bg-white shadow-xs">
                      {newOrderItems.map((item, idx) => {
                        const selections = Object.entries(item.selections)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ');
                        return (
                          <li key={idx} className="p-3 flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative w-8 h-8 rounded overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                {item.product.images?.[0] ? (
                                  <Image
                                    src={item.product.images[0]}
                                    alt={item.product.name}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[6px] text-gray-400">
                                    Sin foto
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-black block truncate font-medium">
                                  {item.quantity}x {item.product.name}
                                </span>
                                {selections && (
                                  <span className="text-gray-400 block text-[10px] truncate">{selections}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-black font-semibold">
                                ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                disabled={isCreating}
                                className="text-red-500 hover:text-red-700 transition-colors p-1 disabled:opacity-50 cursor-pointer"
                                aria-label="Remover artículo"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Sección 3: Datos de la Orden */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 pb-1.5">
                  3. Detalles de Facturación
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Estado Inicial
                    </label>
                    <select
                      value={newOrderStatus}
                      onChange={(e) => setNewOrderStatus(e.target.value as OrderStatus)}
                      disabled={isCreating}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    >
                      <option value="PEDIDO SIN CONFIRMAR">Pedido sin confirmar</option>
                      <option value="PAGADO">Pagado</option>
                      <option value="PEDIDO TOMADO">Pedido tomado</option>
                      <option value="CANCELADO">Cancelado</option>
                      <option value="ENVIADO">Enviado</option>
                      <option value="PAGO SIN CONFIRMAR">Pago sin confirmar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Canal de Venta
                    </label>
                    <select
                      value={newOrderChannel}
                      onChange={(e) => setNewOrderChannel(e.target.value as SalesChannel)}
                      disabled={isCreating}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black"
                    >
                      <option value="Whatsapp">WhatsApp</option>
                      <option value="Tienda Online">Tienda Online</option>
                      <option value="Redes sociales">Redes sociales</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Total de la Orden
                    </label>
                    <div className="h-9 flex items-center text-base font-bold text-red-600" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${newOrderTotal.toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Notas Internas del Pedido
                    </label>
                    <textarea
                      rows={3}
                      value={newOrderNotes}
                      onChange={(e) => setNewOrderNotes(e.target.value)}
                      disabled={isCreating}
                      placeholder="Redacta la transportadora, guía de despacho o comentarios relevantes de la venta..."
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all text-black resize-none"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="border-t border-gray-100 p-6 bg-gray-50 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={isCreating}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Registrando...
                  </>
                ) : (
                  'Crear Pedido'
                )}
              </button>
              <button
                type="button"
                onClick={closeCreateDrawer}
                disabled={isCreating}
                className="px-5 py-2.5 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 bg-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
