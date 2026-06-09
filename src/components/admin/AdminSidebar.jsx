import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  GitFork, 
  MapPin, 
  Users, 
  UserCheck, 
  Megaphone,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AdminSidebar = () => {
  const { logout } = useAuth();

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/buses', label: 'Buses Fleet', icon: Bus },
    { to: '/admin/routes', label: 'Routes Manager', icon: GitFork },
    { to: '/admin/stops', label: 'Stops Terminal', icon: MapPin },
    { to: '/admin/drivers', label: 'Drivers Roster', icon: UserCheck },
    { to: '/admin/users', label: 'Registered Users', icon: Users },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300 select-none">
      {/* Brand logo */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-primary p-2 rounded-xl text-white">
          <Bus size={22} className="stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-white">CityBus Admin</h1>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Fleet Manager</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 
                `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="transition-transform duration-200 group-hover:scale-105" />
                <span>{item.label}</span>
              </div>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition" />
            </NavLink>
          );
        })}
      </nav>

      {/* Sign Out Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition duration-200"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
