import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Sparkles, Server, Sun, Moon } from 'lucide-react';

export const AdminNavbar = ({ title }) => {
  const { currentUser, isMock, theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';

  return (
    <header className={`border-b px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-colors duration-300 ${
      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
    }`}>
      <div className="text-left">
        <h2 className={`font-extrabold text-xl tracking-tight transition-colors duration-300 ${
          isDark ? 'text-white' : 'text-slate-800'
        }`}>{title}</h2>
        <p className={`text-xs font-medium transition-colors duration-300 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>Configure network operations and live tracking parameters</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Status badges */}
        <div className="flex items-center gap-2">
          {isMock ? (
            <span className={`flex items-center gap-1 text-[11px] font-bold border rounded-full px-3 py-1 transition-colors duration-300 ${
              isDark ? 'text-amber-400 bg-amber-950/20 border-amber-900/50' : 'text-amber-700 bg-amber-50 border-amber-100'
            }`}>
              <Sparkles size={12} className="text-amber-500 animate-pulse" />
              Demo Simulation Mode
            </span>
          ) : (
            <span className={`flex items-center gap-1 text-[11px] font-bold border rounded-full px-3 py-1 transition-colors duration-300 ${
              isDark ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/50' : 'text-emerald-700 bg-emerald-50 border-emerald-100'
            }`}>
              <Server size={12} className="text-emerald-500" />
              Firestore Database Connected
            </span>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-colors duration-200 ${
            isDark ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-primary hover:bg-slate-100'
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User profile capsule */}
        <div className={`flex items-center gap-2.5 border rounded-xl px-4 py-1.5 shadow-sm transition-colors duration-300 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="bg-primary/10 text-primary p-1 rounded-lg">
            <Shield size={16} />
          </div>
          <div className="text-left">
            <p className={`text-xs font-bold transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-800'}`}>{currentUser?.name || 'Administrator'}</p>
            <p className="text-[10px] font-semibold text-slate-400">Owner Role</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
