import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBuses } from '../../contexts/BusContext';
import { useAllBuses } from '../../hooks/useAllBuses';
import { calculateETA } from '../../services/etaService';
import { getClosestStop, haversineDistance } from '../../utils/geoUtils';
import { MapFallback } from '../../components/shared/MapFallback';
import { 
  ArrowLeft, 
  Bus, 
  Clock, 
  MapPin, 
  TrendingUp, 
  CreditCard, 
  Navigation,
  Compass,
  AlertTriangle
} from 'lucide-react';
import Badge from '../../components/shared/Badge';
import toast from 'react-hot-toast';

export const RouteBuses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { routes, stops } = useBuses();
  const allBuses = useAllBuses();

  const [userLocation, setUserLocation] = useState({ lat: 30.3735, lng: 76.1350 });
  const [selectedStopForBuses, setSelectedStopForBuses] = useState(null);

  // Fetch current GPS coordinates for ETA calculations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      );
    }
  }, []);

  const route = routes.find(r => r.id === id);

  if (!route) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500 font-semibold">Route not found.</p>
        <Link to="/routes" className="text-primary hover:underline text-xs mt-2 inline-block font-bold">
          Back to Routes
        </Link>
      </div>
    );
  }

  // Active buses running on this route
  const activeBuses = allBuses.filter(
    b => b.routeId === route.id && b.status === 'active' && b.isOnTrip
  );

  // Ordered list of stop documents on this route
  const routeStops = route.stopIds
    .map(sid => stops.find(s => s.id === sid))
    .filter(Boolean);

  // User's closest stop on this route
  const nearestStopToUser = getClosestStop(userLocation, routeStops);

  // Get occupancy progress bar color
  const getOccupancyColor = (current, capacity) => {
    const ratio = current / capacity;
    if (ratio < 0.3) return 'bg-emerald-500';
    if (ratio < 0.7) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // Cumulative distance calculation from first stop
  const calculateDistanceToStop = (stopIndex) => {
    if (stopIndex <= 0 || routeStops.length === 0) return 0;
    
    let dist = 0;
    for (let i = 0; i < stopIndex; i++) {
      const current = routeStops[i];
      const next = routeStops[i + 1];
      const lat1 = current.location?.lat || current.lat;
      const lng1 = current.location?.lng || current.lng;
      const lat2 = next.location?.lat || next.lat;
      const lng2 = next.location?.lng || next.lng;
      
      dist += haversineDistance(lat1, lng1, lat2, lng2);
    }
    return dist;
  };

  // Scheduled stop arrival minutes from first stop
  const calculateScheduledTime = (stopIndex) => {
    // assume average speed of 25 km/h
    const dist = calculateDistanceToStop(stopIndex);
    return Math.round((dist / 25) * 60);
  };

  const getBusesNearStop = (stopId) => {
    // Match buses whose next or current stop ID corresponds to this stop
    return activeBuses.filter(b => {
      const currentStopId = route.stopIds[b.currentStopIndex];
      return currentStopId === stopId;
    });
  };

  return (
    <div className="p-0">
      
      {/* Route Header */}
      <div className="bg-primary text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-30 shadow-md">
        <button 
          onClick={() => navigate('/routes')}
          className="p-1 hover:bg-white/10 rounded-lg text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-[8px] font-bold uppercase text-primary-light">Route View</span>
          <h3 className="text-sm font-black tracking-tight leading-tight">
            Line {route.number}: {route.name}
          </h3>
        </div>
      </div>

      {/* Map Polyline area fallback */}
      <div className="h-52 relative bg-slate-900 border-b border-slate-100">
        <MapFallback activeRouteId={route.id} />
      </div>

      <div className="p-5 space-y-5 text-slate-800">
        
        {/* Route Operating Specifications */}
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-premium grid grid-cols-2 gap-4 text-xs font-semibold">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Operation Timings</span>
            <p className="text-slate-800">{route.firstBus} - {route.lastBus}</p>
            <span className="text-[9px] text-slate-400 font-medium block">Frequency: every {route.frequency} mins</span>
          </div>
          <div className="space-y-1 border-l border-slate-50 pl-4">
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Line Length</span>
            <p className="text-slate-800">{route.totalDistance} km</p>
            <span className="text-[9px] text-slate-400 font-medium block">{routeStops.length} designated stations</span>
          </div>
        </div>

        {/* Live Buses list */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bus size={14} className="text-primary" />
            Buses Active Now
          </h4>

          {activeBuses.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 space-y-2">
              <AlertTriangle className="mx-auto text-amber-500" size={20} />
              <p className="font-bold">No active buses running on this route</p>
              <p className="text-[10px] text-slate-400 font-medium">
                Next scheduled departure at {route.firstBus} (Intervals: {route.frequency}m)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBuses.map((bus) => {
                // Fetch ETA relative to user's closest stop
                let busEta = { etaMinutes: 5, status: 'On Time' };
                if (nearestStopToUser) {
                  busEta = calculateETA(bus, nearestStopToUser, routeStops, route);
                }

                const ratio = bus.occupancy / (bus.capacity || 52);
                const isDelayed = bus.status === 'maintenance' || bus.status === 'offline';

                return (
                  <div
                    key={bus.id}
                    onClick={() => navigate(`/tracking/${bus.id}`)}
                    className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-premium hover:shadow-glass hover:border-primary/10 transition cursor-pointer flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200">
                          {bus.number}
                        </span>
                        <Badge variant={bus.isAC ? 'info' : 'neutral'} className="text-[8px]">
                          {bus.isAC ? 'AC' : 'Regular'}
                        </Badge>
                      </div>

                      <Badge variant={isDelayed ? 'warning' : 'success'}>
                        {isDelayed ? 'Delayed' : 'On Time'}
                      </Badge>
                    </div>

                    {/* Occupancy seats level */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                        <span>Passenger Load</span>
                        <span>{bus.occupancy || 0} / {bus.capacity || 52} seats</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getOccupancyColor(bus.occupancy || 0, bus.capacity || 52)} transition-all`}
                          style={{ width: `${Math.min(100, (bus.occupancy / (bus.capacity || 52)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Closest stop ETA */}
                    {nearestStopToUser && (
                      <div className="border-t border-slate-50 pt-2.5 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-secondary" />
                          <span>ETA to {nearestStopToUser.name}:</span>
                        </div>
                        <span className="text-primary font-bold">{busEta.etaMinutes} mins ({busEta.status})</span>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stations Sequence */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation size={14} className="text-secondary rotate-45" />
            Route Stops Sequence
          </h4>

          <div className="relative pl-6 space-y-4 border-l border-slate-200 ml-3 py-1">
            {routeStops.map((stop, index) => {
              const distanceKm = calculateDistanceToStop(index);
              const schedMins = calculateScheduledTime(index);
              const nearBuses = getBusesNearStop(stop.id);

              return (
                <div 
                  key={stop.id} 
                  onClick={() => setSelectedStopForBuses(selectedStopForBuses === stop.id ? null : stop.id)}
                  className="relative cursor-pointer group text-left"
                >
                  {/* Station bullet */}
                  <div className="absolute -left-[30px] top-0.5 bg-white border border-slate-300 rounded-full h-4.5 w-4.5 flex items-center justify-center group-hover:border-primary transition">
                    <div className="bg-slate-400 group-hover:bg-primary h-2 w-2 rounded-full transition" />
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 leading-snug group-hover:text-primary transition">
                        {index + 1}. {stop.name}
                      </h5>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        Landmark: {stop.nearbyLandmarks}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="neutral" className="text-[9px] block">
                        +{schedMins} mins
                      </Badge>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                        {distanceKm.toFixed(1)} km
                      </span>
                    </div>
                  </div>

                  {/* Show active buses near stop indicator */}
                  {nearBuses.length > 0 && (
                    <div className="mt-1.5 flex gap-1.5 items-center bg-slate-50 border border-slate-100 rounded-lg p-1.5 w-fit">
                      <Bus size={12} className="text-emerald-500 animate-bounce" />
                      <span className="text-[9px] font-bold text-emerald-600">
                        Bus {nearBuses.map(b => b.number).join(', ')} Boarding
                      </span>
                    </div>
                  )}

                  {/* Expanded click to show details */}
                  {selectedStopForBuses === stop.id && (
                    <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] space-y-1 text-slate-600 animate-fade-in-slide-up font-semibold">
                      <p>📍 Coordinates: {stop.location?.lat.toFixed(5)}, {stop.location?.lng.toFixed(5)}</p>
                      <p>🏡 Address: {stop.address}</p>
                      <p>🚏 Active Bus Count: {nearBuses.length} near station</p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};

export default RouteBuses;
