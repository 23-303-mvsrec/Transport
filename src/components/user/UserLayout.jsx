import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { MobileFrame } from './MobileFrame';
import { UserHeader } from './UserHeader';
import { Home, Compass, Star, User, Bell, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

export const UserLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { alerts, isFirebaseOffline } = useBuses();
  const { currentUser, role } = useAuth();
  const { unreadCount } = useNotifications();

  // PWA Install Promotion States & Effect
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Increment visit count on layout mount
    let visits = parseInt(localStorage.getItem('citybus_visit_count') || '0', 10);
    visits += 1;
    localStorage.setItem('citybus_visit_count', visits.toString());

    const isDismissed = localStorage.getItem('citybus_install_dismissed') === 'true';

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show if visits >= 3 and not permanently dismissed
      if (visits >= 3 && !isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: If beforeinstallprompt already fired and was stored globally
    if (visits >= 3 && !isDismissed && window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
      setShowInstallBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissClick = () => {
    localStorage.setItem('citybus_install_dismissed', 'true');
    setShowInstallBanner(false);
  };

  // Bottom Navigation tabs
  const navItems = [
    { to: '/home', label: 'Home', icon: Home, matchStart: true },
    { to: '/routes', label: 'Routes', icon: Compass, exact: true },
    { to: '/routes?tab=favourites', label: 'Favourites', icon: Star, queryMatch: 'favourites' },
    { to: '/profile', label: 'Profile', icon: User }
  ];

  const checkIsActive = (item) => {
    if (item.queryMatch) {
      const searchParams = new URLSearchParams(location.search);
      return searchParams.get('tab') === item.queryMatch;
    }
    if (item.exact) {
      return location.pathname === item.to && !location.search;
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <MobileFrame>
      {/* Top Header */}
      <UserHeader />

      {/* Firebase Offline Banner */}
      {isFirebaseOffline && (
        <div className="bg-amber-500 text-white py-2 px-4 text-[10px] font-bold text-center flex items-center justify-center gap-1.5 z-40 animate-pulse">
          <AlertTriangle size={12} />
          <span>No internet — showing cached data</span>
        </div>
      )}

      {/* Outlet Page Content with Transition Effect */}
      <main className="flex-1 pb-16 overflow-y-auto bg-slate-50 no-scrollbar relative">
        <div key={location.key} className="animate-fade-in-slide-up">
          <Outlet />
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-bottom-nav z-40" style={{ maxWidth: '430px', margin: '0 auto' }}>
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = checkIsActive(item);
            
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-slate-400 relative transition-all duration-200 ${
                  isActive ? 'text-primary scale-105' : 'hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  
                  {/* Announcement bell count on Routes or Home if desired, but UserLayout requires bell badge: count of unread announcements */}
                  {item.label === 'Home' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                
                <span className={`text-[10px] mt-1 select-none ${isActive ? 'font-black text-slate-800' : 'font-medium'}`}>
                  {item.label}
                </span>

                {/* Active Indicator Blue Dot */}
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Install Promotion Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex flex-col justify-between gap-3 z-50 animate-slide-up" style={{ maxWidth: '398px', margin: '0 auto' }}>
          <div className="flex items-center gap-3 text-left">
            <div className="bg-primary/20 p-2 rounded-xl text-primary flex-shrink-0">
              <Home size={20} className="text-blue-400" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs">Install CityBus</h5>
              <p className="text-[10px] text-slate-400 font-semibold leading-tight mt-0.5">Install CityBus for quick access</p>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <button 
              onClick={handleDismissClick}
              className="flex-1 text-slate-400 hover:text-white text-[10px] font-bold py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-500 transition"
            >
              Dismiss
            </button>
            <button 
              onClick={handleInstallClick}
              className="flex-1 bg-primary hover:bg-blue-600 text-white text-[10px] font-bold py-2 px-3 rounded-lg transition shadow-lg shadow-blue-500/20"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Transition styles injector */}
      <style>{`
        .animate-fade-in-slide-up {
          animation: fadeSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </MobileFrame>
  );
};

export default UserLayout;
