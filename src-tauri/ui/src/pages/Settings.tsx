import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    Wifi, Server, Globe, Copy, CheckCheck,
    AlertTriangle, RefreshCw, Play, Square, Info
} from 'lucide-react';
import type { NetworkStatus } from '../index.types';



function Settings() {
    const [status, setStatus] = useState<NetworkStatus>({
        active: false,
        port: 8765,
        local_ip: null,
    });
    const [portInput, setPortInput] = useState<string>('8765');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const loadStatus = useCallback(async () => {
        try {
            const s = await invoke<NetworkStatus>('get_network_status');
            setStatus(s);
            if (!s.active) {
                setPortInput(s.port.toString());
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        loadStatus();
        // Poll every 3 seconds to keep status fresh
        const interval = setInterval(loadStatus, 3000);
        return () => clearInterval(interval);
    }, [loadStatus]);

    const handleStart = async () => {
        const port = parseInt(portInput);
        if (isNaN(port) || port < 1024 || port > 65535) {
            setError('Puerto inválido. Usa un valor entre 1024 y 65535.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await invoke('start_network_server', { port });
            await loadStatus();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : 'Error al iniciar el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setError(null);
        setLoading(true);
        try {
            await invoke('stop_network_server');
            await loadStatus();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : 'Error al detener el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const accessUrl = status.local_ip
        ? `http://${status.local_ip}:${status.port}`
        : null;

    const copyToClipboard = async () => {
        if (!accessUrl) return;
        try {
            await navigator.clipboard.writeText(accessUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const el = document.createElement('textarea');
            el.value = accessUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Configuración</h2>
                <p className="text-gray-400 text-sm mt-1">
                    Gestiona la accesibilidad de la aplicación en tu red local
                </p>
            </div>

            {/* Network Server Card */}
            <div className={`bg-gray-800 rounded-2xl border shadow-xl overflow-hidden transition-colors ${
                status.active ? 'border-emerald-500/40' : 'border-gray-700/80'
            }`}>
                {/* Card Header */}
                <div className={`p-5 border-b flex items-center justify-between gap-4 ${
                    status.active ? 'border-emerald-500/20 bg-emerald-950/20' : 'border-gray-700/60'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                            status.active
                                ? 'bg-emerald-900/40 border-emerald-700/40 text-emerald-400'
                                : 'bg-gray-700/40 border-gray-600/40 text-gray-400'
                        }`}>
                            <Server size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Acceso de Red Local</h3>
                            <p className="text-xs text-gray-400">
                                Permite que otros dispositivos vean la app desde su navegador
                            </p>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        status.active
                            ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
                            : 'bg-gray-700/40 border-gray-600/50 text-gray-400'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            status.active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                        }`}></span>
                        {status.active ? 'Activo' : 'Inactivo'}
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-5">
                    {/* Port Input + Action Button */}
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                                Puerto
                            </label>
                            <input
                                type="number"
                                min="1024"
                                max="65535"
                                value={portInput}
                                disabled={status.active}
                                onChange={(e) => setPortInput(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="8765"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Valor recomendado entre 1024 y 65535. Rango estándar: 8000–9000.
                            </p>
                        </div>

                        {status.active ? (
                            <button
                                onClick={handleStop}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-700/40 hover:bg-red-700/70 border border-red-600/50 text-red-300 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Square size={16} />}
                                <span>Detener</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleStart}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-700/30 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                                <span>Iniciar</span>
                            </button>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Access URL — shown when active */}
                    {status.active && accessUrl && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                                Dirección de acceso para otros dispositivos
                            </label>
                            <div className="flex items-center gap-2 bg-gray-900 border border-emerald-700/40 rounded-xl px-4 py-3">
                                <Globe size={16} className="text-emerald-400 shrink-0" />
                                <span className="flex-1 font-mono text-emerald-300 text-sm select-all">
                                    {accessUrl}
                                </span>
                                <button
                                    onClick={copyToClipboard}
                                    className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                                    title="Copiar al portapapeles"
                                >
                                    {copied ? (
                                        <CheckCheck size={16} className="text-emerald-400" />
                                    ) : (
                                        <Copy size={16} />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Escribí esta dirección en el navegador del otro dispositivo (Firefox, Chrome, etc.) estando en la misma red Wi-Fi o cable.
                            </p>
                        </div>
                    )}

                    {/* IP when inactive */}
                    {!status.active && status.local_ip && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-900/40 px-4 py-2.5 rounded-xl border border-gray-700/40">
                            <Wifi size={14} className="shrink-0" />
                            <span>Tu IP local actual: <span className="font-mono text-gray-300">{status.local_ip}</span></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                    <Info size={18} />
                    <h4 className="font-semibold text-sm">¿Cómo funciona?</h4>
                </div>
                <ul className="text-xs text-gray-400 space-y-2 ml-1">
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">1.</span>
                        <span>Elegí un puerto y presioná <strong className="text-gray-300">Iniciar</strong>. El servidor comienza a escuchar en tu red local.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">2.</span>
                        <span>Copiá la dirección que aparece y escribila en el navegador del otro dispositivo (debe estar en la misma red).</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">3.</span>
                        <span>Esta aplicación debe permanecer abierta para que el acceso funcione. Al cerrarla, el servidor se detiene automáticamente.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">4.</span>
                        <span>Si Windows muestra una alerta de firewall al iniciar, permitir el acceso es necesario para que funcione.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default Settings;
