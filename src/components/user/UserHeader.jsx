import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Bell, Sun, Moon } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../contexts/AuthContext';

export const UserHeader = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const cities = ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar'];

  return (
    <header className={`border-b px-5 py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm transition-colors duration-300 ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg transition-colors duration-300 ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
          <Bus size={20} className="stroke-[2.5]" />
        </div>
        <div className="text-left">
          <h1 className={`font-extrabold text-base tracking-tight transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-1`}>
            CityBus
          </h1>
          <div className={`flex items-center gap-1 text-[10px] font-medium transition-colors duration-300 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Live System Active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Localized City Selector */}
        <div className={`flex items-center gap-1 border rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer transition-colors duration-300 ${
          isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
        }`}>
          <MapPin size={12} className="text-primary" />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-transparent border-none outline-none pr-1 font-medium cursor-pointer"
          >
            {cities.map(city => (
              <option key={city} value={city} className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}>{city}</option>
            ))}
          </select>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-1.5 rounded-xl transition-all duration-200 ${
            isDark ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-500 hover:text-primary hover:bg-slate-50'
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell Button */}
        <button
          onClick={() => navigate('/alerts')}
          className={`relative p-1.5 rounded-xl transition-all duration-200 ${
            isDark ? 'text-slate-300 hover:text-primary hover:bg-slate-800' : 'text-slate-500 hover:text-primary hover:bg-slate-50'
          }`}
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
