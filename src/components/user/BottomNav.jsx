import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Map, Bell, User } from 'lucide-react';
import { useBuses } from '../../contexts/BusContext';

export const BottomNav = () => {
  const { alerts } = useBuses();
  
  // Count only incident/delay alerts as notifications
  const alertCount = alerts.filter(a => a.type === 'delay' || a.type === 'incident').length;

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/routes', label: 'Routes', icon: Compass },
    { to: '/tracking', label: 'Track', icon: Map },
    { to: '/alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { to: '/profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="bottom-nav-container">
      <div className="flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `bottom-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <div className="relative">
                <Icon size={20} strokeWidth={2.2} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 select-none font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
