import React, { useState, useEffect } from 'react';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  Wrench, 
  Route as RouteIcon,
  MapPin,
  Bus
} from 'lucide-react';
import Badge from '../../components/shared/Badge';

// Helper to compute relative time
const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  
  if (diffMs < 0) return 'Just now'; // handle tiny sync offsets
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export const Alerts = () => {
  const { routes } = useBuses();
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Delays' | 'Route Updates' | 'Info' | 'Maintenance'

  const userId = currentUser?.uid || 'guest';
  const localStorageKey = `${userId}_readAnnouncements`;

  // Real-time synchronization of announcements
  useEffect(() => {
    setLoading(true);
    if (isFirebaseEnabled) {
      const qAnnouncements = query(
        collection(db, 'announcements'),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(qAnnouncements, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAnnouncements(list);
        setLoading(false);
      }, (err) => {
        console.error('Failed to subscribe to announcements:', err);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Mock mode: local storage sync
      const syncMock = () => {
        let localData = [];
        try {
          const stored = localStorage.getItem('citybus_mock_announcements');
          if (stored) {
            localData = JSON.parse(stored);
          }
        } catch (e) {
          console.error(e);
        }
        const activeOnly = localData.filter(a => a.isActive);
        setAnnouncements(activeOnly);
        setLoading(false);
      };

      syncMock();
      const interval = setInterval(syncMock, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // Mark all active announcements as read when they load/change on this page
  useEffect(() => {
    if (announcements.length > 0) {
      let readIds = [];
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          readIds = JSON.parse(stored);
        }
      } catch (e) {}

      const activeIds = announcements.map(a => a.id);
      const updatedReadIds = Array.from(new Set([...readIds, ...activeIds]));
      localStorage.setItem(localStorageKey, JSON.stringify(updatedReadIds));
    }
  }, [announcements, localStorageKey]);

  // Sort: priority (high first), then createdAt (newest first)
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const weightA = priorityWeight[a.priority] || 0;
    const weightB = priorityWeight[b.priority] || 0;
    if (weightB !== weightA) {
      return weightB - weightA;
    }
    const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return dateB - dateA;
  });

  // Filter tabs logic
  const filteredAnnouncements = sortedAnnouncements.filter(ann => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Delays') return ann.type === 'delay';
    if (activeTab === 'Route Updates') return ann.type === 'route';
    if (activeTab === 'Info') return ann.type === 'info';
    if (activeTab === 'Maintenance') return ann.type === 'maintenance';
    return true;
  });

  const getAlertIcon = (type) => {
    switch (type) {
      case 'delay':
        return <AlertTriangle className="text-red-500" size={18} />;
      case 'route':
        return <RouteIcon className="text-blue-500" size={18} />;
      case 'maintenance':
        return <Wrench className="text-yellow-600" size={18} />;
      default:
        return <Info className="text-teal-500" size={18} />;
    }
  };

  const getIconBgColor = (type) => {
    switch (type) {
      case 'delay':
        return 'bg-red-50 text-red-500';
      case 'route':
        return 'bg-blue-50 text-blue-500';
      case 'maintenance':
        return 'bg-yellow-50 text-yellow-600';
      default:
        return 'bg-teal-50 text-teal-500';
    }
  };

  const tabs = [
    { id: 'All', label: 'All' },
    { id: 'Delays', label: 'Delays' },
    { id: 'Route Updates', label: 'Route Updates' },
    { id: 'Info', label: 'Info' },
    { id: 'Maintenance', label: 'Maintenance' }
  ];

  return (
    <div className="p-5 space-y-6">
      {/* Page Title */}
      <div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Transit Alerts</h3>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">Real-time scheduling updates and road notifications</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl border shrink-0 transition-all ${
              activeTab === tab.id
                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements Log List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
            <p className="text-xs font-semibold mt-4">Streaming announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-xs text-slate-400 shadow-premium flex flex-col items-center justify-center">
            <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full mb-3">
              <Bell size={28} />
            </div>
            <p className="font-extrabold text-sm text-slate-700">All clear!</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">No announcements right now 🎉</p>
          </div>
        ) : (
          filteredAnnouncements.map((alert) => {
            const affectedRoute = routes.find(r => r.id === alert.affectedRouteId);
            const isHigh = alert.priority === 'high';

            return (
              <div
                key={alert.id}
                className={`bg-white border rounded-3xl p-5 shadow-premium flex gap-4 transition duration-300 hover:shadow-glass ${
                  isHigh 
                    ? 'border-l-4 border-l-red-500 bg-red-50/10 border-red-100/50' 
                    : 'border-slate-100/80'
                }`}
              >
                {/* Icon wrapper */}
                <div className={`p-3 rounded-2xl h-fit shrink-0 ${getIconBgColor(alert.type)}`}>
                  {getAlertIcon(alert.type)}
                </div>

                <div className="flex-1 space-y-2 text-left">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={isHigh ? 'danger' : alert.priority === 'medium' ? 'warning' : 'neutral'}>
                        {alert.priority?.toUpperCase()} PRIORITY
                      </Badge>
                      <span className="capitalize text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md">
                        {alert.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {getRelativeTime(alert.createdAt || alert.timestamp)}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs text-slate-800 leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    {alert.message}
                  </p>

                  {/* Route & Bus references badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {affectedRoute && (
                      <div className="flex items-center gap-1 text-[9px] font-extrabold text-primary bg-primary-light px-2.5 py-1 rounded-lg border border-primary/10">
                        <MapPin size={9} />
                        <span>Line: {affectedRoute.number}</span>
                      </div>
                    )}

                    {alert.affectedBusNumber && (
                      <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Bus size={9} />
                        <span>Bus: {alert.affectedBusNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Alerts;
