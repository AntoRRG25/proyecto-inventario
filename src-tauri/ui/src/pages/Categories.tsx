import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Tag, Plus, Edit2, Trash2, Search, Check, X, Package } from 'lucide-react';
import type { Category } from '../index.types';
// interface Category {
//     id: number;
//     name: string;
//     product_count?: number;
// }

function Categories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newName, setNewName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editName, setEditName] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function loadCategories() {
        try {
            setLoading(true);
            const data = await invoke<Category[]>('get_categories');
            setCategories(data);
            setErrorMsg(null);
        } catch (e) {
            console.error(e);
            setErrorMsg('Error al cargar las categorías');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            await invoke('create_category', { name: newName.trim() });
            setNewName('');
            await loadCategories();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(typeof e === 'string' ? e : 'Error al crear la categoría');
        }
    }

    async function handleUpdate(id: number) {
        if (!editName.trim()) return;
        try {
            await invoke('update_category', { id, name: editName.trim() });
            setEditingCategory(null);
            await loadCategories();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(typeof e === 'string' ? e : 'Error al actualizar la categoría');
        }
    }

    async function handleDelete(id: number) {
        try {
            await invoke('delete_category', { id });
            setDeletingId(null);
            await loadCategories();
        } catch (e: any) {
            console.error(e);
            setErrorMsg(typeof e === 'string' ? e : 'Error al eliminar la categoría');
        }
    }

    useEffect(() => {
        loadCategories();
    }, []);

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Gestión de Categorías</h2>
                    <p className="text-gray-400 text-sm mt-1">Organiza y administra las categorías de tu inventario general</p>
                </div>
                <div className="text-sm bg-gray-800 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 font-medium">
                    Total: <span className="text-purple-400 font-bold">{categories.length}</span> categorías
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

            {/* Top Toolbar: Search + Create Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
                    <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                        <Plus size={18} className="text-blue-400" />
                        Nueva Categoría
                    </h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Nombre de la Categoría</label>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-500 text-sm"
                                placeholder="Ej. Electrónica, Herramientas, Alimentos..."
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                        >
                            <Tag size={18} />
                            <span>Crear Categoría</span>
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar categoría por nombre..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all text-sm shadow-md"
                        />
                    </div>

                    {/* Category Cards Grid */}
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Cargando categorías...</div>
                    ) : filteredCategories.length === 0 ? (
                        <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">
                            {searchTerm ? 'No se encontraron categorías con esa búsqueda.' : 'No hay categorías registradas todavía.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredCategories.map(cat => (
                                <div
                                    key={cat.id}
                                    className="bg-gray-800 p-5 rounded-xl border border-gray-700/80 hover:border-purple-500/50 shadow-lg transition-all flex flex-col justify-between group"
                                >
                                    {editingCategory?.id === cat.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="flex-1 bg-gray-900 border border-blue-500 rounded-lg p-2 text-white text-sm outline-none"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleUpdate(cat.id)}
                                                className="p-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors"
                                                title="Guardar"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingCategory(null)}
                                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
                                                title="Cancelar"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-700/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                                                        <Tag size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-white text-base leading-tight">{cat.name}</h4>
                                                        <span className="text-xs text-gray-500 font-mono">ID: #{cat.id}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCategory(cat);
                                                            setEditName(cat.name);
                                                        }}
                                                        className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                                                        title="Editar nombre"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingId(cat.id)}
                                                        className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                                        title="Eliminar categoría"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-700/50 text-xs">
                                                <span className="text-gray-400 flex items-center gap-1">
                                                    <Package size={14} className="text-gray-500" />
                                                    Productos asociados:
                                                </span>
                                                <span className="font-semibold px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/30">
                                                    {cat.product_count || 0}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación para eliminar */}
            {deletingId !== null && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
                        <h3 className="text-xl font-bold text-white">¿Eliminar Categoría?</h3>
                        <p className="text-gray-300 text-sm">
                            Esta acción eliminará la categoría. Los productos vinculados pasarán a quedar <span className="text-yellow-400 font-semibold">Sin Categoría</span>.
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
        </div>
    );
}

export default Categories;
