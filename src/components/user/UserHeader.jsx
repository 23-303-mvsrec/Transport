import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

export const UserHeader = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const cities = ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar'];

  return (
    <header className="bg-white border-b border-slate-100 px-5 py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
          <Bus size={20} className="stroke-[2.5]" />
        </div>
        <div className="text-left">
          <h1 className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1">
            CityBus
          </h1>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Live System Active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Localized City Selector */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition">
          <MapPin size={12} className="text-primary" />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-transparent border-none outline-none pr-1 font-medium cursor-pointer"
          >
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Notification Bell Button */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-1.5 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-xl transition-all"
          title="Transit Notices"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[8px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default UserHeader;
