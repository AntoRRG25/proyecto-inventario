import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, Tags, DollarSign, Boxes, AlertTriangle, FileText } from 'lucide-react';
import { LowStockReportModal } from '../components/LowStockReportModal';
import type { Product, Stats } from '../index.types';


//type Product2 = Omit<Product, 'category_id'>

function Dashboard() {
    const [stats, setStats] = useState<Stats>({
        total_products: 0,
        total_categories: 0,
        total_stock_value: 0,
        total_units: 0,
        low_stock_count: 0,
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    async function loadData() {
        try {
            setLoading(true);
            const [statsData, productsData] = await Promise.all([
                invoke<Stats>('get_stats'),
                invoke<Product[]>('get_products'),
            ]);
            setStats(statsData);
            setProducts(productsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const lowStockProducts = products.filter(p => p.stock < (p.min_stock ?? 10));

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Panel Principal</h2>
                    <p className="text-gray-400 text-sm mt-1">Resumen general del estado de inventario, métricas de stock y valorización</p>
                </div>
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-sm cursor-pointer"
                >
                    <FileText size={18} />
                    <span>Generar Pedido / Informe PDF</span>
                </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Productos */}
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/80 shadow-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-900/40 border border-blue-700/40 flex items-center justify-center text-blue-400 shrink-0">
                        <Package size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase text-gray-400 truncate">Total Productos</p>
                        <p className="text-xl font-bold text-white mt-0.5 truncate">{stats.total_products}</p>
                    </div>
                </div>

                {/* Total Categorías */}
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/80 shadow-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center text-purple-400 shrink-0">
                        <Tags size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase text-gray-400 truncate">Categorías</p>
                        <p className="text-xl font-bold text-white mt-0.5 truncate">{stats.total_categories}</p>
                    </div>
                </div>

                {/* Valor Total Inventario */}
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/80 shadow-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <DollarSign size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase text-gray-400 truncate">Valor Total</p>
                        <p
                            className="text-base font-medium text-emerald-400 mt-0.5 truncate"
                            title={`$${stats.total_stock_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        >
                            ${stats.total_stock_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Unidades Totales */}
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/80 shadow-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-900/40 border border-sky-700/40 flex items-center justify-center text-sky-400 shrink-0">
                        <Boxes size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase text-gray-400 truncate">Stock Total</p>
                        <p className="text-xl font-bold text-white mt-0.5 truncate">{stats.total_units} <span className="text-xs text-gray-500 font-normal">uds.</span></p>
                    </div>
                </div>

                {/* Stock Bajo */}
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/80 shadow-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-900/40 border border-red-700/40 flex items-center justify-center text-red-400 shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase text-gray-400 truncate">Stock Bajo</p>
                        <p className="text-xl font-bold text-red-400 mt-0.5 truncate">{stats.low_stock_count}</p>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/80 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white">Niveles de Stock por Producto</h3>
                        <p className="text-xs text-gray-400">Visualización de disponibilidad en almacén</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span> Stock Normal
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block"></span> Stock Bajo (&lt; Stock Mín.)
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="h-80 flex items-center justify-center text-gray-400">Cargando gráfico...</div>
                ) : products.length === 0 ? (
                    <div className="h-80 flex items-center justify-center text-gray-500">No hay datos de productos para mostrar.</div>
                ) : (
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={products}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    label={{ value: 'Unidades', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#374151' }}
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px', color: '#fff' }}
                                    itemStyle={{ color: '#60A5FA' }}
                                />
                                <Bar dataKey="stock" radius={[6, 6, 0, 0]}>
                                    {products.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.stock < (entry.min_stock ?? 10) ? '#F87171' : '#60A5FA'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Low Stock Items Section */}
            {lowStockProducts.length > 0 && (
                <div className="bg-gray-800 p-6 rounded-2xl border border-red-500/30 shadow-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertTriangle size={20} />
                            <h3 className="text-lg font-bold text-white">Atención: Productos con Stock Crítico</h3>
                        </div>
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="px-3.5 py-1.5 bg-red-900/40 hover:bg-red-900/70 border border-red-700/60 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <FileText size={15} />
                            <span>Crear Pedido de Reposición (PDF)</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
                                    <th className="py-2.5 px-4">Producto</th>
                                    <th className="py-2.5 px-4">Categoría</th>
                                    <th className="py-2.5 px-4 text-center">Stock Actual</th>
                                    <th className="py-2.5 px-4 text-center">Stock Mínimo</th>
                                    <th className="py-2.5 px-4 text-right">Precio Unitario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {lowStockProducts.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-700/20">
                                        <td className="py-3 px-4 font-semibold text-white">{p.name}</td>
                                        <td className="py-3 px-4 text-gray-400">{p.category_name || 'Sin Categoría'}</td>
                                        <td className="py-3 px-4 text-center font-bold text-red-400">
                                            <span className="px-2 py-0.5 rounded bg-red-900/40 border border-red-700/50">
                                                {p.stock} uds.
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-mono text-gray-400">{p.min_stock ?? 10} uds.</td>
                                        <td className="py-3 px-4 text-right text-emerald-400 font-medium">${p.price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PDF Report Modal */}
            <LowStockReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                products={products}
            />
        </div>
    );
}

export default Dashboard;
