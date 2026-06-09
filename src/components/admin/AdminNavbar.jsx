import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Sparkles, Server } from 'lucide-react';

export const AdminNavbar = ({ title }) => {
  const { currentUser, isMock } = useAuth();

  return (
    <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
      <div>
        <h2 className="font-extrabold text-xl text-slate-800 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 font-medium">Configure network operations and live tracking parameters</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Status badges */}
        <div className="flex items-center gap-2">
          {isMock ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
              <Sparkles size={12} className="text-amber-500 animate-pulse" />
              Demo Simulation Mode
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
              <Server size={12} className="text-emerald-500" />
              Firestore Database Connected
            </span>
          )}
        </div>

        {/* User profile capsule */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5 shadow-sm">
          <div className="bg-primary/10 text-primary p-1 rounded-lg">
            <Shield size={16} />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800">{currentUser?.name || 'Administrator'}</p>
            <p className="text-[10px] font-semibold text-slate-400">Owner Role</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
