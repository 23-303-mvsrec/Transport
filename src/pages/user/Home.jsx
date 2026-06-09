import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBuses } from '../../contexts/BusContext';
import { useAllBuses } from '../../hooks/useAllBuses';
import { haversineDistance, getClosestStop } from '../../utils/geoUtils';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  Search, 
  MapPin, 
  Bus, 
  Bell, 
  ArrowUpDown, 
  Navigation, 
  Star, 
  Compass, 
  Volume2, 
  Map 
} from 'lucide-react';
import Badge from '../../components/shared/Badge';
import toast from 'react-hot-toast';

export const Home = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { stops, routes, alerts } = useBuses();
  const activeBuses = useAllBuses();

  // Coordinates state
  const [userCoords, setUserCoords] = useState({ lat: 17.3850, lng: 78.4867 }); // Default: Hyderabad Center
  const [fromLabel, setFromLabel] = useState('Current Location');
  const [toInput, setToInput] = useState('');
  const [toStop, setToStop] = useState(null);
  const [toSuggestions, setToSuggestions] = useState([]);

  // Fetch current GPS coordinates
  useEffect(() => {
    const HYDERABAD_CENTER = { lat: 17.3850, lng: 78.4867 };
    
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, using Hyderabad center');
      setUserCoords(HYDERABAD_CENTER);
      return;
    }

    // Check HTTPS requirement
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isSecure) {
      console.warn('Geolocation requires HTTPS, using Hyderabad center');
      setUserCoords(HYDERABAD_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setFromLabel('Current Location');
      },
      (err) => {
        console.warn('Geolocation unavailable, using Hyderabad center:', err.message);
        setUserCoords(HYDERABAD_CENTER);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  // Stop Autocomplete Query
  useEffect(() => {
    if (toInput.trim().length < 2) {
      setToSuggestions([]);
      return;
    }

    const fetchStopSuggestions = async () => {
      const queryText = toInput.trim().toLowerCase();
      
      if (isFirebaseEnabled) {
        try {
          const stopsRef = collection(db, 'stops');
          const q = query(
            stopsRef,
            where('isActive', '==', true)
          );
          const snap = await getDocs(q);
          const results = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(s => s.name.toLowerCase().includes(queryText));
          setToSuggestions(results.slice(0, 5));
        } catch (error) {
          console.error("Firestore stop query failed:", error);
        }
      } else {
        // Mock filtering
        const filtered = stops.filter(
          s => s.isActive && s.name.toLowerCase().includes(queryText)
        );
        setToSuggestions(filtered.slice(0, 5));
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchStopSuggestions();
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [toInput, stops]);

  const handleSwap = () => {
    if (!toStop) return;
    const tempLabel = fromLabel;
    const tempCoords = userCoords;

    const stopLat = toStop.location?.lat || toStop.lat;
    const stopLng = toStop.location?.lng || toStop.lng;

    setFromLabel(toStop.name);
    setUserCoords({ lat: stopLat, lng: stopLng });
    
    setToInput(tempLabel);
    setToStop({ name: tempLabel, lat: tempCoords.lat, lng: tempCoords.lng });
  };

  const handleSearchBuses = () => {
    if (!toStop) {
      toast.error('Please select a destination stop');
      return;
    }
    navigate(`/routes?from=${fromLabel}&to=${toStop.name}`);
  };

  // Find 3 closest stops to user coordinates
  const nearbyStops = React.useMemo(() => {
    if (stops.length === 0) return [];
    
    return stops
      .map(stop => {
        const stopLat = stop.location?.lat || stop.lat;
        const stopLng = stop.location?.lng || stop.lng;
        const dist = haversineDistance(userCoords.lat, userCoords.lng, stopLat, stopLng);
        return {
          ...stop,
          distance: dist
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [stops, userCoords]);

  // Find 3 closest active buses to user coordinates
  const nearbyBuses = React.useMemo(() => {
    const active = activeBuses.filter(b => b.status === 'active' && b.isOnTrip && b.currentLocation);
    if (active.length === 0) return [];

    return active
      .map(bus => {
        const dist = haversineDistance(
          userCoords.lat,
          userCoords.lng,
          bus.currentLocation.lat,
          bus.currentLocation.lng
        );
        // ETA minutes = (distance / speed) * 60. Fallback to 25 km/h
        const speed = bus.speed && bus.speed > 5 ? bus.speed : 25;
        const etaMinutes = Math.max(1, Math.round((dist / speed) * 60));

        return {
          ...bus,
          distance: dist,
          etaMinutes
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [activeBuses, userCoords]);

  // Priority marquee banner announcement
  const highPriorityAnnouncement = alerts.find(a => a.isActive && a.priority === 'high');

  const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'Passenger';
  const firstInitial = firstName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col min-h-full pb-6">
      
      {/* Top Blue Header */}
      <div className="bg-primary text-white px-5 pt-6 pb-20 rounded-b-[36px] relative shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-lg border border-white/20 select-none">
              {firstInitial}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Hello, {firstName} 👋</h2>
              <p className="text-[10px] text-white/70 font-medium">Where do you go today?</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/alerts')}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition relative border border-white/10"
          >
            <Bell size={18} />
            {alerts.filter(a => a.isActive).length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Floating Source/Destination Search Card */}
      <div className="px-5 -mt-14 relative z-10">
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col gap-3 relative">
            
            {/* From field */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">From</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-primary">
                  <Navigation size={14} className="rotate-45" />
                </span>
                <input
                  type="text"
                  readOnly
                  value={fromLabel}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Swap button floating */}
            <button
              onClick={handleSwap}
              disabled={!toStop}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary text-white h-8 w-8 rounded-full border-2 border-white flex items-center justify-center shadow-md hover:bg-primary-hover active:scale-95 transition disabled:opacity-30"
              style={{ zIndex: 5 }}
            >
              <ArrowUpDown size={14} />
            </button>

            {/* To field */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">To Destination</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <MapPin size={14} />
                </span>
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  placeholder="Type stop name e.g. Patiala Gate"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {toSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl mt-1 z-20 overflow-hidden divide-y divide-slate-50">
                  {toSuggestions.map(stop => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        setToStop(stop);
                        setToInput(stop.name);
                        setToSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-3 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                    >
                      <MapPin size={12} className="text-secondary" />
                      <span className="font-bold">{stop.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold truncate ml-auto">
                        Landmark: {stop.nearbyLandmarks}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          <button
            onClick={handleSearchBuses}
            className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-2xl text-xs font-bold transition shadow-md shadow-primary/20"
          >
            Search Buses
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { to: '/tracking/bus-01', label: 'Live Map', icon: Map, color: 'bg-primary-light text-primary' },
            { to: '/routes', label: 'All Lines', icon: Compass, color: 'bg-emerald-50 text-emerald-600' },
            { to: '/routes?tab=favourites', label: 'Favourites', icon: Star, color: 'bg-amber-50 text-amber-600' },
            { to: '/alerts', label: 'Alerts Log', icon: Bell, color: 'bg-rose-50 text-rose-600' }
          ].map(action => {
            const Icon = action.icon;
            return (
              <div 
                key={action.label}
                onClick={() => navigate(action.to)}
                className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-100 rounded-2xl shadow-premium hover:shadow-glass hover:border-primary/5 transition cursor-pointer"
              >
                <div className={`p-2.5 rounded-xl ${action.color} mb-1.5`}>
                  <Icon size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black text-slate-700 leading-tight block">{action.label}</span>
              </div>
            );
          })}
        </div>

        {/* Nearby Stops */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <MapPin size={14} className="text-secondary" />
            Nearby Stops (Hyderabad)
          </h4>

          <div className="space-y-3">
            {nearbyStops.map(stop => (
              <div 
                key={stop.id}
                onClick={() => navigate(`/routes?nearStop=${stop.id}`)}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-premium hover:shadow-glass hover:border-primary/10 transition cursor-pointer"
              >
                <div>
                  <h5 className="font-bold text-xs text-slate-800">{stop.name}</h5>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{stop.address}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <Badge variant="success">
                    {stop.distance.toFixed(2)} km
                  </Badge>
                  <span className="text-[9px] text-slate-400 font-bold">
                    {stop.routeIds?.length || 0} routes passing
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Buses Near You */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Bus size={14} className="text-primary" />
            Active Buses Near You
          </h4>

          {nearbyBuses.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-400">
              No active buses detected nearby.
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyBuses.map(bus => (
                <div 
                  key={bus.id}
                  onClick={() => navigate(`/tracking/${bus.id}`)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-premium hover:shadow-glass hover:border-primary/10 transition cursor-pointer"
                >
                  <div className="flex gap-3">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-xl self-center">
                      <Bus size={18} className="animate-pulse" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-800">{bus.number}</h5>
                      <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[180px]">
                        {bus.routeName?.split(' via ')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <Badge variant="info">
                      {bus.etaMinutes} min{bus.etaMinutes > 1 ? 's' : ''} away
                    </Badge>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {bus.distance.toFixed(1)} km away
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Scrolling priority alert ticker */}
      {highPriorityAnnouncement && (
        <div className="fixed bottom-16 left-0 right-0 bg-rose-600 text-white py-2 z-40 select-none shadow-md" style={{ maxWidth: '430px', margin: '0 auto' }}>
          <div className="flex items-center gap-2 px-4 whitespace-nowrap overflow-hidden">
            <Volume2 size={14} className="shrink-0 animate-bounce" />
            <marquee className="text-[10px] font-bold tracking-wide">
              {highPriorityAnnouncement.title}: {highPriorityAnnouncement.message}
            </marquee>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;
