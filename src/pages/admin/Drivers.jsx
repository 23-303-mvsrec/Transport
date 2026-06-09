import React, { useState, useEffect } from 'react';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { 
  collection, 
  onSnapshot, 
  setDoc,
  updateDoc, 
  doc, 
  deleteDoc
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/shared/Badge';
import { Plus, Edit2, Trash2, X, UserCheck, Phone, Star, ShieldAlert, Key } from 'lucide-react';
import toast from 'react-hot-toast';

// Firebase configuration for secondary auth app creation
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const Drivers = () => {
  const { buses, routes } = useBuses();
  const { isMock } = useAuth();

  // Lists States
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Drawer States
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [assignedBusId, setAssignedBusId] = useState('');
  const [status, setStatus] = useState('on-duty');
  const [rating, setRating] = useState(4.8);

  // 1. Sync Drivers Real-time
  useEffect(() => {
    setLoading(true);
    if (isFirebaseEnabled) {
      const unsubscribe = onSnapshot(collection(db, 'drivers'), (snapshot) => {
        setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const syncMock = () => {
        try {
          const stored = localStorage.getItem('citybus_mock_drivers');
          if (stored) setDrivers(JSON.parse(stored));
        } catch (e) {}
        setLoading(false);
      };
      syncMock();
      const interval = setInterval(syncMock, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const resetForm = () => {
    setName('');
    setPhone('');
    setLicenseNumber('');
    setAssignedBusId('');
    setStatus('on-duty');
    setRating(4.8);
    setIsEditing(false);
    setEditingId('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (driver) => {
    setName(driver.name);
    setPhone(driver.phone || '');
    setLicenseNumber(driver.licenseNumber || '');
    setAssignedBusId(driver.assignedBusId || '');
    setStatus(driver.status || 'on-duty');
    setRating(driver.rating || 4.8);
    setEditingId(driver.id || driver.uid);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !licenseNumber.trim()) {
      toast.error('Name, Phone, and License Number are required');
      return;
    }

    const matchedBus = buses.find(b => b.id === assignedBusId);
    const matchedRoute = matchedBus ? routes.find(r => r.id === matchedBus.routeId) : null;

    if (isEditing) {
      // Edit Driver: update Firestore/mock only (not auth email)
      const driverData = {
        name: name.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.toUpperCase().trim(),
        assignedBusId: assignedBusId || null,
        assignedRouteId: matchedBus?.routeId || null,
        status,
        rating: parseFloat(rating),
      };

      try {
        if (isFirebaseEnabled) {
          // Update doc in drivers collection
          await updateDoc(doc(db, 'drivers', editingId), driverData);
          // Update doc in users collection
          await updateDoc(doc(db, 'users', editingId), { name: name.trim(), phone: phone.trim() });
          
          // Sync bus details if assigned
          if (assignedBusId) {
            await updateDoc(doc(db, 'buses', assignedBusId), {
              driverId: editingId,
              driverName: name.trim()
            });
          }
        } else {
          const storedDrivers = JSON.parse(localStorage.getItem('citybus_mock_drivers') || '[]');
          const updated = storedDrivers.map(d => d.id === editingId ? { ...d, ...driverData } : d);
          localStorage.setItem('citybus_mock_drivers', JSON.stringify(updated));
          setDrivers(updated);

          // Update users list mock
          const storedUsers = JSON.parse(localStorage.getItem('citybus_mock_users') || '[]');
          const updatedUsers = storedUsers.map(u => u.id === editingId ? { ...u, name: name.trim(), phone: phone.trim() } : u);
          localStorage.setItem('citybus_mock_users', JSON.stringify(updatedUsers));

          if (assignedBusId) {
            const storedBuses = JSON.parse(localStorage.getItem('citybus_mock_buses') || '[]');
            const updatedBuses = storedBuses.map(b => b.id === assignedBusId ? { ...b, driverId: editingId, driverName: name.trim() } : b);
            localStorage.setItem('citybus_mock_buses', JSON.stringify(updatedBuses));
          }
        }
        toast.success('Driver profile updated');
        setIsOpen(false);
        resetForm();
      } catch (err) {
        toast.error('Failed to update driver details');
      }
    } else {
      // Add Driver: creates Firebase Auth account email = driverX@citybus.gov.in
      const driverNumber = drivers.length + 1;
      const email = `driver${driverNumber}@citybus.gov.in`;
      const password = `CityBus@${Math.floor(1000 + Math.random() * 9000)}`;

      let uid = `driver-${Date.now()}`;

      try {
        if (isFirebaseEnabled) {
          // Create Auth account using secondary app trick to prevent admin logout
          const secondaryAppName = `TempApp-${Date.now()}`;
          const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
          const secondaryAuth = getAuth(secondaryApp);
          
          const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          uid = credential.user.uid;
          await deleteApp(secondaryApp);

          // Create users doc
          const userDocRef = doc(db, 'users', uid);
          await setDoc(userDocRef, {
            id: uid,
            name: name.trim(),
            email,
            phone: phone.trim(),
            role: 'driver',
            favoriteRouteIds: [],
            createdAt: new Date().toISOString(),
            isActive: true
          });

          // Create drivers doc
          const driverDocRef = doc(db, 'drivers', uid);
          await setDoc(driverDocRef, {
            id: uid,
            uid,
            name: name.trim(),
            phone: phone.trim(),
            licenseNumber: licenseNumber.toUpperCase().trim(),
            assignedBusId: assignedBusId || null,
            assignedRouteId: matchedBus?.routeId || null,
            status,
            rating: parseFloat(rating),
            totalTrips: 0,
            joinDate: new Date().toISOString().slice(0, 10)
          });

          if (assignedBusId) {
            await updateDoc(doc(db, 'buses', assignedBusId), {
              driverId: uid,
              driverName: name.trim()
            });
          }
        } else {
          // Mock creation
          uid = `mock-driver-uid-${Date.now()}`;
          const newDriver = {
            id: uid,
            uid,
            name: name.trim(),
            email,
            phone: phone.trim(),
            licenseNumber: licenseNumber.toUpperCase().trim(),
            assignedBusId: assignedBusId || null,
            assignedRouteId: matchedBus?.routeId || null,
            status,
            rating: parseFloat(rating),
            totalTrips: 0,
            joinDate: new Date().toISOString().slice(0, 10)
          };

          const storedDrivers = JSON.parse(localStorage.getItem('citybus_mock_drivers') || '[]');
          storedDrivers.push(newDriver);
          localStorage.setItem('citybus_mock_drivers', JSON.stringify(storedDrivers));
          setDrivers(storedDrivers);

          // Mock users
          const storedUsers = JSON.parse(localStorage.getItem('citybus_mock_users') || '[]');
          storedUsers.push({
            id: uid,
            name: name.trim(),
            email,
            phone: phone.trim(),
            role: 'driver',
            createdAt: new Date().toISOString(),
            isActive: true
          });
          localStorage.setItem('citybus_mock_users', JSON.stringify(storedUsers));

          if (assignedBusId) {
            const storedBuses = JSON.parse(localStorage.getItem('citybus_mock_buses') || '[]');
            const updatedBuses = storedBuses.map(b => b.id === assignedBusId ? { ...b, driverId: uid, driverName: name.trim() } : b);
            localStorage.setItem('citybus_mock_buses', JSON.stringify(updatedBuses));
          }
        }

        // Set generated credentials to show in modal
        setGeneratedEmail(email);
        setGeneratedPassword(password);
        setShowPasswordModal(true);

        setIsOpen(false);
        resetForm();
      } catch (err) {
        toast.error(`Account registration failed: ${err.message}`);
      }
    }
  };

  const handleDeleteDriver = async (driver) => {
    const confirmDelete = window.confirm(`DELETE DRIVER:\nAre you sure you want to remove driver ${driver.name}?`);
    if (!confirmDelete) return;

    try {
      const driverId = driver.id || driver.uid;
      if (isFirebaseEnabled) {
        await deleteDoc(doc(db, 'drivers', driverId));
        await deleteDoc(doc(db, 'users', driverId));

        if (driver.assignedBusId) {
          await updateDoc(doc(db, 'buses', driver.assignedBusId), {
            driverId: '',
            driverName: 'Unassigned'
          });
        }
      } else {
        const storedDrivers = JSON.parse(localStorage.getItem('citybus_mock_drivers') || '[]');
        const updated = storedDrivers.filter(d => d.id !== driverId);
        localStorage.setItem('citybus_mock_drivers', JSON.stringify(updated));
        setDrivers(updated);

        const storedUsers = JSON.parse(localStorage.getItem('citybus_mock_users') || '[]');
        const updatedUsers = storedUsers.filter(u => u.id !== driverId);
        localStorage.setItem('citybus_mock_users', JSON.stringify(updatedUsers));

        if (driver.assignedBusId) {
          const storedBuses = JSON.parse(localStorage.getItem('citybus_mock_buses') || '[]');
          const updatedBuses = storedBuses.map(b => b.id === driver.assignedBusId ? { ...b, driverId: '', driverName: 'Unassigned' } : b);
          localStorage.setItem('citybus_mock_buses', JSON.stringify(updatedBuses));
        }
      }
      toast.success('Driver removed from database');
    } catch (err) {
      toast.error('Failed to remove driver');
    }
  };

  // Remove Bus Assignment action
  const handleRemoveBusAssignment = async (driver) => {
    const driverId = driver.id || driver.uid;
    try {
      if (isFirebaseEnabled) {
        await updateDoc(doc(db, 'drivers', driverId), { assignedBusId: null, assignedRouteId: null });
        if (driver.assignedBusId) {
          await updateDoc(doc(db, 'buses', driver.assignedBusId), { driverId: '', driverName: 'Unassigned' });
        }
      } else {
        const storedDrivers = JSON.parse(localStorage.getItem('citybus_mock_drivers') || '[]');
        const updated = storedDrivers.map(d => d.id === driverId ? { ...d, assignedBusId: null, assignedRouteId: null } : d);
        localStorage.setItem('citybus_mock_drivers', JSON.stringify(updated));
        setDrivers(updated);

        if (driver.assignedBusId) {
          const storedBuses = JSON.parse(localStorage.getItem('citybus_mock_buses') || '[]');
          const updatedBuses = storedBuses.map(b => b.id === driver.assignedBusId ? { ...b, driverId: '', driverName: 'Unassigned' } : b);
          localStorage.setItem('citybus_mock_buses', JSON.stringify(updatedBuses));
        }
      }
      toast.success('Bus assignment removed');
    } catch (err) {
      toast.error('Failed to remove assignment');
    }
  };

  // Filter unassigned buses + current assigned bus for selector
  const availableBuses = buses.filter(bus => {
    const isUnassigned = !bus.driverId || bus.driverId === '';
    const isCurrentlyAssignedToThisDriver = isEditing && bus.driverId === editingId;
    return isUnassigned || isCurrentlyAssignedToThisDriver;
  });

  const columns = [
    {
      key: 'name',
      label: 'Operator Name',
      render: (driver) => (
        <span className="font-extrabold text-slate-800 flex items-center gap-2">
          <UserCheck size={14} className="text-primary shrink-0" />
          <span>{driver.name}</span>
        </span>
      )
    },
    {
      key: 'phone',
      label: 'Contact Phone',
      render: (driver) => (
        <span className="text-slate-500 font-semibold flex items-center gap-1">
          <Phone size={11} className="text-slate-400" />
          <span>{driver.phone}</span>
        </span>
      )
    },
    {
      key: 'licenseNumber',
      label: 'License Number',
      render: (driver) => <span className="font-mono text-slate-500 font-bold">{driver.licenseNumber}</span>
    },
    {
      key: 'assignedBusId',
      label: 'Assigned Bus',
      render: (driver) => {
        const bus = buses.find(b => b.id === driver.assignedBusId);
        if (bus) {
          return (
            <div className="flex items-center gap-2">
              <span className="text-slate-700 font-bold">{bus.number}</span>
              <button
                onClick={() => handleRemoveBusAssignment(driver)}
                className="text-rose-500 hover:text-rose-700 font-bold text-[9px] bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded"
                title="Remove assignment"
              >
                Unassign
              </button>
            </div>
          );
        }
        return <span className="text-slate-400 font-medium">Spare / Unassigned</span>;
      }
    },
    {
      key: 'rating',
      label: 'Performance',
      render: (driver) => (
        <span className="text-slate-500 font-bold flex items-center gap-1">
          <Star size={12} className="text-amber-500 fill-amber-500" />
          <span>{driver.rating} ({driver.totalTrips || 0} trips)</span>
        </span>
      )
    },
    {
      key: 'status',
      label: 'Duty Status',
      render: (driver) => (
        <Badge variant={driver.status === 'on-duty' ? 'success' : driver.status === 'off-duty' ? 'neutral' : 'warning'}>
          {driver.status?.toUpperCase()?.replace('-', ' ')}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (driver) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenEdit(driver)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="Edit Driver"
          >
            <Edit2 size={13} />
          </button>
          <button 
            onClick={() => handleDeleteDriver(driver)}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
            title="Delete Driver"
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
          <h3 className="font-extrabold text-slate-800 text-lg">Drivers & Operators</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage operator licensing, bus duties, and active ratings in Nabha</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          <span>Register New Driver</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable 
        columns={columns} 
        data={drivers} 
        isLoading={loading} 
        searchPlaceholder="Search operator name or license..."
      />

      {/* Add/Edit Drawer Form Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-md p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-up text-slate-800">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {isEditing ? `Modify Operator (${name})` : 'Register New Driver'}
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
                  <label className="text-slate-500">Driver Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jaspreet Singh"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Mobile Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98XXX XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">License ID</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="PB-11-XXXX-XXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Assign Vehicle</label>
                    <select
                      value={assignedBusId}
                      onChange={(e) => setAssignedBusId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="">Spare / Unassigned</option>
                      {availableBuses.map(b => (
                        <option key={b.id} value={b.id}>{b.number}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">Duty Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="on-duty">On Duty</option>
                      <option value="off-duty">Off Duty</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Duty Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition duration-300"
                >
                  <span>{isEditing ? 'Save Operator Changes' : 'Register Operator'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* GENERATED CREDENTIALS MODAL (SHOW ONCE) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-slate-800 text-left space-y-4 animate-fade-in-slide-up">
            <div className="flex items-center gap-2 text-rose-500 pb-2 border-b border-slate-100">
              <ShieldAlert size={22} />
              <h4 className="font-extrabold text-sm text-slate-900">Roster Account Configured</h4>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3 font-semibold text-slate-600">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Assigned Email</p>
                <p className="font-mono text-slate-800 font-bold select-all bg-white p-2 rounded-lg border border-slate-100">{generatedEmail}</p>
              </div>
              
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Assigned Password</p>
                <p className="font-mono text-slate-800 font-bold select-all bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                  <span>{generatedPassword}</span>
                  <Key size={12} className="text-slate-400" />
                </p>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-bold uppercase leading-normal">
              ⚠️ Write this password down! It will not be shown again in the system logs.
            </div>

            <button
              onClick={() => {
                setShowPasswordModal(false);
                setGeneratedEmail('');
                setGeneratedPassword('');
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs transition"
            >
              Understand & Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;
