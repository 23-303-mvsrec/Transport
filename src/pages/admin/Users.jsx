import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBuses } from '../../contexts/BusContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/shared/Badge';
import { Users as UsersIcon, Search, UserCheck, Star, Clock, Calendar, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

export const Users = () => {
  const { routes } = useBuses();
  const { isMock } = useAuth();

  // State lists
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);

  // 1. Sync users real-time
  useEffect(() => {
    setLoading(true);
    if (isFirebaseEnabled) {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const syncMock = () => {
        let stored = localStorage.getItem('citybus_mock_users');
        if (!stored) {
          // Default mock user seed list
          const defaults = [
            { id: 'passenger-uid-mock', name: 'Aarav Sharma', email: 'user@citybus.in', phone: '9445512001', role: 'user', favoriteRouteIds: ['R-01', 'R-02'], createdAt: '2026-01-15T08:30:00Z', isActive: true },
            { id: 'usr-02', name: 'Gurjit Singh', email: 'gurjit@gmail.com', phone: '9812390022', role: 'user', favoriteRouteIds: ['R-03'], createdAt: '2026-03-22T14:15:00Z', isActive: true },
            { id: 'usr-04', name: 'Fleet Administrator', email: 'admin@citybus.in', phone: '9999912345', role: 'admin', favoriteRouteIds: [], createdAt: '2026-01-01T00:00:00Z', isActive: true },
            { id: 'usr-06', name: 'Simran Kaur', email: 'simran.k@yahoo.com', phone: '9445578901', role: 'user', favoriteRouteIds: [], createdAt: '2026-04-05T18:20:00Z', isActive: false },
          ];
          localStorage.setItem('citybus_mock_users', JSON.stringify(defaults));
          setUsers(defaults);
        } else {
          try {
            setUsers(JSON.parse(stored));
          } catch (e) {}
        }
        setLoading(false);
      };

      syncMock();
      const interval = setInterval(syncMock, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleToggleStatus = async (user) => {
    const nextActive = !user.isActive;
    try {
      if (isFirebaseEnabled) {
        await updateDoc(doc(db, 'users', user.id), { isActive: nextActive });
      } else {
        const stored = JSON.parse(localStorage.getItem('citybus_mock_users') || '[]');
        const updated = stored.map(u => u.id === user.id ? { ...u, isActive: nextActive } : u);
        localStorage.setItem('citybus_mock_users', JSON.stringify(updated));
        setUsers(updated);
      }
      toast.success(`User status set to ${nextActive ? 'Active' : 'Suspended'}`);
    } catch (e) {
      toast.error('Failed to change user status');
    }
  };

  const toggleRowExpand = (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'User Identity (Click to expand)',
      render: (user) => {
        const isExpanded = expandedUserId === user.id;
        return (
          <div 
            onClick={() => toggleRowExpand(user.id)}
            className="cursor-pointer select-none text-left"
          >
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800">{user.name}</span>
              {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">{user.email}</div>
            
            {/* Expanded Content (Bookmarks & Mock Trip History) */}
            {isExpanded && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 text-[10px] text-slate-500 font-semibold animate-fade-in-slide-up">
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    Bookmarked Transit Lines
                  </p>
                  {user.favoriteRouteIds && user.favoriteRouteIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {user.favoriteRouteIds.map(rid => {
                        const route = routes.find(r => r.id === rid);
                        return (
                          <span key={rid} className="bg-primary-light text-primary font-black px-2 py-0.5 rounded border border-primary/10">
                            {route ? `${route.number}: ${route.name}` : rid}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No routes saved to bookmarks</p>
                  )}
                </div>

                <div className="border-t border-slate-200/50 pt-2">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock size={10} className="text-blue-500" />
                    Trip logs History
                  </p>
                  <p className="text-slate-400 italic">No recent passenger journeys compiled</p>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'role',
      label: 'Classification',
      render: (user) => {
        if (user.role === 'admin') return <Badge variant="danger">Admin</Badge>;
        if (user.role === 'driver') return <Badge variant="success">Driver</Badge>;
        return <Badge variant="info">Passenger</Badge>;
      }
    },
    {
      key: 'phone',
      label: 'Contact Phone',
      render: (user) => <span className="font-mono text-slate-500 font-semibold">{user.phone ? `+91 ${user.phone}` : 'N/A'}</span>
    },
    {
      key: 'createdAt',
      label: 'Joined Date',
      render: (user) => {
        if (!user.createdAt) return 'N/A';
        const date = new Date(user.createdAt);
        return <span className="text-slate-400 font-bold">{date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
      }
    },
    {
      key: 'isActive',
      label: 'Status Toggle',
      render: (user) => (
        <div className="flex items-center gap-2">
          <Badge variant={user.isActive ? 'success' : 'danger'}>
            {user.isActive ? 'Active' : 'Suspended'}
          </Badge>
          <button
            onClick={() => handleToggleStatus(user)}
            className={`text-[9px] font-black px-2 py-1 rounded transition-colors ${
              user.isActive 
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100'
            }`}
          >
            {user.isActive ? 'Suspend' : 'Activate'}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-left">
        <h3 className="font-extrabold text-slate-800 text-lg">Registered Users Directory</h3>
        <p className="text-xs text-slate-400 mt-0.5">View, suspend, and audit passenger and employee accounts in Nabha</p>
      </div>

      {/* Main Datatable */}
      <DataTable 
        columns={columns} 
        data={users} 
        isLoading={loading} 
        searchPlaceholder="Search users by name or email..."
      />

    </div>
  );
};

export default Users;
