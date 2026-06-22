'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Order, Product, OrderStatus, SalesChannel, PaymentMethod } from '@/types';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const showErrorToast = (msg: string) => Toast.fire({ icon: 'error', title: msg });
const showSuccessToast = (msg: string) => Toast.fire({ icon: 'success', title: msg });

const PAYMENT_METHODS: PaymentMethod[] = ['Bold', 'Efectivo', 'Nequi', 'Bancolombia', 'Daviplata', 'Otros'];

const PM_LABELS: Record<PaymentMethod, string> = {
  Bold:        'Bold (Tarjeta / PSE)',
  Efectivo:    'Efectivo',
  Nequi:       'Nequi',
  Bancolombia: 'Bancolombia',
  Daviplata:   'Daviplata',
  Otros:       'Otros',
};

const PM_COLORS: Record<PaymentMethod, string> = {
  Bold:        'bg-blue-50 text-blue-700 border-blue-200',
  Efectivo:    'bg-green-50 text-green-700 border-green-200',
  Nequi:       'bg-pink-50 text-pink-700 border-pink-200',
  Bancolombia: 'bg-orange-50 text-orange-700 border-orange-200',
  Daviplata:   'bg-purple-50 text-purple-700 border-purple-200',
  Otros:       'bg-gray-50 text-gray-600 border-gray-200',
};

function normalizePM(raw: string | undefined): PaymentMethod {
  if (!raw) return 'Bold';
  if (raw === 'BOLD') return 'Bold';
  if (raw === 'WHATSAPP' || raw === 'MANUAL') return 'Efectivo';
  if ((PAYMENT_METHODS as string[]).includes(raw)) return raw as PaymentMethod;
  return 'Otros';
}
import { DEPARTMENTS } from '@/lib/colombia';
import { ClientDateTime } from '@/components/ClientDateTime';

interface OrdersListProps {
  orders: Order[];
  products: Product[];
}

export default function OrdersList({ orders, products }: OrdersListProps) {
  const searchParams = useSearchParams();

  // Mantener estado local para actualizaciones rápidas e interactivas
  const [prevOrders, setPrevOrders] = useState<Order[]>(orders);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  if (orders !== prevOrders) {
    setPrevOrders(orders);
    setLocalOrders(orders);
  }

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<Set<OrderStatus>>(new Set());
  const [channelFilter, setChannelFilter] = useState<'ALL' | SalesChannel>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'PRICE_DESC' | 'PRICE_ASC'>('NEWEST');

  // Estados para el panel de edición de pedido existente (Drawer 1)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>('NUEVO PEDIDO');
  const [editChannel, setEditChannel] = useState<SalesChannel>('Tienda Online');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('Bold');
  const [editNotes, setEditNotes] = useState('');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editCarrier, setEditCarrier] = useState('');
  const [editShipping, setEditShipping] = useState<Order['shippingDetails'] | null>(null);
  const [editItems, setEditItems] = useState<Order['items']>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [isBulkChanging, setIsBulkChanging] = useState(false);
  const [quickDeleteId, setQuickDeleteId] = useState<string | null>(null);
  const [quickDeleting, setQuickDeleting] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showPagoPendiente, setShowPagoPendiente] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [isSyncingTx, setIsSyncingTx] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const filterMunicipalities = useMemo(
    () => DEPARTMENTS.find(d => d.name === departmentFilter)?.municipalities ?? [],
    [departmentFilter]
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(orderId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
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
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('CONFIRMADO');
  const [newOrderChannel, setNewOrderChannel] = useState<SalesChannel>('Whatsapp');
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [shippingRates, setShippingRates] = useState<{ defaultPrice: number; rates: Record<string, number> } | null>(null);
  const [newOrderShippingPrice, setNewOrderShippingPrice] = useState<number>(0);
  const [manualShippingPrice, setManualShippingPrice] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(setShippingRates)
      .catch(() => {});
  }, []);

  const calculatedShippingPrice = useMemo(() => {
    const hasFreeShipping = newOrderItems.some(item => item.product.freeShipping);
    if (hasFreeShipping) return 0;
    if (!newOrderShipping.city || !shippingRates) return 0;
    return shippingRates.rates[newOrderShipping.city] ?? shippingRates.defaultPrice;
  }, [newOrderShipping.city, newOrderItems, shippingRates]);

  const effectiveShippingPrice = manualShippingPrice ? newOrderShippingPrice : calculatedShippingPrice;

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

    const paidStatuses = ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'];
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

    const pending = active.filter(o => o.status === 'CONFIRMADO' || o.status === 'EN PREPARACIÓN').length;
    const avgTicket = paidOrders.length > 0
      ? Math.round(paidOrders.reduce((s, o) => s + o.totalPrice, 0) / paidOrders.length)
      : 0;

    return { todaySales, monthSales, pending, avgTicket, paidCount: paidOrders.length };
  }, [localOrders]);

  // Calcular conteos de cada estado (solo pedidos activos)
  const counts = useMemo(() => {
    const active = localOrders.filter(o => !o.deleted);
    const pagoPendienteCount = active.filter((o) => o.status === 'PAGO PENDIENTE').length;
    const visibleCount = showPagoPendiente ? active.length : active.length - pagoPendienteCount;
    return {
      ALL: visibleCount,
      'NUEVO PEDIDO': active.filter((o) => o.status === 'NUEVO PEDIDO').length,
      'PAGO PENDIENTE': pagoPendienteCount,
      CONFIRMADO: active.filter((o) => o.status === 'CONFIRMADO').length,
      'EN PREPARACIÓN': active.filter((o) => o.status === 'EN PREPARACIÓN').length,
      ENVIADO: active.filter((o) => o.status === 'ENVIADO').length,
      ENTREGADO: active.filter((o) => o.status === 'ENTREGADO').length,
      CANCELADO: active.filter((o) => o.status === 'CANCELADO').length,
    };
  }, [localOrders, showPagoPendiente]);

  // Filtrado y ordenamiento de pedidos
  const sourceOrders = showTrash
    ? localOrders.filter(o => o.deleted)
    : localOrders.filter(o => !o.deleted);

  const filteredOrders = sourceOrders
    .filter((order) => {
      // Ocultar PAGO PENDIENTE por defecto
      if (!showPagoPendiente && order.status === 'PAGO PENDIENTE') {
        return false;
      }

      // Filtro por Estado
      if (statusFilter.size > 0 && !statusFilter.has(order.status)) {
        return false;
      }

      // Filtro por Canal de Venta
      if (channelFilter !== 'ALL' && order.salesChannel !== channelFilter) {
        return false;
      }

      // Filtro por Método de Pago
      if (paymentFilter !== 'ALL') {
        if (normalizePM(order.paymentMethod as string | undefined) !== paymentFilter) return false;
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

      // Filtros avanzados
      if (departmentFilter) {
        const orderDept = order.shippingDetails?.department || '';
        if (orderDept.toLowerCase() !== departmentFilter.toLowerCase()) return false;
      }
      if (cityFilter) {
        const orderCity = order.shippingDetails?.city || '';
        if (orderCity.toLowerCase() !== cityFilter.toLowerCase()) return false;
      }
      if (categoryFilter) {
        const hasCategory = order.items.some(item => {
          if (item.product?.category === categoryFilter) return true;
          const prodId = item.product?.id || (item.product as Record<string, unknown>)?._id;
          const product = products.find(p => p.id === prodId);
          return product && product.category === categoryFilter;
        });
        if (!hasCategory) return false;
      }
      if (productFilter) {
        const hasProduct = order.items.some(item => {
          const prodId = item.product?.id || (item.product as Record<string, unknown>)?._id;
          return prodId === productFilter;
        });
        if (!hasProduct) return false;
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

        return matchesId || matchesName || matchesEmail || matchesPhone || matchesCity || matchesItems;
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

  // Abrir y precargar Drawer de Edición
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
    setNewOrderStatus('CONFIRMADO');
    setNewOrderChannel('Whatsapp');
    setNewOrderPaymentMethod('Efectivo');
    setNewOrderNotes('');
    setNewOrderShippingPrice(0);
    setManualShippingPrice(false);
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
    const newTotalPrice = editItems.reduce((s, i) => s + i.product.price * i.quantity, 0) + (editingOrder.shippingPrice ?? 0);
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
          paymentMethod: editPaymentMethod,
          notes: editNotes,
          trackingNumber: editTrackingNumber || '',
          carrier: editCarrier || '',
          shippingDetails: editShipping,
          items: editItems,
          totalPrice: newTotalPrice,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el pedido');
      }

      setLocalOrders((prev) =>
        prev.map((o) =>
          o.orderId === editingOrder.orderId
            ? { ...o, status: editStatus, salesChannel: editChannel, paymentMethod: editPaymentMethod, notes: editNotes, trackingNumber: editTrackingNumber, carrier: editCarrier, shippingDetails: editShipping!, items: editItems, totalPrice: newTotalPrice, updatedAt: new Date().toISOString() }
            : o
        )
      );
      closeDrawer();
    } catch (err) {
      showErrorToast('Error al guardar los cambios del pedido. Intente de nuevo.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkStatusChange() {
    if (!bulkStatus || selectedIds.size === 0) return;
    setIsBulkChanging(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(orderId =>
          fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status: bulkStatus }),
          })
        )
      );
      setLocalOrders(prev =>
        prev.map(o =>
          selectedIds.has(o.orderId)
            ? { ...o, status: bulkStatus as OrderStatus, updatedAt: new Date().toISOString() }
            : o
        )
      );
      setSelectedIds(new Set());
      setBulkStatus('');
    } catch {
      showErrorToast('Error al cambiar el estado. Intenta de nuevo.');
    } finally {
      setIsBulkChanging(false);
    }
  }

  async function handleQuickDelete(orderId: string) {
    const result = await Swal.fire({
      title: '¿Mover a papelera?',
      text: "El pedido se ocultará de la lista principal",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, mover',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    setQuickDeleting(true);
    try {
      const res = await fetch(`/api/orders?orderId=${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLocalOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, deleted: true } : o));
    } catch {
      showErrorToast('Error al mover el pedido a la papelera.');
    } finally {
      setQuickDeleting(false);
      setQuickDeleteId(null);
    }
  }

  // Mover pedido a la papelera
  async function handleDelete() {
    if (!editingOrder) return;
    const result = await Swal.fire({
      title: '¿Mover a papelera?',
      text: "El pedido se ocultará de la lista principal",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, mover',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
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
      showErrorToast('Error al mover el pedido a la papelera. Intente de nuevo.');
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
        body: JSON.stringify({ orderId, status: 'EN PREPARACIÓN' }),
      });
      if (!res.ok) throw new Error();
      setLocalOrders(prev => prev.map(o =>
        o.orderId === orderId ? { ...o, status: 'EN PREPARACIÓN' as const } : o
      ));
    } catch {
      showErrorToast('Error al actualizar el pedido.');
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
      showErrorToast('Error al restaurar el pedido.');
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
        trackingNumber: (doc.trackingNumber as string) ?? '',
        carrier: (doc.carrier as string) ?? '',
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

      const txMap = new Map<string, string>(
        (syncData.results ?? [])
          .filter((r: { orderId: string; paymentId?: string }) => r.paymentId)
          .map((r: { orderId: string; paymentId: string }) => [r.orderId, r.paymentId])
      );

      const merged = fresh.map((o) => {
        let result = syncMap.has(o.orderId) ? { ...o, status: syncMap.get(o.orderId) as Order['status'] } : o;
        if (txMap.has(o.orderId)) {
          result = {
            ...result,
            transactionDetails: {
              ...result.transactionDetails,
              paymentId: txMap.get(o.orderId) as string,
            } as Order['transactionDetails'],
          };
        }
        return result;
      });

      let canceledCount = 0;
      const nowMs = Date.now();
      const finalMerged = await Promise.all(merged.map(async (o) => {
        if (o.status === 'PAGO PENDIENTE') {
          const createdMs = new Date(o.createdAt).getTime();
          const hoursPassed = (nowMs - createdMs) / (1000 * 60 * 60);
          if (hoursPassed > 24) {
            try {
              await fetch('/api/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: o.orderId, status: 'CANCELADO' }),
              });
              canceledCount++;
              return { ...o, status: 'CANCELADO' as Order['status'] };
            } catch (e) {
              console.error('Error auto-canceling order', o.orderId, e);
            }
          }
        }
        return o;
      }));

      setLocalOrders(finalMerged);
      setLastRefresh(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));

      let msg = '';
      if (syncData.updated > 0) msg += `${syncData.updated} pedido(s) actualizados desde Bold. `;
      if (canceledCount > 0) msg += `${canceledCount} pedido(s) cancelados automáticamente (>24h sin pago).`;
      
      if (msg) {
        showSuccessToast(`Actualización completa. ${msg}`);
      }
    } catch (err) {
      showErrorToast('Error al actualizar los pedidos. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSyncTx() {
    setIsSyncingTx(true);
    try {
      const res = await fetch('/api/admin/sync-bold-tx', { method: 'POST' });
      if (!res.ok) throw new Error('Error al sincronizar');
      const data = await res.json();

      if (data.updated > 0) {
        const txMap = new Map<string, string>(
          (data.results as { orderId: string; paymentId: string | null }[])
            .filter(r => r.paymentId)
            .map(r => [r.orderId, r.paymentId as string])
        );
        setLocalOrders(prev =>
          prev.map(o =>
            txMap.has(o.orderId)
              ? { ...o, transactionDetails: { ...o.transactionDetails, paymentId: txMap.get(o.orderId) as string } as Order['transactionDetails'] }
              : o
          )
        );
        showSuccessToast(`${data.updated} ID(s) de transacción Bold guardados.`);
      } else {
        showSuccessToast(`Se verificaron ${data.checked} pedido(s). Ninguno nuevo por actualizar.`);
      }
    } catch (err) {
      showErrorToast('Error al sincronizar IDs de Bold.');
      console.error(err);
    } finally {
      setIsSyncingTx(false);
    }
  }

  // Crear Pedido Manual
  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    const { name, phone, address, department, city } = newOrderShipping;
    if (!name.trim() || !phone.trim() || !address.trim() || !department.trim() || !city.trim()) {
      showErrorToast('Por favor completa los campos de envío obligatorios (Nombre, Celular, Dirección, Departamento, Ciudad).');
      return;
    }

    if (newOrderItems.length === 0) {
      showErrorToast('Por favor agrega al menos un producto al pedido.');
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
          totalPrice: newOrderTotal + effectiveShippingPrice,
          shippingPrice: effectiveShippingPrice,
          shippingDetails: newOrderShipping,
          paymentMethod: newOrderPaymentMethod,
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
      showErrorToast('Error al registrar el pedido. Intente de nuevo.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSendTrackingEmails(orderIds: string[]) {
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
        showSuccessToast(`Correos enviados: ${data.sent}. Fallidos: ${data.failed}.`);
      } else {
        showErrorToast(data.error || 'Error al enviar correos.');
      }
    } catch {
      showErrorToast('Error de conexión al enviar correos.');
    } finally {
      setIsSendingEmail(false);
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
              <div class="store">Verzus</div>
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

          ${order.trackingNumber ? `<div class="tracking"><span class="tracking-label">${order.carrier ? order.carrier + ' · ' : ''}Guía:</span> <span class="tracking-num">${order.trackingNumber}</span></div>` : ''}
          ${order.notes ? `<div class="notes"><strong>Notas:</strong> ${order.notes}</div>` : ''}
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Guías de envío — Verzus</title>
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
    .tracking {
      font-size: 10px;
      background: #f3f0ff;
      border: 1px solid #c4b5fd;
      border-radius: 3px;
      padding: 2mm 3mm;
    }
    .tracking-label { color: #6d28d9; font-weight: bold; }
    .tracking-num { font-family: monospace; font-size: 12px; font-weight: bold; letter-spacing: 0.05em; }
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



  function handleExportExcel() {
    const targetOrders = localOrders.filter(o => 
      !o.deleted && (o.status === 'CONFIRMADO' || o.status === 'EN PREPARACIÓN')
    );

    if (targetOrders.length === 0) {
      showErrorToast('No hay pedidos Confirmados o En Preparación para exportar.');
      return;
    }

    const rawData: Record<string, unknown>[] = [];
    const summaryMap = new Map<string, { Producto: string; Variantes: string; 'Cantidad Total': number }>();

    targetOrders.forEach(order => {
      order.items.forEach(item => {
        const variantsStr = item.selections ? Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(', ') : 'N/A';
        
        rawData.push({
          'ID Pedido': order.orderId,
          'Fecha': new Date(order.createdAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
          'Cliente': order.shippingDetails.name,
          'Teléfono': order.shippingDetails.phone,
          'Departamento': order.shippingDetails.department || '',
          'Ciudad': order.shippingDetails.city,
          'Dirección': order.shippingDetails.address,
          'Producto': item.product.name,
          'Variantes': variantsStr,
          'Cantidad': item.quantity,
          'Precio Und': item.product.price,
          'Estado': order.status
        });

        const summaryKey = `${item.product.id}|${variantsStr}`;
        if (!summaryMap.has(summaryKey)) {
          summaryMap.set(summaryKey, {
            'Producto': item.product.name,
            'Variantes': variantsStr,
            'Cantidad Total': 0
          });
        }
        summaryMap.get(summaryKey)!['Cantidad Total'] += item.quantity;
      });
    });

    const summaryData = Array.from(summaryMap.values()).sort((a, b) => String(a['Producto']).localeCompare(String(b['Producto'])));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(rawData);

    // Ajustar anchos de columna básicos
    ws1['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }];
    ws2['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Empaque');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Pedidos');

    XLSX.writeFile(wb, `Empaque_Pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleExportOrdersExcel() {
    if (filteredOrders.length === 0) {
      showErrorToast('No hay pedidos para exportar con los filtros actuales.');
      return;
    }

    const data = filteredOrders.map(order => {
      const productsSummary = order.items.map(item => {
        const vars = item.selections ? ` (${Object.values(item.selections).join(' / ')})` : '';
        return `${item.quantity}× ${item.product.name}${vars}`;
      }).join(' | ');

      return {
        'ID Pedido': order.orderId,
        'Fecha': new Date(order.createdAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
        'Estado': order.status,
        'Canal': order.salesChannel || '',
        'Pago': order.paymentMethod || '',
        'Cliente': order.shippingDetails?.name || '',
        'Celular': order.shippingDetails?.phone || '',
        'Email': order.shippingDetails?.email || '',
        'Departamento': order.shippingDetails?.department || '',
        'Ciudad': order.shippingDetails?.city || '',
        'Dirección': order.shippingDetails?.address || '',
        'Productos': productsSummary,
        'Subtotal': order.items.reduce((s, i) => s + i.product.price * i.quantity, 0),
        'Domicilio': order.shippingPrice ?? 0,
        'Total': order.totalPrice,
        'Transportadora': order.carrier || '',
        'Guía': order.trackingNumber || '',
        'Notas': order.notes || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
      { wch: 25 }, { wch: 13 }, { wch: 28 }, { wch: 16 }, { wch: 18 },
      { wch: 35 }, { wch: 50 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 14 }, { wch: 16 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `Pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            showTrash ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Papelera
          {trashCount > 0 && (
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
              showTrash ? 'bg-white/20 text-white' : 'bg-gray-100 text-black'
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
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black font-normal placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="NEWEST">Más recientes</option>
              <option value="OLDEST">Más antiguos</option>
              <option value="PRICE_DESC">Mayor total</option>
              <option value="PRICE_ASC">Menor total</option>
            </select>
            
            <select
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}
            >
              <option value="ALL">Canal: Todos</option>
              <option value="Whatsapp">WhatsApp</option>
              <option value="Tienda Online">Tienda Online</option>
              <option value="Redes sociales">Redes sociales</option>
              <option value="Otros">Otros</option>
            </select>
            <select
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
            >
              <option value="ALL">Pago: Todos</option>
              {PAYMENT_METHODS.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila de fechas y Filtros avanzados */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Periodo:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-gray-400 hover:text-black transition-colors"
              >
                ✕ limpiar
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-xs text-gray-500 hover:text-black font-semibold flex items-center gap-1 transition-colors"
          >
            Filtros avanzados
            <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Panel de Filtros Avanzados */}
        {showAdvancedFilters && (
          <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 mt-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                Departamento
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setCityFilter(''); }}
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
              >
                <option value="">Todos los departamentos</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                Ciudad
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                disabled={!departmentFilter}
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black disabled:bg-opacity-50 disabled:text-gray-400"
              >
                <option value="">Todas las ciudades</option>
                {filterMunicipalities.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                Categoría
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setProductFilter(''); }}
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
              >
                <option value="">Todas las categorías</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                Producto
              </label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
              >
                <option value="">Todos los productos</option>
                {products
                  .filter(p => !categoryFilter || p.category === categoryFilter)
                  .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Fila inferior: Filtros de Estado */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 overflow-hidden">
          <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide -mb-2 w-full md:w-auto">
            {/* Botón "Todos" — limpia la selección */}
            <button
              onClick={() => setStatusFilter(new Set())}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                statusFilter.size === 0
                  ? 'bg-black text-white border-black'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <span>Todos</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter.size === 0 ? 'bg-white/20 text-white' : 'bg-gray-200/50 text-gray-600'
              }`}>
                {counts.ALL}
              </span>
            </button>

            {/* Pill especial: Pago Pendiente — oculto por defecto */}
            <button
              onClick={() => setShowPagoPendiente(v => !v)}
              title={showPagoPendiente ? 'Ocultar pagos pendientes' : 'Mostrar pagos pendientes'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                showPagoPendiente
                  ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-500'
              }`}
            >
              {showPagoPendiente ? (
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
              <span>Pago pendiente</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] ${
                showPagoPendiente ? 'bg-white/20 text-white' : 'bg-gray-200/50 text-gray-400'
              }`}>
                {counts['PAGO PENDIENTE']}
              </span>
            </button>

            {/* Pills de estado — multi-selección */}
            {(['NUEVO PEDIDO', 'CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO', 'CANCELADO'] as const).map((st) => {
              const label = {
                'NUEVO PEDIDO': 'Nuevo pedido',
                CONFIRMADO: 'Confirmados',
                'EN PREPARACIÓN': 'En preparación',
                ENVIADO: 'Enviados',
                ENTREGADO: 'Entregados',
                CANCELADO: 'Cancelados',
              }[st];

              const activeStyles = {
                'NUEVO PEDIDO': 'bg-blue-600 text-white border-blue-600',
                CONFIRMADO: 'bg-green-600 text-white border-green-600',
                'EN PREPARACIÓN': 'bg-orange-500 text-white border-orange-500',
                ENVIADO: 'bg-purple-600 text-white border-purple-600',
                ENTREGADO: 'bg-teal-600 text-white border-teal-600',
                CANCELADO: 'bg-gray-600 text-white border-gray-600',
              }[st];

              const inactiveStyles = {
                'NUEVO PEDIDO': 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100',
                CONFIRMADO: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100',
                'EN PREPARACIÓN': 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100',
                ENVIADO: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100',
                ENTREGADO: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-100',
                CANCELADO: 'bg-gray-50 text-black hover:bg-gray-100 border-gray-200',
              }[st];

              const isActive = statusFilter.has(st);

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(prev => {
                    const next = new Set(prev);
                    if (next.has(st)) { next.delete(st); } else { next.add(st); }
                    return next;
                  })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive ? activeStyles : inactiveStyles
                  }`}
                >
                  {isActive && (
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span>{label}</span>
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200/50 text-gray-600'
                  }`}>
                    {counts[st]}
                  </span>
                </button>
              );
            })}
          </div>

          {(search.trim() !== '' || statusFilter.size > 0 || channelFilter !== 'ALL' || paymentFilter !== 'ALL' || dateFrom || dateTo || categoryFilter || departmentFilter || cityFilter || productFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter(new Set());
                setChannelFilter('ALL');
                setPaymentFilter('ALL');
                setSortBy('NEWEST');
                setDateFrom('');
                setDateTo('');
                setCategoryFilter('');
                setDepartmentFilter('');
                setCityFilter('');
                setProductFilter('');
              }}
              className="text-xs text-black hover:underline font-semibold flex items-center gap-1.5 transition-all"
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
        <div className="flex flex-wrap items-center justify-between gap-3 bg-black text-white rounded-xl px-5 py-3 mb-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">
              {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-white/60 hover:text-white transition-colors underline underline-offset-2"
            >
              Deseleccionar todo
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Cambio masivo de estado */}
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as OrderStatus | '')}
              disabled={isBulkChanging}
              className="text-xs border border-white/20 bg-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-white/50 disabled:opacity-50"
            >
              <option value="">Cambiar estado a...</option>
              <option value="NUEVO PEDIDO">Nuevo pedido</option>
              <option value="PAGO PENDIENTE">Pago pendiente</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="EN PREPARACIÓN">En preparación</option>
              <option value="ENVIADO">Enviado</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <button
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus || isBulkChanging}
              className="bg-white text-black hover:bg-gray-100 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95 cursor-pointer"
            >
              {isBulkChanging ? 'Aplicando...' : 'Aplicar'}
            </button>
            <span className="text-white/20 text-xs">|</span>
            <button
              onClick={handlePrintGuides}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir guías
            </button>
            {(() => {
              const selectedOrders = localOrders.filter(o => selectedIds.has(o.orderId));
              const validForEmail = selectedOrders.filter(o => ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO'].includes(o.status));
              if (validForEmail.length === 0) return null;
              return (
                <>
                  <span className="text-white/20 text-xs">|</span>
                  <button
                    onClick={() => handleSendTrackingEmails(validForEmail.map(o => o.orderId))}
                    disabled={isSendingEmail}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors active:scale-95 disabled:opacity-50"
                    title={`Enviar correo a ${validForEmail.length} pedido(s)`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {isSendingEmail ? 'Enviando...' : `Enviar correos (${validForEmail.length})`}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Resultados de Pedidos y Botones de acción */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 px-1">
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
        <div className="flex flex-wrap items-center gap-2">

          <button
            onClick={handleExportOrdersExcel}
            title={`Exportar ${filteredOrders.length} pedido(s) visibles a Excel`}
            className="flex items-center gap-1.5 border border-green-600 hover:bg-green-600 text-green-700 hover:text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel pedidos
          </button>
          <button
            onClick={handleExportExcel}
            title="Exportar Excel de Preparación (Confirmados + En Preparación)"
            className="flex items-center gap-1.5 border border-emerald-700 hover:bg-emerald-700 text-emerald-700 hover:text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Excel Empaque
          </button>
          <button
            onClick={handleSyncTx}
            disabled={isSyncingTx}
            title="Buscar y guardar ID de transacción Bold para pedidos Confirmados y En Preparación"
            className="flex items-center gap-1.5 border border-blue-200 hover:border-blue-500 text-blue-600 hover:text-blue-700 disabled:opacity-50 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <svg
              className={`w-3.5 h-3.5 ${isSyncingTx ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {isSyncingTx ? 'Sincronizando...' : 'Sincronizar IDs Bold'}
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
            className="bg-black hover:bg-black text-white px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
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
            const isNew = order.status === 'NUEVO PEDIDO';
            const isPendingPayment = order.status === 'PAGO PENDIENTE';
            const isConfirmed = order.status === 'CONFIRMADO';
            const isPreparation = order.status === 'EN PREPARACIÓN';
            const isShipped = order.status === 'ENVIADO';
            const isDelivered = order.status === 'ENTREGADO';
            const isCancelled = order.status === 'CANCELADO';

            return (
              <div key={order._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Header del pedido */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.orderId)}
                      onChange={() => toggleSelect(order.orderId)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-black cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-mono bg-white border border-gray-200 px-2.5 py-1 text-black font-semibold rounded whitespace-nowrap">
                      {order.orderId}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      <ClientDateTime date={order.createdAt} />
                    </span>
                    <span className="text-xs text-gray-400 border-l sm:border-l-0 md:border-l border-gray-200 pl-4 sm:pl-0 md:pl-4 whitespace-nowrap">
                      Canal: <strong className="text-black font-semibold">{order.salesChannel || 'Otros'}</strong>
                    </span>
                    {(() => {
                      const pm = normalizePM(order.paymentMethod as string | undefined);
                      return (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${PM_COLORS[pm]}`}>
                          {pm}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                    {order.deleted && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-gray-50 text-red-500 border border-red-200 px-3 py-1 rounded-full line-through opacity-70">
                        Eliminado
                      </span>
                    )}
                    {isNew && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                        Nuevo pedido
                      </span>
                    )}
                    {isPendingPayment && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full animate-pulse">
                        Pago pendiente
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                        Confirmado
                      </span>
                    )}
                    {isPreparation && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full">
                        En preparación
                      </span>
                    )}
                    {isShipped && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                        Enviado
                      </span>
                    )}
                    {isDelivered && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full">
                        Entregado
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-gray-50 text-gray-500 border border-gray-200 px-3 py-1 rounded-full">
                        Cancelado
                      </span>
                    )}
                    {!isNew && !isPendingPayment && !isConfirmed && !isPreparation && !isShipped && !isDelivered && !isCancelled && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold bg-gray-50 text-black border border-red-200 px-3 py-1 rounded-full">
                        Desconocido
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalles */}
                <div className="p-4 md:p-6 grid md:grid-cols-3 gap-6">
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
                        <span className="text-lg font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                          ${order.totalPrice.toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transacción Bold */}
                {order.transactionDetails?.paymentId && (
                  <div className="bg-blue-50/30 border-t border-blue-100 px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-blue-500 font-mono">
                    <span>TX: {order.transactionDetails.paymentId}</span>
                    {order.transactionDetails.payloadType && (
                      <span>TIPO: {order.transactionDetails.payloadType}</span>
                    )}
                    <a
                      href={`https://panel.bold.co/misventas/historial-de-transacciones/${order.transactionDetails.paymentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-2 py-0.5 rounded transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ver en Bold
                    </a>
                  </div>
                )}
                
                {/* Guía de transporte */}
                {order.trackingNumber && (
                  <div className="bg-purple-50/60 border-t border-purple-100 px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-purple-700">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1.04-.346M13 16H9m4 0h5.5M13 6h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16h-1" />
                    </svg>
                    {order.carrier && <span className="font-semibold">{order.carrier}</span>}
                    <span className="font-mono font-bold tracking-wider text-purple-900">{order.trackingNumber}</span>
                  </div>
                )}

                {/* Notas internas */}
                {order.notes && (
                  <div className="bg-gray-50/20 border-t border-gray-100 px-6 py-3 text-xs text-gray-700">
                    <strong className="text-black">Notas internas:</strong>
                    <p className="mt-1 whitespace-pre-wrap font-light text-gray-600 leading-relaxed">{order.notes}</p>
                  </div>
                )}

                {/* Acciones del Administrador */}
                <div className="bg-gray-50/30 border-t border-gray-100 px-4 md:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        {isConfirmed && (
                          <button
                            onClick={() => handleQuickTaken(order.orderId)}
                            disabled={takingId === order.orderId}
                            className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            {takingId === order.orderId ? 'Actualizando...' : 'En preparación'}
                          </button>
                        )}
                        {quickDeleteId === order.orderId ? (
                          <>
                            <span className="text-xs text-black font-medium">¿Mover a papelera?</span>
                            <button
                              onClick={() => handleQuickDelete(order.orderId)}
                              disabled={quickDeleting}
                              className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
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
                            className="flex items-center gap-1.5 text-gray-400 hover:text-black transition-colors text-xs font-medium"
                            title="Mover a papelera"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        {['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO'].includes(order.status) && (
                          <button
                            onClick={() => handleSendTrackingEmails([order.orderId])}
                            disabled={isSendingEmail}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center flex-1 sm:flex-none"
                            title="Enviar correo de seguimiento"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Enviar correo
                          </button>
                        )}
                        <button
                          onClick={() => openDrawer(order)}
                          className="border border-gray-300 hover:border-black text-black hover:bg-black hover:text-white px-4 py-2 sm:py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto flex-1 sm:flex-none"
                        >
                          Gestionar Pedido
                        </button>
                      </div>
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
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs space-y-3 text-gray-700">
                  {editShipping && (
                    <>
                      <div>
                        <strong className="block text-black mb-1">Nombre:</strong>
                        <input
                          type="text"
                          value={editShipping.name}
                          onChange={(e) => setEditShipping({ ...editShipping, name: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <strong className="block text-black mb-1">Celular:</strong>
                          <input
                            type="text"
                            value={editShipping.phone}
                            onChange={(e) => setEditShipping({ ...editShipping, phone: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded"
                            disabled={isSaving}
                          />
                        </div>
                        <a
                          href={`https://wa.me/57${editShipping.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${editShipping.name.split(' ')[0]}, te escribimos de Verzus sobre tu pedido ${editingOrder.orderId}. `)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-3 py-1.5 rounded text-[11px] font-semibold transition-colors h-[34px]"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z"/>
                          </svg>
                          WhatsApp
                        </a>
                      </div>
                      <div>
                        <strong className="block text-black mb-1">Email:</strong>
                        <input
                          type="email"
                          value={editShipping.email || ''}
                          onChange={(e) => setEditShipping({ ...editShipping, email: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <strong className="block text-black mb-1">Departamento:</strong>
                        <input
                          type="text"
                          value={editShipping.department || ''}
                          onChange={(e) => setEditShipping({ ...editShipping, department: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <strong className="block text-black mb-1">Ciudad:</strong>
                        <input
                          type="text"
                          value={editShipping.city}
                          onChange={(e) => setEditShipping({ ...editShipping, city: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <strong className="block text-black mb-1">Dirección:</strong>
                        <input
                          type="text"
                          value={editShipping.address}
                          onChange={(e) => setEditShipping({ ...editShipping, address: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded"
                          disabled={isSaving}
                        />
                      </div>
                    </>
                  )}
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
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                >
                  <option value="NUEVO PEDIDO">Nuevo pedido</option>
                  <option value="PAGO PENDIENTE">Pago pendiente</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="EN PREPARACIÓN">En preparación</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="ENTREGADO">Entregado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              {/* Guía de Transporte — visible cuando el pedido está ENVIADO */}
              {editStatus === 'ENVIADO' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs uppercase tracking-wider text-purple-700 font-bold flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Guía de Transporte
                  </h3>
                  <div>
                    <label className="block text-xs text-purple-700 font-semibold mb-1">Transportadora</label>
                    <select
                      value={editCarrier}
                      onChange={(e) => setEditCarrier(e.target.value)}
                      disabled={isSaving || isDeleting}
                      className="block w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-500 transition-all text-black"
                    >
                      <option value="">— Seleccionar transportadora —</option>
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
                    <label className="block text-xs text-purple-700 font-semibold mb-1">Número de guía</label>
                    <input
                      type="text"
                      value={editTrackingNumber}
                      onChange={(e) => setEditTrackingNumber(e.target.value)}
                      disabled={isSaving || isDeleting}
                      placeholder="Ej: 12345678901"
                      className="block w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-500 transition-all text-black font-mono tracking-wider"
                    />
                    <p className="text-[10px] text-purple-500 mt-1">Se incluirá en el email al cliente.</p>
                  </div>
                </div>
              )}

              {/* Canal de Venta */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Canal de Venta
                </label>
                <select
                  value={editChannel}
                  onChange={(e) => setEditChannel(e.target.value as SalesChannel)}
                  disabled={isSaving || isDeleting}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                >
                  <option value="Whatsapp">WhatsApp</option>
                  <option value="Tienda Online">Tienda Online</option>
                  <option value="Redes sociales">Redes sociales</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Método de Pago
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={isSaving || isDeleting}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                >
                  {PAYMENT_METHODS.map(pm => (
                    <option key={pm} value={pm}>{PM_LABELS[pm]}</option>
                  ))}
                </select>
              </div>

              {/* Notas internas */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Notas internas
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={isSaving || isDeleting}
                  placeholder="Observaciones internas sobre este pedido..."
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black resize-none"
                />
              </div>

              {/* Artículos de Compra */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                  Artículos Facturados
                </h3>
                <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  {editItems.map((item, idx) => {
                    return (
                      <li key={idx} className="py-2.5 flex flex-col text-xs first:pt-0 last:pb-0">
                        <div className="flex justify-between items-center w-full mb-1">
                          <div className="flex gap-2 items-center flex-1 pr-2">
                            <input
                              type="number"
                              className="w-12 border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/20 bg-white"
                              value={item.quantity}
                              min={1}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[idx].quantity = Number(e.target.value) || 1;
                                setEditItems(newItems);
                              }}
                            />
                            <span className="text-gray-400 font-semibold">x</span>
                            <input
                              type="text"
                              className="flex-1 font-semibold text-black border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/20 bg-white"
                              value={item.product.name}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[idx].product.name = e.target.value;
                                setEditItems(newItems);
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-gray-500">$</span>
                            <input
                              type="number"
                              className="w-24 text-black font-semibold border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/20 bg-white text-right"
                              value={item.product.price}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[idx].product.price = Number(e.target.value) || 0;
                                setEditItems(newItems);
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-1.5 flex flex-col gap-1.5 pl-6">
                          {item.selections && Object.entries(item.selections).map(([k, v], selIdx) => (
                            <div key={selIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                className="border border-gray-200 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/20 bg-white text-gray-600 uppercase tracking-wider"
                                value={k}
                                placeholder="Propiedad"
                                onChange={(e) => {
                                  const newItems = [...editItems];
                                  const oldSelections = newItems[idx].selections || {};
                                  const entries = Object.entries(oldSelections);
                                  entries[selIdx][0] = e.target.value;
                                  newItems[idx].selections = Object.fromEntries(entries);
                                  setEditItems(newItems);
                                }}
                              />
                              <span className="text-gray-500 font-medium text-[11px] uppercase tracking-wider">:</span>
                              <input
                                type="text"
                                className="border border-gray-200 rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/20 bg-white"
                                value={v}
                                placeholder="Valor"
                                onChange={(e) => {
                                  const newItems = [...editItems];
                                  const entries = Object.entries(newItems[idx].selections || {});
                                  entries[selIdx][1] = e.target.value;
                                  newItems[idx].selections = Object.fromEntries(entries);
                                  setEditItems(newItems);
                                }}
                              />
                              <button
                                type="button"
                                className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded"
                                onClick={() => {
                                  const newItems = [...editItems];
                                  const entries = Object.entries(newItems[idx].selections || {});
                                  entries.splice(selIdx, 1);
                                  newItems[idx].selections = Object.fromEntries(entries);
                                  setEditItems(newItems);
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 self-start mt-1 flex items-center gap-1"
                            onClick={() => {
                              const newItems = [...editItems];
                              if (!newItems[idx].selections) newItems[idx].selections = {};
                              let num = 1;
                              while (newItems[idx].selections[`Propiedad ${num}`] !== undefined) num++;
                              newItems[idx].selections[`Propiedad ${num}`] = '';
                              setEditItems(newItems);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Añadir Característica
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Resumen de precios */}
                <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2.5 text-xs text-gray-500">
                    <span>Subtotal productos</span>
                    <span className="font-medium text-black">
                      ${editItems.reduce((s, i) => s + i.product.price * i.quantity, 0).toLocaleString('es-CO')}
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
                    <span className="text-base font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${(editItems.reduce((s, i) => s + i.product.price * i.quantity, 0) + (editingOrder.shippingPrice ?? 0)).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transacción Bold */}
            {editingOrder.transactionDetails?.paymentId && (
              <div className="border-t border-blue-100 bg-blue-50/40 px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Bold
                </div>
                <span className="font-mono text-xs text-blue-800 bg-blue-100 px-2 py-0.5 rounded select-all">
                  {editingOrder.transactionDetails.paymentId}
                </span>
                {editingOrder.transactionDetails.payloadType && (
                  <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                    {editingOrder.transactionDetails.payloadType}
                  </span>
                )}
                <a
                  href={`https://panel.bold.co/misventas/historial-de-transacciones/${editingOrder.transactionDetails.paymentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors"
                >
                  Ver en Bold
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Footer de Acciones */}
            <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || isDeleting}
                  className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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
                  <div className="bg-gray-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <p className="text-[11px] text-red-800 font-medium leading-relaxed">
                      ⚠️ El pedido se moverá a la papelera. Podrás restaurarlo desde la vista de Papelera.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting || isSaving}
                        className="bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
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
                    className="text-xs text-black hover:text-black font-semibold flex items-center justify-center gap-1.5 transition-all mx-auto cursor-pointer"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black disabled:bg-gray-50 disabled:text-gray-400"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                        className="block w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={productCategoryFilter}
                        onChange={e => { setProductCategoryFilter(e.target.value); setSelectedProdId(''); }}
                        disabled={isCreating}
                        className="block w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                            className="block w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
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
                          className="block w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                        />
                      </div>

                      <div className="col-span-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="w-full bg-black hover:bg-black text-white py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
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
                                className="text-red-500 hover:text-black transition-colors p-1 disabled:opacity-50 cursor-pointer"
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                    >
                      <option value="NUEVO PEDIDO">Nuevo pedido</option>
                      <option value="PAGO PENDIENTE">Pago pendiente</option>
                      <option value="CONFIRMADO">Confirmado</option>
                      <option value="EN PREPARACIÓN">En preparación</option>
                      <option value="ENVIADO">Enviado</option>
                      <option value="ENTREGADO">Entregado</option>
                      <option value="CANCELADO">Cancelado</option>
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                    >
                      <option value="Whatsapp">WhatsApp</option>
                      <option value="Tienda Online">Tienda Online</option>
                      <option value="Redes sociales">Redes sociales</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Método de Pago
                    </label>
                    <select
                      value={newOrderPaymentMethod}
                      onChange={(e) => setNewOrderPaymentMethod(e.target.value as PaymentMethod)}
                      disabled={isCreating}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                    >
                      {PAYMENT_METHODS.map(pm => (
                        <option key={pm} value={pm}>{PM_LABELS[pm]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Valor de Domicilio
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={manualShippingPrice ? newOrderShippingPrice : effectiveShippingPrice}
                      onChange={(e) => {
                        setNewOrderShippingPrice(Number(e.target.value));
                        setManualShippingPrice(true);
                      }}
                      disabled={isCreating}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">
                      Total de la Orden
                    </label>
                    <div className="h-9 flex items-center text-base font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${(newOrderTotal + effectiveShippingPrice).toLocaleString('es-CO')}
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
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black resize-none"
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
                className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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
