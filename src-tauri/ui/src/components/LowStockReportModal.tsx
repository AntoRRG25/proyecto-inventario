import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { invoke } from '@tauri-apps/api/core';
import { FileDown, X, CheckSquare, Square, AlertTriangle, ShoppingCart } from 'lucide-react';
import type { LowStockReportModalProps, SelectedItem, ItemOverride } from '../index.types';


export const LowStockReportModal: React.FC<LowStockReportModalProps> = ({
    isOpen,
    onClose,
    products,
}) => {
    const [threshold, setThreshold] = useState<number>(10);
    const [overrides, setOverrides] = useState<Record<number, ItemOverride>>({});
    const [supplierName, setSupplierName] = useState<string>('');
    const [includePrices, setIncludePrices] = useState<boolean>(true);
    const [notes, setNotes] = useState<string>('');

    // Derive items from props + threshold + user overrides — no useEffect needed
    const items: SelectedItem[] = useMemo(() => {
        if (!isOpen) return [];
        return products
            .filter(p => p.stock < (p.min_stock ?? threshold))
            .map(p => {
                const targetStock = (p.min_stock ?? 10) * 2;
                return {
                    product: p,
                    selected:      overrides[p.id]?.selected      ?? true,
                    orderQuantity: overrides[p.id]?.orderQuantity ?? Math.max(1, targetStock - p.stock),
                };
            });
    }, [products, threshold, isOpen, overrides]);

    if (!isOpen) return null;

    const selectedItems = items.filter(i => i.selected);

    const totalSelectedCount = selectedItems.length;
    const totalOrderUnits = selectedItems.reduce((acc, curr) => acc + curr.orderQuantity, 0);
    const totalEstimatedCost = selectedItems.reduce(
        (acc, curr) => acc + curr.orderQuantity * curr.product.price,
        0
    );

    // Changing the threshold resets user overrides so defaults recompute cleanly
    const handleThresholdChange = (val: number) => {
        setThreshold(Math.max(1, isNaN(val) ? 1 : val));
        setOverrides({});
    };

    const toggleSelectAll = () => {
        const allSelected = items.every(i => i.selected);
        const next: Record<number, ItemOverride> = {};
        items.forEach(i => {
            next[i.product.id] = { selected: !allSelected, orderQuantity: i.orderQuantity };
        });
        setOverrides(next);
    };

    const toggleItem = (id: number) => {
        const item = items.find(i => i.product.id === id)!;
        setOverrides(prev => ({
            ...prev,
            [id]: { selected: !item.selected, orderQuantity: item.orderQuantity },
        }));
    };

    const updateQuantity = (id: number, qty: number) => {
        const validQty = Math.max(1, isNaN(qty) ? 1 : qty);
        const item = items.find(i => i.product.id === id)!;
        setOverrides(prev => ({
            ...prev,
            [id]: { selected: item.selected, orderQuantity: validQty },
        }));
    };

    const generatePDF = async () => {
        if (selectedItems.length === 0) return;

        const doc = new jsPDF();
        const currentDate = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Header Background Banner
        doc.setFillColor(30, 58, 138); // Blue 900
        doc.rect(0, 0, 210, 38, 'F');

        // Document Header Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('CONTROL DE INVENTARIO', 14, 18);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(191, 219, 254); // Blue 200
        doc.text('Informe de Reposición y Pedido de Stock', 14, 27);

        // Date and Info top right
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`Fecha: ${currentDate}`, 196, 20, { align: 'right' });
        if (supplierName.trim()) {
            doc.text(`Proveedor: ${supplierName.trim()}`, 196, 27, { align: 'right' });
        }

        // Summary Info Cards Section
        let currentY = 46;
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, currentY, 182, 22, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.text('Resumen del Pedido:', 18, currentY + 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`• Productos a pedir: ${totalSelectedCount}`, 18, currentY + 16);
        doc.text(`• Total unidades a solicitar: ${totalOrderUnits} uds.`, 80, currentY + 16);
        if (includePrices) {
            doc.setFont('helvetica', 'bold');
            doc.text(`• Total estimado: $${totalEstimatedCost.toFixed(2)}`, 148, currentY + 16);
        }

        currentY += 28;

        if (notes.trim()) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text('Notas / Instrucciones:', 14, currentY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            const splitNotes = doc.splitTextToSize(notes.trim(), 182);
            doc.text(splitNotes, 14, currentY + 5);
            currentY += 5 + (splitNotes.length * 4) + 4;
        }

        // Table Columns & Data
        const tableHeaders = includePrices
            ? [['#', 'Producto', 'Categoría', 'Stock Act.', 'Cant. Pedir', 'Precio Unit.', 'Subtotal Est.']]
            : [['#', 'Producto', 'Categoría', 'Stock Act.', 'Cant. Pedir']];

        const tableBody = selectedItems.map((item, index) => {
            const row = [
                (index + 1).toString(),
                item.product.name,
                item.product.category_name || 'Sin categoría',
                `${item.product.stock} uds.`,
                `${item.orderQuantity} uds.`,
            ];
            if (includePrices) {
                row.push(`$${item.product.price.toFixed(2)}`);
                row.push(`$${(item.orderQuantity * item.product.price).toFixed(2)}`);
            }
            return row;
        });

        // Generate Table
        autoTable(doc, {
            startY: currentY,
            head: tableHeaders,
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [51, 65, 85],
            },
            columnStyles: includePrices ? {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 55 },
                2: { cellWidth: 35 },
                3: { halign: 'center', cellWidth: 22 },
                4: { halign: 'center', cellWidth: 22 },
                5: { halign: 'right', cellWidth: 23 },
                6: { halign: 'right', cellWidth: 25 },
            } : {
                0: { halign: 'center', cellWidth: 12 },
                1: { cellWidth: 70 },
                2: { cellWidth: 50 },
                3: { halign: 'center', cellWidth: 25 },
                4: { halign: 'center', cellWidth: 25 },
            },
            didDrawPage: () => {
                // Footer
                const str = `Página ${doc.getNumberOfPages()}`;
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(str, 196, 285, { align: 'right' });
                doc.text('Generado por Control de Inventario', 14, 285);
            }
        });

        // Send PDF bytes to Rust backend — opens native "Save As" dialog
        const fileName = `Pedido_Stock_Bajo_${new Date().toISOString().slice(0, 10)}.pdf`;
        const arrayBuffer = doc.output('arraybuffer');
        const pdfBytes = Array.from(new Uint8Array(arrayBuffer));

        try {
            await invoke('save_pdf', {
                pdfBytes,
                defaultName: fileName,
            });
        } catch (err) {
            console.error('Error al guardar el PDF:', err);
            alert(`Error al guardar el PDF: ${err}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <ShoppingCart size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-medium text-white">Generar Pedido & Reporte PDF</h3>
                            <p className="text-xs text-gray-400">Selecciona artículos con stock bajo y ajusta cantidades a pedir</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Controls Bar */}
                <div className="p-4 bg-gray-800/80 border-b border-gray-700/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Threshold Selector */}
                    <div className="flex items-center gap-2 bg-gray-900/60 p-2.5 rounded-xl border border-gray-700">
                        <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                        <label className="text-xs text-gray-300 font-medium whitespace-nowrap">Stock menor a:</label>
                        <input
                            type="number"
                            min="1"
                            max="500"
                            value={threshold}
                            onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 1)}
                            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-xs text-gray-400">uds.</span>
                    </div>

                    {/* Supplier Name */}
                    <div className="flex items-center gap-2 bg-gray-900/60 p-2.5 rounded-xl border border-gray-700">
                        <label className="text-xs text-gray-300 font-medium whitespace-nowrap">Proveedor (Opcional):</label>
                        <input
                            type="text"
                            placeholder="Nombre del proveedor..."
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Options Toggle */}
                    <div className="flex items-center justify-between bg-gray-900/60 p-2.5 rounded-xl border border-gray-700">
                        <label className="text-xs text-gray-300 font-medium flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includePrices}
                                onChange={(e) => setIncludePrices(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-0 bg-gray-800 border-gray-600"
                            />
                            <span>Incluir Precios en PDF</span>
                        </label>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-3">
                            <CheckSquare size={48} className="text-emerald-500 opacity-60" />
                            <p className="text-lg font-medium text-white">¡No hay productos con stock menor a {threshold} unidades!</p>
                            <p className="text-xs text-gray-500">Puedes aumentar el límite de stock arriba si deseas incluir más artículos.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-700">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-900 text-gray-400 uppercase text-xs border-b border-gray-700">
                                        <th className="py-3 px-4 w-10 text-center">
                                            <button
                                                type="button"
                                                onClick={toggleSelectAll}
                                                className="text-blue-400 hover:text-blue-300"
                                                title="Seleccionar / Deseleccionar todos"
                                            >
                                                {items.every(i => i.selected) ? (
                                                    <CheckSquare size={18} />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </th>
                                        <th className="py-3 px-4">Producto</th>
                                        <th className="py-3 px-4">Categoría</th>
                                        <th className="py-3 px-4 text-center">Stock Actual</th>
                                        <th className="py-3 px-4 text-center">Cantidad a Pedir</th>
                                        {includePrices && <th className="py-3 px-4 text-right">Precio Unit.</th>}
                                        {includePrices && <th className="py-3 px-4 text-right">Subtotal Est.</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/60 bg-gray-800/40">
                                    {items.map((item) => {
                                        const subtotal = item.orderQuantity * item.product.price;
                                        return (
                                            <tr
                                                key={item.product.id}
                                                className={`transition-colors ${item.selected ? 'hover:bg-blue-950/20' : 'opacity-50 hover:opacity-75 bg-gray-900/30'}`}
                                            >
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleItem(item.product.id)}
                                                        className={item.selected ? 'text-blue-400' : 'text-gray-500'}
                                                    >
                                                        {item.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-white">
                                                    {item.product.name}
                                                </td>
                                                <td className="py-3 px-4 text-gray-400 text-xs">
                                                    {item.product.category_name || 'Sin Categoría'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-900/40 border border-red-700/50 text-red-400">
                                                        {item.product.stock} uds.
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        disabled={!item.selected}
                                                        value={item.orderQuantity}
                                                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value))}
                                                        className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-center font-medium text-blue-400 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                                                    />
                                                </td>
                                                {includePrices && (
                                                    <td className="py-3 px-4 text-right text-gray-300 text-xs">
                                                        ${item.product.price.toFixed(2)}
                                                    </td>
                                                )}
                                                {includePrices && (
                                                    <td className="py-3 px-4 text-right font-medium text-emerald-400 text-sm">
                                                        ${subtotal.toFixed(2)}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Optional Notes */}
                    <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700 space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notas / Observaciones para el informe:</label>
                        <textarea
                            rows={2}
                            placeholder="Ej: Solicitar despacho prioritario antes del viernes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Footer Summary & Action */}
                <div className="p-4 bg-gray-900 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 text-sm">
                        <div>
                            <span className="text-gray-400 text-xs block">Seleccionados</span>
                            <span className="font-medium text-white text-base">{totalSelectedCount} de {items.length}</span>
                        </div>
                        <div className="h-8 w-px bg-gray-700"></div>
                        <div>
                            <span className="text-gray-400 text-xs block">Total a Pedir</span>
                            <span className="font-medium text-blue-400 text-base">{totalOrderUnits} uds.</span>
                        </div>
                        {includePrices && (
                            <>
                                <div className="h-8 w-px bg-gray-700"></div>
                                <div>
                                    <span className="text-gray-400 text-xs block">Inversión Estimada</span>
                                    <span className="font-medium text-emerald-400 text-base">${totalEstimatedCost.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={selectedItems.length === 0}
                            onClick={generatePDF}
                            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-sm"
                        >
                            <FileDown size={18} />
                            <span>Generar & Descargar PDF</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
