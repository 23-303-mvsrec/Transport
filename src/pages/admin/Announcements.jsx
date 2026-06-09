import React, { useState, useEffect } from 'react';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc
} from 'firebase/firestore';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/shared/Badge';
import { Plus, Edit2, Trash2, X, Megaphone, Send, AlertTriangle, Clock, Info, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

// Expiry countdown calculations helper
const getExpiryCountdown = (expiryStr) => {
  if (!expiryStr) return 'No expiry';
  const diff = new Date(expiryStr) - new Date();
  if (diff <= 0) return 'Expired';
  
  const diffMins = Math.floor(diff / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const days = Math.floor(diffHours / 24);
  
  if (days > 0) return `Expires in ${days}d ${diffHours % 24}h`;
  if (diffHours > 0) return `Expires in ${diffHours}h ${diffMins % 60}m`;
  return `Expires in ${diffMins}m`;
};

export const Announcements = () => {
  const { routes, buses, addAlert, deleteAlert } = useBuses();
  const { currentUser } = useAuth();
  
  // Lists States
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Drawer States
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info'); // 'delay' | 'route' | 'info' | 'maintenance'
  const [priority, setPriority] = useState('medium'); // 'high' | 'medium' | 'low'
  const [affectedRouteId, setAffectedRouteId] = useState('');
  const [affectedBusNumber, setAffectedBusNumber] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiry, setExpiry] = useState('');

  // 1. Sync Announcements Real-Time
  useEffect(() => {
    setLoading(true);
    if (isFirebaseEnabled) {
      const unsubscribe = onSnapshot(collection(db, 'announcements'), (snapshot) => {
        setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const syncMock = () => {
        try {
          const stored = localStorage.getItem('citybus_mock_announcements');
          if (stored) setAnnouncements(JSON.parse(stored));
        } catch (e) {}
        setLoading(false);
      };
      syncMock();
      const interval = setInterval(syncMock, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setType('info');
    setPriority('medium');
    setAffectedRouteId('');
    setAffectedBusNumber('');
    setHasExpiry(false);
    setExpiry('');
    setIsEditing(false);
    setEditingId('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setTitle(ann.title);
    setMessage(ann.message);
    setType(ann.type || 'info');
    setPriority(ann.priority || 'medium');
    setAffectedRouteId(ann.affectedRouteId || '');
    setAffectedBusNumber(ann.affectedBusNumber || '');
    setHasExpiry(!!ann.expiry);
    setExpiry(ann.expiry || '');
    setEditingId(ann.id);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    const alertData = {
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      affectedRouteId: affectedRouteId || null,
      affectedBusNumber: affectedBusNumber || null,
      expiry: hasExpiry && expiry ? expiry : null,
      isActive: true,
      createdBy: currentUser?.name || 'Administrator',
    };

    try {
      if (isEditing) {
        if (isFirebaseEnabled) {
          await updateDoc(doc(db, 'announcements', editingId), alertData);
        } else {
          const stored = JSON.parse(localStorage.getItem('citybus_mock_announcements') || '[]');
          const updated = stored.map(a => a.id === editingId ? { ...a, ...alertData } : a);
          localStorage.setItem('citybus_mock_announcements', JSON.stringify(updated));
          setAnnouncements(updated);
        }
        toast.success('Announcement details updated');
      } else {
        await addAlert(alertData);
      }
      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to post announcement');
    }
  };

  // Deactivate Announcement (Soft delete)
  const handleDeactivate = async (id) => {
    const confirmDeactivate = window.confirm('DEACTIVATE NOTICE:\nAre you sure you want to suspend this notice? It will disappear from passenger devices but remain in admin logs.');
    if (!confirmDeactivate) return;

    try {
      if (isFirebaseEnabled) {
        await updateDoc(doc(db, 'announcements', id), { isActive: false });
      } else {
        const stored = JSON.parse(localStorage.getItem('citybus_mock_announcements') || '[]');
        const updated = stored.map(a => a.id === id ? { ...a, isActive: false } : a);
        localStorage.setItem('citybus_mock_announcements', JSON.stringify(updated));
        setAnnouncements(updated);
      }
      toast.success('Announcement deactivated');
    } catch (e) {
      toast.error('Failed to deactivate');
    }
  };

  // Hard delete Announcement
  const handleHardDelete = async (id, titleStr) => {
    const confirmDelete = window.confirm(`DELETE NOTICE PERMANENTLY:\nAre you sure you want to delete announcement: "${titleStr}"?\nThis cannot be undone.`);
    if (!confirmDelete) return;

    try {
      if (isFirebaseEnabled) {
        await deleteDoc(doc(db, 'announcements', id));
      } else {
        await deleteAlert(id);
      }
      toast.success('Announcement permanently deleted');
    } catch (e) {
      toast.error('Failed to delete announcement');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Notice Title',
      render: (ann) => (
        <div className="text-left">
          <span className="font-extrabold text-slate-800">{ann.title}</span>
          <p className="text-[10px] text-slate-400 font-semibold truncate max-w-xs">{ann.message}</p>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Category',
      render: (ann) => <Badge variant={ann.type === 'delay' ? 'warning' : ann.type === 'route' ? 'info' : 'neutral'}>{ann.type?.toUpperCase()}</Badge>
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (ann) => (
        <Badge variant={ann.priority === 'high' ? 'danger' : ann.priority === 'medium' ? 'warning' : 'neutral'}>
          {ann.priority?.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'target',
      label: 'Target Scope',
      render: (ann) => {
        const route = routes.find(r => r.id === ann.affectedRouteId);
        return (
          <div className="text-[10px] font-bold text-slate-500 space-y-0.5">
            {route && <p>Line: {route.number}</p>}
            {ann.affectedBusNumber && <p>Bus: {ann.affectedBusNumber}</p>}
            {!route && !ann.affectedBusNumber && <p>All Systems</p>}
          </div>
        );
      }
    },
    {
      key: 'expiry',
      label: 'Expiry Countdown',
      render: (ann) => {
        const isExpired = ann.expiry && new Date(ann.expiry) <= new Date();
        const countdown = getExpiryCountdown(ann.expiry);
        return (
          <span className={`font-semibold ${isExpired ? 'text-rose-500 font-extrabold' : 'text-slate-400'}`}>
            {countdown}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (ann) => {
        const isExpired = ann.expiry && new Date(ann.expiry) <= new Date();
        if (!ann.isActive) return <Badge variant="neutral">DEACTIVATED</Badge>;
        if (isExpired) return <Badge variant="neutral">EXPIRED</Badge>;
        return <Badge variant="success">ACTIVE</Badge>;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (ann) => (
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => handleOpenEdit(ann)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="Edit Announcement"
          >
            <Edit2 size={13} />
          </button>
          
          {ann.isActive && (
            <button 
              onClick={() => handleDeactivate(ann.id)}
              className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-600 transition"
              title="Deactivate notice"
            >
              <Ban size={13} />
            </button>
          )}

          <button 
            onClick={() => handleHardDelete(ann.id, ann.title)}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
            title="Hard Delete notice"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h3 className="font-extrabold text-slate-800 text-lg">Broadcasting Center</h3>
          <p className="text-xs text-slate-400 mt-0.5">Post and publish live transit alerts and scheduling updates to passenger devices</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable 
        columns={columns} 
        data={announcements} 
        isLoading={loading} 
        searchPlaceholder="Search announcements title or details..."
      />

      {/* Add Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-md p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-up text-slate-800">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {isEditing ? 'Modify Broadcast Notice' : 'Broadcast System Announcement'}
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
                  <label className="text-slate-500">Notice Headline Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Route R-02: Storm Diversion"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Notice Details Content</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows="3"
                    placeholder="Provide description of schedule delay, bus maintenance replacement, or road blockage..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Notice Category</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="info">General Info</option>
                      <option value="delay">Schedule Delay</option>
                      <option value="route">Route Diversion</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Publish Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="low">Low (Standard Info)</option>
                      <option value="medium">Medium (Delays)</option>
                      <option value="high">High (Urgent Incident)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Affected Transit Line (Optional)</label>
                    <select
                      value={affectedRouteId}
                      onChange={(e) => setAffectedRouteId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="">No Line Affected</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>{r.number}: {r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Affected Fleet Bus (Optional)</label>
                    <select
                      value={affectedBusNumber}
                      onChange={(e) => setAffectedBusNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    >
                      <option value="">No Bus Affected</option>
                      {buses.map(b => (
                        <option key={b.id} value={b.number}>{b.number}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expiry Datetime picker */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasExpiry}
                      onChange={() => setHasExpiry(!hasExpiry)}
                      className="accent-primary"
                    />
                    <span>Set Expiry Date & Time</span>
                  </label>

                  {hasExpiry && (
                    <div className="space-y-1 animate-fade-in-slide-up">
                      <label className="text-slate-400 text-[10px]">Expiry Datetime</label>
                      <input
                        type="datetime-local"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition duration-300"
                >
                  <Send size={12} className="inline-block mr-1.5" />
                  <span>{isEditing ? 'Save Announcement Changes' : 'Publish Announcement'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Announcements;
