import React, { useState, useEffect } from 'react';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  getDocs
} from 'firebase/firestore';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/shared/Badge';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const Buses = () => {
  const { routes, addBus, updateBus, deleteBus } = useBuses();
  const { isMock } = useAuth();

  // State lists
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');

  // Drawer / Form state
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields
  const [number, setNumber] = useState('');
  const [routeId, setRouteId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [capacity, setCapacity] = useState(52);
  const [isAC, setIsAC] = useState(false);
  const [type, setType] = useState('regular');
  const [status, setStatus] = useState('idle');

  // 1. Sync Buses Real-Time
  useEffect(() => {
    setLoading(true);
    if (isFirebaseEnabled) {
      const unsubscribe = onSnapshot(collection(db, 'buses'), (snapshot) => {
        setBuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const syncMock = () => {
        const stored = localStorage.getItem('citybus_mock_buses');
        if (stored) {
          try {
            setBuses(JSON.parse(stored));
          } catch (e) {}
        }
        setLoading(false);
      };
      syncMock();
      const interval = setInterval(syncMock, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // 2. Sync Drivers list for duty assignment
  useEffect(() => {
    if (isFirebaseEnabled) {
      const unsubscribe = onSnapshot(collection(db, 'drivers'), (snapshot) => {
        setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    } else {
      const stored = localStorage.getItem('citybus_mock_drivers');
      if (stored) {
        try {
          setDrivers(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  const resetForm = () => {
    setNumber('');
    setRouteId(routes[0]?.id || '');
    setDriverId('');
    setCapacity(52);
    setIsAC(false);
    setType('regular');
    setStatus('idle');
    setIsEditing(false);
    setEditingId('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (bus) => {
    setNumber(bus.number);
    setRouteId(bus.routeId || '');
    setDriverId(bus.driverId || '');
    setCapacity(bus.capacity || 52);
    setIsAC(bus.isAC || false);
    setType(bus.type || 'regular');
    setStatus(bus.status || 'idle');
    setEditingId(bus.id);
    setIsEditing(true);
    setIsOpen(true);
  };

  // Change status directly from the table row dropdown
  const handleUpdateStatus = async (busId, newStatus) => {
    try {
      if (isFirebaseEnabled) {
        await updateDoc(doc(db, 'buses', busId), { status: newStatus });
      } else {
        const stored = JSON.parse(localStorage.getItem('citybus_mock_buses') || '[]');
        const updated = stored.map(b => b.id === busId ? { ...b, status: newStatus } : b);
        localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
        setBuses(updated);
      }
      toast.success('Bus status updated');
    } catch (e) {
      toast.error('Failed to change status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!number.trim()) {
      toast.error('Registration plate number is required');
      return;
    }

    const matchedRoute = routes.find(r => r.id === routeId);
    const matchedDriver = drivers.find(d => d.uid === driverId || d.id === driverId);

    const busData = {
      number: number.toUpperCase().trim(),
      routeId,
      routeName: matchedRoute ? `${matchedRoute.number} - ${matchedRoute.name}` : 'Unassigned Route',
      driverId: driverId || '',
      driverName: matchedDriver ? matchedDriver.name : 'Unassigned',
      capacity: parseInt(capacity),
      isAC,
      type,
      status,
      lastUpdated: new Date().toISOString()
    };

    try {
      const busDocId = isEditing ? editingId : `bus-${Date.now()}`;
      
      if (isEditing) {
        await updateBus(busDocId, busData);
      } else {
        await addBus({ id: busDocId, ...busData, occupancy: 0, isOnTrip: false, currentLocation: null });
      }

      // Sync driver assignment in drivers collection
      if (driverId) {
        if (isFirebaseEnabled) {
          await updateDoc(doc(db, 'drivers', driverId), { assignedBusId: busDocId });
        } else {
          const storedDrivers = JSON.parse(localStorage.getItem('citybus_mock_drivers') || '[]');
          const updated = storedDrivers.map(d => (d.uid === driverId || d.id === driverId) ? { ...d, assignedBusId: busDocId } : d);
          localStorage.setItem('citybus_mock_drivers', JSON.stringify(updated));
        }
      }

      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to save bus fleet record');
    }
  };

  const handleDeleteBus = async (bus) => {
    // Block delete if bus is on a trip
    if (bus.isOnTrip) {
      toast.error('Bus is currently on a trip');
      return;
    }

    const confirmDelete = window.confirm(`DELETE BUS FLLET RECORD:\nAre you sure you want to remove bus ${bus.number}?`);
    if (!confirmDelete) return;

    try {
      await deleteBus(bus.id);
      
      // Clear driver assignment
      if (bus.driverId) {
        if (isFirebaseEnabled) {
          await updateDoc(doc(db, 'drivers', bus.driverId), { assignedBusId: null });
        } else {
          const storedDrivers = JSON.parse(localStorage.getItem('citybus_mock_drivers') || '[]');
          const updated = storedDrivers.map(d => d.uid === bus.driverId ? { ...d, assignedBusId: null } : d);
          localStorage.setItem('citybus_mock_drivers', JSON.stringify(updated));
        }
      }
    } catch (err) {
      toast.error('Failed to delete bus');
    }
  };

  // Filter list of buses
  const filteredBuses = buses.filter(bus => {
    const matchesStatus = statusFilter === 'all' || bus.status === statusFilter;
    const matchesRoute = routeFilter === 'all' || bus.routeId === routeFilter;
    return matchesStatus && matchesRoute;
  });

  // Table columns definition
  const columns = [
    {
      key: 'number',
      label: 'Bus No',
      render: (bus) => <span className="font-extrabold text-slate-800">{bus.number}</span>
    },
    {
      key: 'routeName',
      label: 'Route',
      render: (bus) => {
        const route = routes.find(r => r.id === bus.routeId);
        return route ? (
          <span className="text-slate-600 font-semibold">{route.number}: {route.name}</span>
        ) : (
          <span className="text-slate-400 font-medium">Unassigned</span>
        );
      }
    },
    {
      key: 'driverName',
      label: 'Driver',
      render: (bus) => <span className="text-slate-500 font-bold">{bus.driverName || 'Unassigned'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (bus) => {
        if (bus.isOnTrip) {
          return <Badge variant="success">ON TRIP</Badge>;
        }
        return (
          <select
            value={bus.status}
            onChange={(e) => handleUpdateStatus(bus.id, e.target.value)}
            className={`text-[10px] font-bold py-1.5 px-2.5 rounded-full border-none outline-none cursor-pointer ${
              bus.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
              bus.status === 'maintenance' ? 'bg-rose-50 text-rose-600' :
              bus.status === 'offline' ? 'bg-slate-100 text-slate-500' :
              'bg-amber-50 text-amber-600' // idle
            }`}
          >
            <option value="idle">Idle</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>
        );
      }
    },
    {
      key: 'occupancy',
      label: 'Occupancy',
      render: (bus) => {
        const fillPercent = Math.min(100, ((bus.occupancy || 0) / (bus.capacity || 52)) * 100);
        return (
          <div className="w-24 text-left">
            <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
              <span>{bus.occupancy || 0} / {bus.capacity || 52} seats</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  fillPercent < 40 ? 'bg-emerald-500' :
                  fillPercent < 75 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${fillPercent}%` }}
              ></div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'isOnTrip',
      label: 'On Trip',
      render: (bus) => bus.isOnTrip ? <Badge variant="success">YES</Badge> : <Badge variant="neutral">NO</Badge>
    },
    {
      key: 'lastUpdated',
      label: 'Last GPS Update',
      render: (bus) => {
        if (!bus.lastUpdated) return 'N/A';
        const date = new Date(bus.lastUpdated);
        return <span className="font-mono text-slate-400 font-bold">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (bus) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenEdit(bus)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="Edit Bus"
          >
            <Edit2 size={13} />
          </button>
          <button 
            onClick={() => handleDeleteBus(bus)}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
            title="Delete Bus"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header and CTA */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h3 className="font-extrabold text-slate-800 text-lg">Buses Fleet Management</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage and provision active vehicles on Nabha transit lines</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          <span>Add Bus Fleet</span>
        </button>
      </div>

      {/* Filtering Log Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-start text-left text-xs font-semibold text-slate-500">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 block font-bold uppercase">Filter Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="idle">Idle</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 block font-bold uppercase">Filter Route</label>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
          >
            <option value="all">All Routes</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.number}: {r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Datatable */}
      <DataTable 
        columns={columns} 
        data={filteredBuses} 
        isLoading={loading} 
        searchPlaceholder="Search by plate number or driver..."
      />

      {/* Drawer Overlay Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-md p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-up text-slate-800">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {isEditing ? `Edit Vehicle details (${number})` : 'Register New Bus Fleet'}
                </h4>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-left">
                <div className="space-y-1">
                  <label className="text-slate-500">Vehicle Registration Plate (e.g. PB-11-K-1005)</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="e.g. PB-11-K-1005"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Assigned Transit Route</label>
                  <select
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.number}: {r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Assign Driver</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                  >
                    <option value="">Spare / Unassigned</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.uid || d.id}>{d.name} ({d.phone})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Seating Capacity</label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Operational Class</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="regular">Regular</option>
                      <option value="express">Express</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Air Conditioning</label>
                    <div className="flex gap-4 items-center pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={isAC}
                          onChange={() => setIsAC(true)}
                          className="accent-primary"
                        />
                        <span>AC Bus</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={!isAC}
                          onChange={() => setIsAC(false)}
                          className="accent-primary"
                        />
                        <span>Standard</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">Fleet Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="idle">Idle</option>
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition duration-300"
                >
                  <span>{isEditing ? 'Save Vehicle Updates' : 'Add Vehicle to Fleet'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buses;
