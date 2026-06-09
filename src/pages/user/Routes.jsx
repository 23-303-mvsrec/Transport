import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAllBuses } from '../../hooks/useAllBuses';
import { ListSkeleton } from '../../components/shared/Loader';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { collection, doc, getDocs, limit, query } from 'firebase/firestore';
import { 
  Search, 
  MapPin, 
  Bus, 
  Clock, 
  Heart, 
  ArrowRight, 
  ChevronRight, 
  Compass,
  ArrowUpDown,
  Navigation
} from 'lucide-react';
import Badge from '../../components/shared/Badge';
import toast from 'react-hot-toast';

export const Routes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, updateProfile } = useAuth();
  const { stops, routes } = useBuses();
  const activeBuses = useAllBuses();

  // Search parameters
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const nearStopParam = searchParams.get('nearStop');
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam === 'favourites' ? 'favourites' : 'all');
  const [loading, setLoading] = useState(false);

  // Search card states
  const [fromLabel, setFromLabel] = useState(fromParam || 'Current Location');
  const [toInput, setToInput] = useState(toParam || '');
  const [toStop, setToStop] = useState(null);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [userCoords, setUserCoords] = useState({ lat: 30.3735, lng: 76.1350 });

  useEffect(() => {
    if (tabParam === 'favourites') {
      setActiveTab('favourites');
    } else {
      setActiveTab('all');
    }
  }, [tabParam]);

  // Autocomplete suggestions query
  useEffect(() => {
    if (toInput.trim().length < 2) {
      setToSuggestions([]);
      return;
    }

    const filtered = stops.filter(
      s => s.isActive && s.name.toLowerCase().includes(toInput.toLowerCase())
    );
    setToSuggestions(filtered.slice(0, 5));
  }, [toInput, stops]);

  // Sync toStop when toParam changes
  useEffect(() => {
    if (toParam) {
      const found = stops.find(s => s.name === toParam);
      if (found) {
        setToStop(found);
        setToInput(found.name);
      }
    }
  }, [toParam, stops]);

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

  const handleSearch = () => {
    if (!toStop) {
      toast.error('Please enter a destination stop');
      return;
    }
    navigate(`/routes?from=${fromLabel}&to=${toStop.name}&tab=${activeTab}`);
  };

  const handleToggleFavourite = async (e, routeId) => {
    e.stopPropagation();
    const favs = userProfile?.favoriteRouteIds || [];
    let updatedFavs = [];
    
    if (favs.includes(routeId)) {
      updatedFavs = favs.filter(id => id !== routeId);
      toast.success('Removed from favourites');
    } else {
      updatedFavs = [...favs, routeId];
      toast.success('Added to favourites');
    }
    
    await updateProfile({ favoriteRouteIds: updatedFavs });
  };

  // Filter routes based on search triggers
  const filteredRoutes = React.useMemo(() => {
    let result = [...routes];

    // 1. Tab filtering
    if (activeTab === 'favourites') {
      const favIds = userProfile?.favoriteRouteIds || [];
      result = result.filter(r => favIds.includes(r.id));
    }

    // 2. NearStop filtering
    if (nearStopParam) {
      result = result.filter(r => r.stopIds?.includes(nearStopParam));
    }

    // 3. From/To filtering
    if (fromParam && toParam) {
      const fromStopObj = stops.find(s => s.name.toLowerCase() === fromParam.toLowerCase() || fromParam.toLowerCase() === 'current location');
      const toStopObj = stops.find(s => s.name.toLowerCase() === toParam.toLowerCase());

      if (toStopObj) {
        result = result.filter(r => {
          // If from is 'current location', check if route contains target destination stop
          if (fromParam.toLowerCase() === 'current location') {
            return r.stopIds?.includes(toStopObj.id);
          }
          // Otherwise, check if both stops are present in sequence
          if (fromStopObj) {
            const fromIdx = r.stopIds?.indexOf(fromStopObj.id);
            const toIdx = r.stopIds?.indexOf(toStopObj.id);
            return fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;
          }
          return false;
        });
      }
    }

    return result;
  }, [routes, activeTab, userProfile, fromParam, toParam, nearStopParam, stops]);

  const getActiveBusesCount = (routeId) => {
    return activeBuses.filter(b => b.routeId === routeId && b.status === 'active' && b.isOnTrip).length;
  };

  return (
    <div className="p-0">
      
      {/* Floating Source/Destination Search Card */}
      <div className="bg-primary text-white px-5 pt-5 pb-6 shadow-md rounded-b-3xl">
        <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-xl space-y-3 text-slate-800">
          <div className="flex flex-col gap-2.5 relative">
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">From</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-primary">
                  <Navigation size={13} className="rotate-45" />
                </span>
                <input
                  type="text"
                  readOnly
                  value={fromLabel}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-8 text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSwap}
              disabled={!toStop}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary text-white h-7 w-7 rounded-full border-2 border-white flex items-center justify-center shadow-md hover:bg-primary-hover active:scale-95 transition disabled:opacity-30"
              style={{ zIndex: 5 }}
            >
              <ArrowUpDown size={12} />
            </button>

            <div className="space-y-0.5">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">To</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <MapPin size={13} />
                </span>
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  placeholder="Where to? (e.g. Ripudaman College)"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-8 pr-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition"
                />
              </div>

              {toSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-xl mt-1 z-20 overflow-hidden divide-y divide-slate-50">
                  {toSuggestions.map(stop => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        setToStop(stop);
                        setToInput(stop.name);
                        setToSuggestions([]);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                    >
                      <MapPin size={11} className="text-secondary" />
                      <span className="font-bold">{stop.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Filter Transit Lines
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Tab Pills */}
        <div className="flex gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl border transition ${
              activeTab === 'all' 
                ? 'bg-primary border-primary text-white shadow-sm' 
                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            All Routes
          </button>
          
          <button
            onClick={() => setActiveTab('favourites')}
            className={`px-4 py-2 rounded-xl border transition flex items-center gap-1.5 ${
              activeTab === 'favourites' 
                ? 'bg-primary border-primary text-white shadow-sm' 
                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Heart size={13} className={activeTab === 'favourites' ? 'fill-white' : ''} />
            <span>Favourites</span>
          </button>
        </div>

        {/* Content list */}
        {loading ? (
          <ListSkeleton count={3} />
        ) : filteredRoutes.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl p-5 shadow-premium text-slate-400 flex flex-col items-center justify-center gap-2">
            <Compass size={36} className="text-slate-300" />
            <h4 className="font-bold text-slate-800 text-xs">No routes found</h4>
            <p className="text-[10px] text-slate-400">Try adjusting your destination stop or filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRoutes.map((route) => {
              const activeCount = getActiveBusesCount(route.id);
              const isFav = userProfile?.favoriteRouteIds?.includes(route.id);

              return (
                <div
                  key={route.id}
                  onClick={() => navigate(`/routes/${route.id}`)}
                  className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-premium hover:shadow-glass hover:border-primary/10 transition duration-300 cursor-pointer flex flex-col gap-3 relative"
                >
                  {/* Header Row */}
                  <div className="flex justify-between items-center">
                    <span className="bg-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg">
                      Line {route.number}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {activeCount > 0 ? (
                        <Badge variant="success">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          {activeCount} active bus{activeCount > 1 ? 'es' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Offline</Badge>
                      )}
                      
                      {/* Heart Toggle Icon */}
                      <button
                        onClick={(e) => handleToggleFavourite(e, route.id)}
                        className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition"
                      >
                        <Heart size={16} className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
                      </button>
                    </div>
                  </div>

                  {/* From to seq */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs leading-tight">{route.name}</h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold pt-1">
                      <span>{route.fromStopName}</span>
                      <ArrowRight size={10} className="text-slate-400" />
                      <span>{route.toStopName}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 pt-2 border-t border-slate-50 text-[10px] text-slate-500 font-bold uppercase">
                    <div>
                      <span className="text-[8px] text-slate-400 block">Distance</span>
                      <span className="text-slate-700">{route.totalDistance} km</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block">Frequency</span>
                      <span className="text-slate-700">Every {route.frequency} mins</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Routes;
