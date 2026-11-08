import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Package, Tags, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import NavLink from './components/NavLink';


function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-900 text-white font-sans">
        {/* Sidebar */}
        <nav className="w-64 bg-gray-800 p-6 flex flex-col gap-2 border-r border-gray-700">
          <div className="flex items-center gap-2 mb-8 px-2">
            <LayoutDashboard className="text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">Control de Inventario</h1>
          </div>

          <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Panel Principal" />
          <NavLink to="/products" icon={<Package size={20} />} label="Productos" />
          <NavLink to="/categories" icon={<Tags size={20} />} label="Categorías" />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Settings at the bottom */}
          <div className="border-t border-gray-700 pt-3">
            <NavLink to="/settings" icon={<SettingsIcon size={20} />} label="Configuración" />
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

