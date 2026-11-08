import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PackagePlus, Edit, Trash2, Search, Filter, Plus, Minus, Tag, X, AlertTriangle, FileText } from 'lucide-react';
import { LowStockReportModal } from '../components/LowStockReportModal';
import type { Product, Category } from '../index.types';

function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

    // PDF Report Modal state
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Form Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form Fields
    const [name, setName] = useState('');
    const [stock, setStock] = useState<number>(0);
    const [minStock, setMinStock] = useState<number>(10);
    const [price, setPrice] = useState<number>(0.0);
    const [categoryId, setCategoryId] = useState<number | null>(null);

    // Delete Confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function loadData() {
        try {
            const [productsData, categoriesData] = await Promise.all([
                invoke<Product[]>('get_products'),
                invoke<Category[]>('get_categories'),
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
            setErrorMsg(null);
        } catch (e) {
            console.error(e);
            setErrorMsg('Error al cargar datos de inventario');
        }
    }

    useEffect(() => {
        loadData();  
    }, []);

    function openCreateModal() {
        setEditingProduct(null);
        setName('');
        setStock(0);
        setMinStock(10);
        setPrice(0.0);
        setCategoryId(null);
        setIsModalOpen(true);
    }

    function openEditModal(prod: Product) {
        setEditingProduct(prod);
        setName(prod.name);
        setStock(prod.stock);
        setMinStock(prod.min_stock ?? 10);
        setPrice(prod.price);
        setCategoryId(prod.category_id ?? null);
        setIsModalOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            if (editingProduct) {
                await invoke('update_product', {
                    id: editingProduct.id,
                    name: name.trim(),
                    stock: Number(stock),
                    minStock: Number(minStock),
                    price: Number(price),
                    categoryId: categoryId || null,
                });
            } else {
                await invoke('create_product', {
                    name: name.trim(),
                    stock: Number(stock),
                    minStock: Number(minStock),
                    price: Number(price),
                    categoryId: categoryId || null,
                });
            }
            setIsModalOpen(false);
            await loadData();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(typeof e === 'string' ? e : 'Error al guardar el producto');
        }
    }

    async function handleDelete(id: number) {
        try {
            await invoke('delete_product', { id });
            setDeletingId(null);
            await loadData();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(typeof e === 'string' ? e : 'Error al eliminar el producto');
        }
    }

    async function handleAdjustStock(id: number, delta: number) {
        try {
            await invoke('adjust_product_stock', { id, delta });
            await loadData();
        } catch (e) {
            console.error(e);
        }
    }

    // Filter Logic
    const filteredProducts = products.filter(p => {
        const matchesName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesCategory = true;
        if (selectedCategoryFilter === 'NONE') {
            matchesCategory = !p.category_id;
        } else if (selectedCategoryFilter !== 'ALL') {
            matchesCategory = p.category_id === Number(selectedCategoryFilter);
        }
        return matchesName && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-medium text-white tracking-tight">Gestión de Productos</h2>
                    <p className="text-gray-400 text-sm mt-1">Control de stock, precios y categorías de tu catálogo</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-400 hover:text-blue-300 font-semibold py-3 px-4 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
                    >
                        <FileText size={18} />
                        <span>Reporte PDF Stock Bajo</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20 text-sm cursor-pointer"
                    >
                        <PackagePlus size={20} />
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
                    <span>{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Toolbar: Search & Category Filter */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar producto por nombre..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={selectedCategoryFilter}
                        onChange={e => setSelectedCategoryFilter(e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-blue-500 w-full md:w-auto"
                    >
                        <option value="ALL" className="bg-gray-900 text-white">Todas las Categorías</option>
                        <option value="NONE" className="bg-gray-900 text-white">Sin Categoría</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-gray-900 text-white">
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-900/60 border-b border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase">ID</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Producto</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Categoría</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Stock Act.</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Stock Mín.</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Precio Unit.</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/60">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        No se encontraron productos registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(p => {
                                    const minThreshold = p.min_stock ?? 10;
                                    const isLowStock = p.stock < minThreshold;
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="p-4 font-mono text-xs text-gray-500">#{p.id}</td>
                                            <td className="p-4">
                                                <div className="font-normal text-white">{p.name}</div>
                                            </td>
                                            <td className="p-4">
                                                {p.category_name ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-900/40 text-purple-300 border border-purple-700/40">
                                                        <Tag size={12} />
                                                        {p.category_name}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                                                        Sin Categoría
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleAdjustStock(p.id, -1)}
                                                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                                                        title="Restar 1 unidad"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span
                                                        className={`min-w-[40px] text-center font-bold px-2 py-0.5 rounded text-sm ${
                                                            isLowStock
                                                                ? 'bg-red-900/40 text-red-400 border border-red-700/50'
                                                                : 'text-white'
                                                        }`}
                                                    >
                                                        {p.stock}
                                                    </span>
                                                    <button
                                                        onClick={() => handleAdjustStock(p.id, 1)}
                                                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                                                        title="Sumar 1 unidad"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-mono text-sm text-gray-400">
                                                {minThreshold}
                                            </td>
                                            <td className="p-4 text-right font-semibold text-emerald-400">
                                                ${p.price.toFixed(2)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(p)}
                                                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="Editar Producto"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingId(p.id)}
                                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="Eliminar Producto"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Crear / Editar Producto */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                            <h3 className="text-xl font-bold text-white">
                                {editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Nombre del Producto</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                    placeholder="Ej. Teclado Mecánico RGB"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Stock Act.</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={stock}
                                        onChange={e => setStock(parseInt(e.target.value) || 0)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Stock Mín.</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={minStock}
                                        onChange={e => setMinStock(parseInt(e.target.value) || 0)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                        title="Umbral de alerta para stock bajo"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Precio ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price}
                                        onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Categoría</label>
                                <select
                                    value={categoryId ?? ''}
                                    onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                >
                                    <option value="" className="bg-gray-900 text-white">-- Sin Categoría --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-gray-900 text-white">
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors"
                                >
                                    {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {deletingId !== null && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <AlertTriangle size={24} />
                            <h3 className="text-xl font-bold text-white">¿Eliminar Producto?</h3>
                        </div>
                        <p className="text-gray-300 text-sm">
                            Esta acción no se puede deshacer. Se eliminará el producto permanentemente de la base de datos.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Low Stock PDF Report Modal */}
            <LowStockReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                products={products}
            />
        </div>
    );
}

export default Products;
