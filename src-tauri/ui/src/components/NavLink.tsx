import { Link, useLocation } from 'react-router-dom';


export default function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        active ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'hover:bg-gray-700 text-gray-300'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}