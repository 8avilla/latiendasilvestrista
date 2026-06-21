'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
  FunnelChart, Funnel, LabelList,
} from 'recharts';

interface DayData {
  date: string;
  label: string;
  total: number;
  count: number;
}

interface AggData {
  _id: string;
  total: number;
  count: number;
}

interface FunnelStage {
  stage: string;
  value: number;
}

interface Props {
  days: DayData[];
  channels: AggData[];
  geo: AggData[];
  funnel: FunnelStage[];
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];
const FUNNEL_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981'];

export default function DashboardCharts({ days, channels, geo, funnel }: Props) {
  const hasAnyFunnelData = funnel.some(s => s.value > 0);
  const funnelWithColors = funnel.map((s, i) => ({
    ...s,
    fill: FUNNEL_COLORS[i],
    pct: i === 0 || funnel[0].value === 0 ? null : Math.round((s.value / funnel[0].value) * 100),
  }));
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Gráfico de Líneas: Ventas 7 días */}
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-black">Evolución de Ventas (Últimos 7 días)</h2>
          <span className="text-xs text-gray-400">solo pagos confirmados</span>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#9ca3af' }} 
                tickFormatter={(val) => val >= 1000 ? `$${val / 1000}k` : `$${val}`}
              />
              <Tooltip 
                formatter={(value: unknown) => [`$${Number(value || 0).toLocaleString('es-CO')}`, 'Ingresos']}
                labelStyle={{ color: 'black', fontWeight: 'bold' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                activeDot={{ r: 6, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Pastel: Por Canal */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col">
        <h2 className="text-sm font-semibold text-black mb-2">Ventas por Canal</h2>
        {channels.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10 flex-1 flex items-center justify-center">Sin datos</p>
        ) : (
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={channels}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="total"
                  nameKey="_id"
                >
                  {channels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: unknown, name: unknown) => [`$${Number(value || 0).toLocaleString('es-CO')}`, String(name || 'Tienda Online')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex flex-col gap-2 mt-4">
          {channels.map((ch, i) => (
            <div key={ch._id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-600 truncate max-w-[120px]">{ch._id || 'Tienda Online'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{ch.count} ped.</span>
                <span className="font-semibold text-black">${ch.total.toLocaleString('es-CO')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embudo de Conversión */}
      <div className="lg:col-span-3 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-black">Embudo de Conversión (este mes)</h2>
          <span className="text-xs text-gray-400">visitas → carrito → checkout → pago</span>
        </div>
        {!hasAnyFunnelData ? (
          <p className="text-xs text-gray-400 text-center py-10">Los datos se acumularán con las próximas visitas</p>
        ) : (
          <div className="flex items-stretch gap-0">
            {/* Barras horizontales */}
            <div className="flex flex-col justify-around flex-1 gap-2 py-1">
              {funnelWithColors.map((s) => {
                const pct = funnel[0].value > 0 ? Math.round((s.value / funnel[0].value) * 100) : 0;
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 shrink-0 text-right">{s.stage}</span>
                    <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all"
                        style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: s.fill }}
                      />
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <span className="text-sm font-bold text-black">{s.value.toLocaleString('es-CO')}</span>
                      {s.pct !== null && (
                        <span className="text-[10px] text-gray-400 ml-1.5">{s.pct}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini funnel visual */}
            <div className="w-32 shrink-0 hidden sm:block">
              <ResponsiveContainer width="100%" height={160} minWidth={0}>
                <FunnelChart>
                  <Funnel dataKey="value" data={funnelWithColors} isAnimationActive={false}>
                    <LabelList position="center" fill="#fff" fontSize={10} dataKey="stage" />
                  </Funnel>
                  <Tooltip formatter={(v: unknown) => [Number(v).toLocaleString('es-CO'), 'Eventos']} contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', fontSize: 12 }} />
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico de Barras: Top Geográfico */}
      <div className="lg:col-span-3 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-black mb-4">Top Municipios (Cantidad de Pedidos)</h2>
        <div className="h-[250px] w-full">
          {geo.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Faltan datos geográficos</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={geo} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="_id" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  width={120}
                />
                <Tooltip 
                  formatter={(value: unknown) => [`${Number(value || 0)} pedidos`, 'Cantidad']}
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                  {geo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
