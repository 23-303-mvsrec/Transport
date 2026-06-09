import React from 'react';
import { Smartphone, Wifi, Battery, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const MobileFrame = ({ children }) => {
  const { isMock } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8 font-sans overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Device Frame */}
      <div className="w-full sm:w-[430px] h-screen sm:h-[880px] bg-white sm:rounded-[40px] sm:shadow-2xl sm:border-[10px] sm:border-slate-800 flex flex-col relative overflow-hidden transition-all duration-500">
        
        {/* Notch / Speaker (Visible on Desktop only) */}
        <div className="hidden sm:flex absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-800 rounded-b-2xl z-50 items-center justify-center">
          <div className="w-12 h-1 bg-slate-700 rounded-full mb-1"></div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-b border-slate-50 px-6 pt-3 pb-2 flex items-center justify-between text-xs text-slate-500 font-medium z-30 select-none">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1.5">
            {isMock && (
              <span className="flex items-center gap-0.5 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-amber-100">
                <ShieldAlert size={10} /> SIMULATOR
              </span>
            )}
            <Wifi size={13} className="text-slate-600" />
            <Battery size={15} className="text-slate-600" />
          </div>
        </div>

        {/* App Content */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 no-scrollbar">
          {children}
        </div>

        {/* Home Indicator (Visible on Desktop only) */}
        <div className="hidden sm:block w-full h-5 bg-white flex justify-center items-center z-30 border-t border-slate-50">
          <div className="w-32 h-1.5 bg-slate-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default MobileFrame;
