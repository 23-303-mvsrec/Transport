import React, { useState, useEffect, useRef } from 'react';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  query
} from 'firebase/firestore';
import { loadGoogleMaps } from '../../services/mapsService';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/shared/Badge';
import { Plus, Edit2, Trash2, X, Compass, GripVertical, Search } from 'lucide-react';
import toast from 'react-hot-toast';

// Haversine helper to calculate distance between two coordinates
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const Routes = () => {
  const { stops: contextStops, addRoute, updateRoute, deleteRoute } = useBuses();
  const { isMock } = useAuth();

  // Lists States
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Drawer States
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState(15);
  const [firstBus, setFirstBus] = useState('06:00');
  const [lastBus, setLastBus] = useState('22:00');
  const [isActive, setIsActive] = useState(true);
  const [routeStops, setRouteStops] = useState([]); // Array of Stop IDs in sequence
  const [stopSearch, setStopSearch] = useState('');
  const [distance, setDistance] = useState(0);

  // Form Map Preview Engine
  const [mapEngine, setMapEngine] = useState('loading');
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const googlePolylineRef = useRef(null);
  const googleMarkersRef = useRef([]);
  const leafletMapRef = useRef(null);
  const leafletPolylineRef = useRef(null);
  const leafletMarkersRef = useRef([]);

  // 1. Sync Routes, Buses, and Stops Real-Time
  useEffect(() => {
    setLoading(true);
    if (isFirebaseEnabled) {
      const unsubRoutes = onSnapshot(collection(db, 'routes'), (snapshot) => {
        setRoutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      const unsubBuses = onSnapshot(collection(db, 'buses'), (snapshot) => {
        setBuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubStops = onSnapshot(collection(db, 'stops'), (snapshot) => {
        setStops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubRoutes();
        unsubBuses();
        unsubStops();
      };
    } else {
      const syncMock = () => {
        try {
          setRoutes(JSON.parse(localStorage.getItem('citybus_mock_routes') || '[]'));
          setBuses(JSON.parse(localStorage.getItem('citybus_mock_buses') || '[]'));
          setStops(JSON.parse(localStorage.getItem('citybus_mock_stops') || '[]'));
        } catch (e) {}
        setLoading(false);
      };
      syncMock();
      const interval = setInterval(syncMock, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // 2. Map Script loading check
  useEffect(() => {
    if (!isOpen) return; // Load map only when form drawer is open

    const pref = localStorage.getItem('userMapPreference');
    if (pref === 'OSM') {
      setMapEngine('leaflet');
      return;
    }

    loadGoogleMaps()
      .then(() => setMapEngine('google'))
      .catch(() => setMapEngine('leaflet'));
  }, [isOpen]);

  // 3. Render Google Map Preview in builder
  useEffect(() => {
    if (mapEngine !== 'google' || !mapContainerRef.current || !isOpen) return;

    const google = window.google;
    const center = { lat: 17.3850, lng: 78.4867 };

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true
      });
    }

    const map = googleMapRef.current;

    // Clear old markers & polyline
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];
    if (googlePolylineRef.current) {
      googlePolylineRef.current.setMap(null);
    }

    // Coordinates path for stops
    const coords = routeStops
      .map(sid => stops.find(s => s.id === sid))
      .filter(Boolean)
      .map(s => ({ lat: s.location?.lat || s.lat, lng: s.location?.lng || s.lng }));

    if (coords.length > 0) {
      // Draw stops
      coords.forEach((c, index) => {
        const marker = new google.maps.Marker({
          position: c,
          map,
          label: {
            text: String(index + 1),
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '10px'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
        googleMarkersRef.current.push(marker);
      });

      // Draw polyline route
      googlePolylineRef.current = new google.maps.Polyline({
        path: coords,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });

      // Pan to show route
      const bounds = new google.maps.LatLngBounds();
      coords.forEach(c => bounds.extend(c));
      map.fitBounds(bounds);
    }
  }, [mapEngine, routeStops, stops, isOpen]);

  // 4. Render Leaflet Map Preview in builder
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !mapContainerRef.current || !isOpen) return;

    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initLeaflet();
      document.head.appendChild(script);
    } else {
      initLeaflet();
    }

    function initLeaflet() {
      const L = window.L;
      const center = [17.3850, 78.4867];

      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView(center, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMapRef.current);
      }

      const map = leafletMapRef.current;

      // Clear markers and polyline
      leafletMarkersRef.current.forEach(m => map.removeLayer(m));
      leafletMarkersRef.current = [];
      if (leafletPolylineRef.current) {
        map.removeLayer(leafletPolylineRef.current);
      }

      const coords = routeStops
        .map(sid => stops.find(s => s.id === sid))
        .filter(Boolean)
        .map(s => [s.location?.lat || s.lat, s.location?.lng || s.lng]);

      if (coords.length > 0) {
        coords.forEach((c, index) => {
          const marker = L.circleMarker(c, {
            radius: 8,
            fillColor: '#2563eb',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1
          }).addTo(map).bindTooltip(`Stop ${index + 1}`, { permanent: true, direction: 'top' });
          
          leafletMarkersRef.current.push(marker);
        });

        leafletPolylineRef.current = L.polyline(coords, { color: '#2563eb', weight: 4, opacity: 0.8 }).addTo(map);

        // Zoom fit
        map.fitBounds(L.polyline(coords).getBounds());
      }
    }
  }, [mapEngine, routeStops, stops, isOpen]);

  // 5. Calculate Distance on Stop updates (Haversine Chain)
  useEffect(() => {
    if (routeStops.length < 2) {
      setDistance(0);
      return;
    }

    let total = 0;
    for (let i = 0; i < routeStops.length - 1; i++) {
      const s1 = stops.find(s => s.id === routeStops[i]);
      const s2 = stops.find(s => s.id === routeStops[i + 1]);
      if (s1 && s2) {
        const lat1 = s1.location?.lat || s1.lat;
        const lon1 = s1.location?.lng || s1.lng;
        const lat2 = s2.location?.lat || s2.lat;
        const lon2 = s2.location?.lng || s2.lng;
        total += haversine(lat1, lon1, lat2, lon2);
      }
    }
    setDistance(parseFloat(total.toFixed(2)));
  }, [routeStops, stops]);

  const resetForm = () => {
    setNumber('');
    setName('');
    setFrequency(15);
    setFirstBus('06:00');
    setLastBus('22:00');
    setIsActive(true);
    setRouteStops([]);
    setDistance(0);
    setStopSearch('');
    setIsEditing(false);
    setEditingId('');

    // Cleanup maps refs
    googleMapRef.current = null;
    leafletMapRef.current = null;
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (route) => {
    setNumber(route.number);
    setName(route.name);
    setFrequency(route.frequency || 15);
    setFirstBus(route.firstBus || '06:00');
    setLastBus(route.lastBus || '22:00');
    setIsActive(route.isActive !== undefined ? route.isActive : true);
    setRouteStops(route.stopIds || []);
    setEditingId(route.id);
    setIsEditing(true);
    setIsOpen(true);
  };

  // Toggle Route active status directly in database
  const handleToggleActive = async (routeId, currentStatus) => {
    try {
      if (isFirebaseEnabled) {
        await updateDoc(doc(db, 'routes', routeId), { isActive: !currentStatus });
      } else {
        const stored = JSON.parse(localStorage.getItem('citybus_mock_routes') || '[]');
        const updated = stored.map(r => r.id === routeId ? { ...r, isActive: !currentStatus } : r);
        localStorage.setItem('citybus_mock_routes', JSON.stringify(updated));
      }
      toast.success('Route active status toggled');
    } catch (e) {
      toast.error('Failed to change status');
    }
  };

  // Drag and Drop Sequence reordering
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDrop = (e, targetIndex) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const updated = [...routeStops];
    const [movedItem] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    setRouteStops(updated);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleToggleStopSelection = (stopId) => {
    if (routeStops.includes(stopId)) {
      setRouteStops(prev => prev.filter(sid => sid !== stopId));
    } else {
      setRouteStops(prev => [...prev, stopId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!number.trim() || !name.trim()) {
      toast.error('Line Code and Route Name are required');
      return;
    }
    if (routeStops.length < 2) {
      toast.error('A route requires at least 2 stops');
      return;
    }

    const originStop = stops.find(s => s.id === routeStops[0]);
    const destStop = stops.find(s => s.id === routeStops[routeStops.length - 1]);

    const routeData = {
      number: number.toUpperCase().trim(),
      name: name.trim(),
      fromStopId: originStop?.id || '',
      fromStopName: originStop?.name || 'Origin Terminus',
      toStopId: destStop?.id || '',
      toStopName: destStop?.name || 'Destination Terminus',
      totalDistance: distance,
      estimatedDuration: Math.round(distance * 2), // approx 2 mins per km
      frequency: parseInt(frequency),
      firstBus,
      lastBus,
      isActive,
      stopIds: routeStops
    };

    try {
      if (isEditing) {
        await updateRoute(editingId, routeData);
      } else {
        await addRoute(routeData);
      }
      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to save route details');
    }
  };

  const handleDeleteRoute = async (route) => {
    // Check if any buses are assigned to this route
    const assignedBuses = buses.filter(b => b.routeId === route.id);
    if (assignedBuses.length > 0) {
      toast.error(`Cannot delete: ${assignedBuses.length} buses are currently assigned to this route.`);
      return;
    }

    const confirmDelete = window.confirm(`DELETE TRANSIT LINE:\nAre you sure you want to remove line ${route.number}?`);
    if (!confirmDelete) return;

    try {
      await deleteRoute(route.id);
    } catch (err) {
      toast.error('Failed to delete route');
    }
  };

  // Search stops inside selector
  const searchedStops = stops.filter(s => 
    s.name.toLowerCase().includes(stopSearch.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(stopSearch.toLowerCase()))
  );

  const columns = [
    {
      key: 'number',
      label: 'Line Code',
      render: (route) => (
        <span className="bg-primary-light text-primary text-[10px] font-black px-2.5 py-1 rounded-lg border border-primary/10">
          {route.number}
        </span>
      )
    },
    {
      key: 'name',
      label: 'Route Name',
      render: (route) => <span className="text-slate-800 font-extrabold">{route.name}</span>
    },
    {
      key: 'fromStopName',
      label: 'From → To',
      render: (route) => (
        <span className="text-slate-500 font-semibold">{route.fromStopName} ➔ {route.toStopName}</span>
      )
    },
    {
      key: 'stopCount',
      label: 'Stops',
      render: (route) => <span className="text-slate-500 font-bold">{route.stopIds?.length || 0} stops</span>
    },
    {
      key: 'activeBuses',
      label: 'Active Buses',
      render: (route) => {
        const activeCount = buses.filter(b => b.routeId === route.id && b.isOnTrip).length;
        return <span className="text-slate-700 font-extrabold">{activeCount} active</span>;
      }
    },
    {
      key: 'isActive',
      label: 'Status Toggle',
      render: (route) => (
        <button
          onClick={() => handleToggleActive(route.id, route.isActive)}
          className={`text-[10px] font-black py-1.5 px-3 rounded-xl transition ${
            route.isActive 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
              : 'bg-rose-50 text-rose-600 border border-rose-100'
          }`}
        >
          {route.isActive ? 'Active' : 'Suspended'}
        </button>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (route) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenEdit(route)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="Edit Route"
          >
            <Edit2 size={13} />
          </button>
          <button 
            onClick={() => handleDeleteRoute(route)}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
            title="Delete Route"
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
          <h3 className="font-extrabold text-slate-800 text-lg">Transit Route Optimizer</h3>
          <p className="text-xs text-slate-400 mt-0.5">Optimize stop sequences, scheduling, and coordinate maps in Nabha grid</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          <span>Optimize New Route</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable 
        columns={columns} 
        data={routes} 
        isLoading={loading} 
        searchPlaceholder="Search routes code or name..."
      />

      {/* Add/Edit Drawer Form */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-2xl p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-up text-slate-800">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {isEditing ? `Modify Route line (${number})` : 'Optimize New Transit Line'}
                </h4>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold text-left">
                {/* Inputs area */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-500">Line Code</label>
                      <input
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="e.g. R-09"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-slate-500">Route Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Hospital to Alhoran Gate"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-500">Distance (km)</label>
                      <input
                        type="text"
                        value={distance}
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl py-3 px-4 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500">Freq (mins)</label>
                      <input
                        type="number"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500">Active Duty</label>
                      <div className="flex gap-4 items-center pt-3.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => setIsActive(!isActive)}
                            className="accent-primary"
                          />
                          <span>Active</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-500">First Bus Departure</label>
                      <input
                        type="text"
                        value={firstBus}
                        onChange={(e) => setFirstBus(e.target.value)}
                        placeholder="06:00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500">Last Bus Departure</label>
                      <input
                        type="text"
                        value={lastBus}
                        onChange={(e) => setLastBus(e.target.value)}
                        placeholder="22:00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Stop Checklist Selector */}
                  <div className="space-y-2">
                    <label className="text-slate-500">Search and Select Stops (Origin → Dest)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={stopSearch}
                        onChange={(e) => setStopSearch(e.target.value)}
                        placeholder="Search stations..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto grid grid-cols-1 gap-1.5 text-[10px]">
                      {searchedStops.map(stop => {
                        const isChecked = routeStops.includes(stop.id);
                        return (
                          <div 
                            key={stop.id}
                            onClick={() => handleToggleStopSelection(stop.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition ${
                              isChecked 
                                ? 'bg-primary-light border-primary/20 text-primary font-bold' 
                                : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="accent-primary"
                            />
                            <span className="truncate">{stop.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Map Preview & Drag Sequence Reordering */}
                <div className="space-y-4">
                  {/* Live map polyline preview */}
                  <div className="space-y-1">
                    <label className="text-slate-500">Route Geometry Preview</label>
                    <div ref={mapContainerRef} className="w-full h-44 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200" />
                  </div>

                  {/* Drag-to-reorder list */}
                  <div className="space-y-2 text-left">
                    <label className="text-slate-500">Stop Sequence (Drag items to reorder)</label>
                    {routeStops.length === 0 ? (
                      <div className="bg-slate-50 text-slate-400 text-center py-6 border border-slate-200 border-dashed rounded-xl text-[10px]">
                        No stops selected yet.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                        {routeStops.map((sid, index) => {
                          const stop = stops.find(s => s.id === sid);
                          return (
                            <div
                              key={sid}
                              draggable
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragOver={handleDragOver}
                              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 cursor-move hover:bg-slate-100 transition text-[10px]"
                            >
                              <GripVertical size={12} className="text-slate-400 shrink-0" />
                              <span className="bg-primary text-white font-bold h-4 w-4 rounded-full flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <span className="truncate flex-1 font-bold text-slate-700">{stop?.name || `ID: ${sid}`}</span>
                              <button
                                type="button"
                                onClick={() => setRouteStops(prev => prev.filter(id => id !== sid))}
                                className="text-slate-400 hover:text-rose-500 p-0.5"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition duration-300"
                  >
                    <span>{isEditing ? 'Save Route Parameters' : 'Create Operational Route'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Routes;
