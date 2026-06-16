'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
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

interface Props {
  days: DayData[];
  channels: AggData[];
  geo: AggData[];
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];

export default function DashboardCharts({ days, channels, geo }: Props) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Gráfico de Líneas: Ventas 7 días */}
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-black">Evolución de Ventas (Últimos 7 días)</h2>
          <span className="text-xs text-gray-400">solo pagos confirmados</span>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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

      {/* Gráfico de Barras: Top Geográfico */}
      <div className="lg:col-span-3 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-black mb-4">Top Municipios (Cantidad de Pedidos)</h2>
        <div className="h-[250px] w-full">
          {geo.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Faltan datos geográficos</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
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
