import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBuses } from '../../contexts/BusContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  Bus, 
  LayoutDashboard, 
  GitFork, 
  MapPin, 
  UserCheck, 
  Users, 
  Megaphone, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Bell, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminLayout = () => {
  const { currentUser, logout } = useAuth();
  const { buses, routes } = useBuses();
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar toggle state for mobile
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ buses: [], routes: [], drivers: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Stats / Issues State
  const [openIssuesCount, setOpenIssuesCount] = useState(0);
  const [drivers, setDrivers] = useState([]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileOpen(false);
    setSearchQuery('');
    setShowSearchDropdown(false);
  }, [location.pathname]);

  // Load Drivers for layout search
  useEffect(() => {
    if (isFirebaseEnabled) {
      return onSnapshot(collection(db, 'drivers'), (snapshot) => {
        setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    } else {
      const stored = localStorage.getItem('citybus_mock_drivers');
      if (stored) {
        try {
          setDrivers(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  // Sync open issues count on snapshot
  useEffect(() => {
    if (isFirebaseEnabled) {
      const q = query(collection(db, 'issueReports'), where('status', '==', 'open'));
      return onSnapshot(q, (snapshot) => {
        setOpenIssuesCount(snapshot.size);
      });
    } else {
      const syncMock = () => {
        try {
          const stored = JSON.parse(localStorage.getItem('citybus_mock_reports') || '[]');
          setOpenIssuesCount(stored.filter(r => r.status === 'open').length);
        } catch (e) {}
      };
      syncMock();
      const interval = setInterval(syncMock, 1500);
      return () => clearInterval(interval);
    }
  }, []);

  // Search logic across buses/routes/drivers
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ buses: [], routes: [], drivers: [] });
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    const matchedBuses = buses.filter(b => b.number.toLowerCase().includes(q));
    const matchedRoutes = routes.filter(r => r.number.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    const matchedDrivers = drivers.filter(d => d.name.toLowerCase().includes(q) || (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q)));

    setSearchResults({
      buses: matchedBuses.slice(0, 3),
      routes: matchedRoutes.slice(0, 3),
      drivers: matchedDrivers.slice(0, 3)
    });
  }, [searchQuery, buses, routes, drivers]);

  // Handle outside click to close search dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/buses', label: 'Buses', icon: Bus },
    { to: '/admin/routes', label: 'Routes', icon: GitFork },
    { to: '/admin/stops', label: 'Stops', icon: MapPin },
    { to: '/admin/drivers', label: 'Drivers', icon: UserCheck },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone }
  ];

  const hasResults = searchResults.buses.length > 0 || searchResults.routes.length > 0 || searchResults.drivers.length > 0;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* 1. Backdrop Overlay for mobile sidebar */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-30 lg:hidden"
        ></div>
      )}

      {/* 2. Fixed Left Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-65 bg-slate-900 text-white z-40 transform transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col justify-between select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl text-white">
                <Bus size={20} className="stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h1 className="font-extrabold text-sm tracking-tight text-white">CityBus Admin</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold block mt-0.5">Control Center</span>
              </div>
            </div>
            
            {/* Close button inside sidebar on mobile */}
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 group ${
                    isActive 
                      ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-extrabold' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={`transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight size={12} className={`opacity-0 group-hover:opacity-100 transition ${isActive ? 'opacity-100 text-blue-500' : ''}`} />
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition duration-200"
          >
            <LogOut size={16} />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
          
          {/* Left search & hamburger */}
          <div className="flex items-center flex-1 max-w-lg">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 mr-3 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            >
              <Menu size={20} />
            </button>

            {/* Global Search Container */}
            <div ref={searchContainerRef} className="relative w-full text-left">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  placeholder="Global search buses, routes, drivers..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>

              {/* Floating Dropdown Results */}
              {showSearchDropdown && searchQuery.trim() && (
                <div className="absolute top-11 left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 z-50 max-h-80 overflow-y-auto no-scrollbar animate-fade-in-slide-up text-slate-800 text-xs">
                  {!hasResults ? (
                    <div className="text-center py-4 text-slate-400 font-semibold">No matches found for "{searchQuery}"</div>
                  ) : (
                    <div className="space-y-4 font-semibold">
                      {/* Buses Results */}
                      {searchResults.buses.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider pl-1">Buses Fleet</p>
                          <div className="space-y-1">
                            {searchResults.buses.map(b => (
                              <div
                                key={b.id}
                                onClick={() => {
                                  setShowSearchDropdown(false);
                                  navigate('/admin/buses');
                                }}
                                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                              >
                                <span className="font-bold text-slate-700">{b.number}</span>
                                <span className="text-[10px] text-slate-400 font-normal">{b.routeName?.split(' via ')[0]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Routes Results */}
                      {searchResults.routes.length > 0 && (
                        <div className="space-y-1.5 border-t border-slate-50 pt-3">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider pl-1">Transit Lines</p>
                          <div className="space-y-1">
                            {searchResults.routes.map(r => (
                              <div
                                key={r.id}
                                onClick={() => {
                                  setShowSearchDropdown(false);
                                  navigate('/admin/routes');
                                }}
                                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                              >
                                <span className="bg-primary-light text-primary text-[9px] font-black px-1.5 py-0.5 rounded">
                                  {r.number}
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal truncate max-w-[200px]">{r.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Drivers Results */}
                      {searchResults.drivers.length > 0 && (
                        <div className="space-y-1.5 border-t border-slate-50 pt-3">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider pl-1">Drivers Duty</p>
                          <div className="space-y-1">
                            {searchResults.drivers.map(d => (
                              <div
                                key={d.id}
                                onClick={() => {
                                  setShowSearchDropdown(false);
                                  navigate('/admin/drivers');
                                }}
                                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                              >
                                <span className="text-slate-700 font-bold">{d.name}</span>
                                <span className="text-[9px] text-slate-400 font-normal font-mono">{d.licenseNumber}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Icons & Avatar */}
          <div className="flex items-center gap-4 shrink-0">
            
            {/* View Passenger App */}
            <NavLink
              to="/home"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition"
              title="Go to Passenger View"
            >
              <span>Passenger App</span>
              <ExternalLink size={12} />
            </NavLink>

            {/* Notifications Alert Bell (Count of Open Issues) */}
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="relative p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-xl transition"
              title="Open Incident Reports"
            >
              <Bell size={18} />
              {openIssuesCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center border border-white animate-pulse">
                  {openIssuesCount}
                </span>
              )}
            </button>

            {/* Admin Profile Capsule */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-1 shadow-sm">
              <div className="w-7 h-7 bg-primary text-white font-extrabold text-xs rounded-full flex items-center justify-center border border-slate-200">
                A
              </div>
              <div className="text-left hidden md:block">
                <p className="text-[10px] font-extrabold text-slate-800 leading-tight">Admin System</p>
                <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Super Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable page body content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar bg-slate-50 relative">
          <div className="animate-fade-in-slide-up">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .animate-fade-in-slide-up {
          animation: fadeSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
