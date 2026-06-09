import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MobileFrame } from '../user/MobileFrame';
import { BottomNav } from '../user/BottomNav';
import { UserHeader } from '../user/UserHeader';
import { AdminSidebar } from '../admin/AdminSidebar';
import { AdminNavbar } from '../admin/AdminNavbar';
import { Bus, Power, User, ShieldCheck } from 'lucide-react';

// PASSENGER LAYOUT
export const UserLayout = () => {
  const { currentUser, role } = useAuth();
  
  // Guard: if not authenticated, redirect to /login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If role is driver, redirect to driver dashboard
  if (role === 'driver') {
    return <Navigate to="/driver/dashboard" replace />;
  }

  // If role is admin, redirect to admin dashboard
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <MobileFrame>
      <UserHeader />
      <main className="flex-1 pb-20 overflow-y-auto bg-slate-50 no-scrollbar">
        <Outlet />
      </main>
      <BottomNav />
    </MobileFrame>
  );
};

// DRIVER LAYOUT
export const DriverLayout = () => {
  const { currentUser, role, logout } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/driver/login" replace />;
  }

  if (role !== 'driver') {
    // If not driver, redirect to home page or role redirect
    return <Navigate to="/" replace />;
  }

  return (
    <MobileFrame>
      {/* Driver Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between text-white sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg">
            <Bus size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight">Driver Console</h1>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              On Duty
            </p>
          </div>
        </div>
        
        {/* Simple Logout Capsule */}
        <button 
          onClick={logout}
          className="bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Power size={13} />
          <span>Exit</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-950 no-scrollbar text-white">
        <Outlet />
      </main>
    </MobileFrame>
  );
};

// ADMIN LAYOUT
export const AdminLayout = () => {
  const { currentUser, role } = useAuth();
  const location = useLocation();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Get current page header title based on route
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path.endsWith('/buses')) return 'Buses Fleet Manager';
    if (path.endsWith('/routes')) return 'Routes Optimizer';
    if (path.endsWith('/stops')) return 'Stops Terminal Control';
    if (path.endsWith('/drivers')) return 'Drivers Roster System';
    if (path.endsWith('/users')) return 'Registered Users Directory';
    if (path.endsWith('/announcements')) return 'Broadcasting Center';
    return 'Admin Dashboard';
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <AdminNavbar title={getHeaderTitle()} />

        {/* Scrollable page views */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 no-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
