import React, { useState, useEffect, useRef } from 'react';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { loadGoogleMaps } from '../../services/mapsService';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/shared/Badge';
import { Plus, Edit2, Trash2, X, MapPin, Landmark, Map } from 'lucide-react';
import toast from 'react-hot-toast';

export const Stops = () => {
  const { addStop, updateStop, deleteStop } = useBuses();
  const { isMock } = useAuth();

  // State lists
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Drawer States
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(17.3850);
  const [lng, setLng] = useState(78.4867);
  const [nearbyLandmarks, setNearbyLandmarks] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Picker Map Engine
  const [mapEngine, setMapEngine] = useState('loading');
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const googleMarkerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);

  // 1. Sync Stops & Routes Real-Time
  useEffect(() => {
    setLoading(true);
    if (isFirebaseEnabled) {
      const unsubStops = onSnapshot(collection(db, 'stops'), (snapshot) => {
        setStops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
      const unsubRoutes = onSnapshot(collection(db, 'routes'), (snapshot) => {
        setRoutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => {
        unsubStops();
        unsubRoutes();
      };
    } else {
      const syncMock = () => {
        try {
          setStops(JSON.parse(localStorage.getItem('citybus_mock_stops') || '[]'));
          setRoutes(JSON.parse(localStorage.getItem('citybus_mock_routes') || '[]'));
        } catch (e) {}
        setLoading(false);
      };
      syncMock();
      const interval = setInterval(syncMock, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // 2. Map script loader for form picker
  useEffect(() => {
    if (!isOpen) return;

    const pref = localStorage.getItem('userMapPreference');
    if (pref === 'OSM') {
      setMapEngine('leaflet');
      return;
    }

    loadGoogleMaps()
      .then(() => setMapEngine('google'))
      .catch(() => setMapEngine('leaflet'));
  }, [isOpen]);

  // 3. Initialize Google Maps Picker
  useEffect(() => {
    if (mapEngine !== 'google' || !mapContainerRef.current || !isOpen) return;

    const google = window.google;
    const initialPos = { lat, lng };

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: initialPos,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true
      });

      // Map Click listener
      googleMapRef.current.addListener('click', (e) => {
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        setLat(parseFloat(clickedLat.toFixed(6)));
        setLng(parseFloat(clickedLng.toFixed(6)));
      });
    }

    const map = googleMapRef.current;

    // Draw/move marker
    if (!googleMarkerRef.current) {
      googleMarkerRef.current = new google.maps.Marker({
        position: initialPos,
        map,
        draggable: true
      });

      // Update inputs when marker is dragged
      googleMarkerRef.current.addListener('dragend', () => {
        const pos = googleMarkerRef.current.getPosition();
        setLat(parseFloat(pos.lat().toFixed(6)));
        setLng(parseFloat(pos.lng().toFixed(6)));
      });
    } else {
      googleMarkerRef.current.setPosition(initialPos);
      map.panTo(initialPos);
    }
  }, [mapEngine, isOpen, lat, lng]);

  // 4. Initialize Leaflet Maps Picker
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
      const initialPos = [lat, lng];

      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView(initialPos, 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMapRef.current);

        leafletMapRef.current.on('click', (e) => {
          setLat(parseFloat(e.latlng.lat.toFixed(6)));
          setLng(parseFloat(e.latlng.lng.toFixed(6)));
        });
      }

      const map = leafletMapRef.current;

      if (!leafletMarkerRef.current) {
        leafletMarkerRef.current = L.marker(initialPos, { draggable: true }).addTo(map);

        leafletMarkerRef.current.on('dragend', () => {
          const pos = leafletMarkerRef.current.getLatLng();
          setLat(parseFloat(pos.lat.toFixed(6)));
          setLng(parseFloat(pos.lng.toFixed(6)));
        });
      } else {
        leafletMarkerRef.current.setLatLng(initialPos);
        map.panTo(initialPos);
      }
    }
  }, [mapEngine, isOpen, lat, lng]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setLat(17.3850);
    setLng(78.4867);
    setNearbyLandmarks('');
    setIsActive(true);
    setIsEditing(false);
    setEditingId('');

    // clean references
    googleMapRef.current = null;
    googleMarkerRef.current = null;
    leafletMapRef.current = null;
    leafletMarkerRef.current = null;
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (stop) => {
    setName(stop.name);
    setAddress(stop.address || '');
    setLat(stop.location?.lat || stop.lat || 17.3850);
    setLng(stop.location?.lng || stop.lng || 78.4867);
    setNearbyLandmarks(stop.nearbyLandmarks || '');
    setIsActive(stop.isActive !== undefined ? stop.isActive : true);
    setEditingId(stop.id);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Stop Name is required');
      return;
    }

    const stopData = {
      name: name.trim(),
      address: address.trim(),
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      nearbyLandmarks: nearbyLandmarks.trim(),
      isActive,
      routeIds: isEditing ? (stops.find(s => s.id === editingId)?.routeIds || []) : []
    };

    try {
      if (isEditing) {
        await updateStop(editingId, stopData);
      } else {
        await addStop(stopData);
      }
      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to save stop terminal details');
    }
  };

  const handleDeleteStop = async (stop) => {
    // Cascade check: block if stop is served by any routes
    const servedRoutes = routes.filter(r => r.stopIds?.includes(stop.id));
    if (servedRoutes.length > 0) {
      toast.error(`Cannot delete stop: served by route(s) ${servedRoutes.map(r => r.number).join(', ')}`);
      return;
    }

    const confirmDelete = window.confirm(`DELETE STOP STATION:\nAre you sure you want to remove stop: ${stop.name}?`);
    if (!confirmDelete) return;

    try {
      await deleteStop(stop.id);
    } catch (err) {
      toast.error('Failed to delete stop');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Station Name',
      render: (stop) => (
        <span className="font-extrabold text-slate-800 flex items-center gap-2">
          <MapPin size={14} className="text-secondary shrink-0" />
          <span>{stop.name}</span>
        </span>
      )
    },
    {
      key: 'location',
      label: 'Coordinates (Lat, Lng)',
      render: (stop) => {
        const stopLat = stop.location?.lat || stop.lat || 17.3850;
        const stopLng = stop.location?.lng || stop.lng || 78.4867;
        return <span className="font-mono text-slate-500 font-bold">{stopLat.toFixed(5)}, {stopLng.toFixed(5)}</span>;
      }
    },
    {
      key: 'address',
      label: 'Address',
      render: (stop) => <span className="text-slate-500 font-semibold truncate max-w-xs block">{stop.address || 'N/A'}</span>
    },
    {
      key: 'nearbyLandmarks',
      label: 'Landmarks',
      render: (stop) => (
        <span className="text-slate-500 font-semibold flex items-center gap-1">
          <Landmark size={12} className="text-slate-400" />
          <span>{stop.nearbyLandmarks || 'None'}</span>
        </span>
      )
    },
    {
      key: 'routesServed',
      label: 'Routes Served',
      render: (stop) => {
        const count = routes.filter(r => r.stopIds?.includes(stop.id)).length;
        return <span className="text-slate-700 font-extrabold">{count} line{count !== 1 ? 's' : ''}</span>;
      }
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (stop) => (
        <Badge variant={stop.isActive ? 'success' : 'danger'}>
          {stop.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (stop) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenEdit(stop)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="Edit Stop"
          >
            <Edit2 size={13} />
          </button>
          <button 
            onClick={() => handleDeleteStop(stop)}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
            title="Delete Stop"
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
          <h3 className="font-extrabold text-slate-800 text-lg">Stops Terminal Control</h3>
          <p className="text-xs text-slate-400 mt-0.5">Configure geographic bus stop locations and station settings in Hyderabad</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          <span>Provision New Stop</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable 
        columns={columns} 
        data={stops} 
        isLoading={loading} 
        searchPlaceholder="Search stops by name or landmarks..."
      />

      {/* Add/Edit Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-md p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-up text-slate-800">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {isEditing ? `Modify Terminal (${name})` : 'Provision New Bus Stop'}
                </h4>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-left">
                
                {/* Embedded Coordinate Picker Map */}
                <div className="space-y-1">
                  <label className="text-slate-500">Pick Location on Map</label>
                  <div ref={mapContainerRef} className="w-full h-[300px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200" />
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                    * Tap/Click on the map or drag the marker to position.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Bus Stop Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fatehgarh Gate Terminal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Ameerpet Junction, Hyderabad"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(parseFloat(e.target.value).toFixed(6)) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(parseFloat(e.target.value).toFixed(6)) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Nearby Landmark Description</label>
                  <input
                    type="text"
                    value={nearbyLandmarks}
                    onChange={(e) => setNearbyLandmarks(e.target.value)}
                    placeholder="e.g. Opposite Civil Court entrance"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Stop Terminal Status</label>
                    <div className="flex gap-4 items-center pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => setIsActive(!isActive)}
                          className="accent-primary"
                        />
                        <span>Active / Open</span>
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition duration-300"
                >
                  <span>{isEditing ? 'Save Stop Details' : 'Deploy New Station'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stops;
