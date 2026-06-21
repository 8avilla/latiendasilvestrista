'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export default function RefreshDashboardButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      // Sincronizar con Bold (tal como se hace en OrdersList)
      const syncRes = await fetch('/api/admin/sync-bold', { method: 'POST' });
      const syncData = syncRes.ok ? await syncRes.json() : { updated: 0, results: [] };
      
      // Actualizar los datos del servidor para el dashboard
      router.refresh();

      let msg = 'Dashboard actualizado.';
      if (syncData.updated > 0) {
        msg += ` ${syncData.updated} pedido(s) sincronizados desde Bold.`;
      }
      Toast.fire({ icon: 'success', title: msg });
    } catch (err) {
      console.error(err);
      Toast.fire({ icon: 'error', title: 'Error al actualizar los pedidos.' });
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <button 
      onClick={handleRefresh} 
      disabled={isRefreshing}
      className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
    >
      <span className={`text-lg leading-none ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
      {isRefreshing ? 'Actualizando...' : 'Actualizar Pedidos'}
    </button>
  );
}
