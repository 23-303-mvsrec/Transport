import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBuses } from '../../contexts/BusContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { GPSService } from '../../services/gpsService';
import { seedDrivers, seedRoutes } from '../../services/seedData';
import { haversineDistance } from '../../utils/geoUtils';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Badge from '../../components/shared/Badge';
import MapFallback from '../../components/shared/MapFallback';
import { 
  Bus, 
  Compass, 
  Users, 
  MapPin, 
  Play, 
  Square, 
  Power,
  ShieldAlert,
  Map,
  Clock,
  Plus,
  Minus,
  Check,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DriverDashboard = () => {
  const { theme } = useOutletContext();
  const isDark = theme === 'dark';
  const { currentUser, logout } = useAuth();
  const { buses, routes, stops } = useBuses();

  // State: "idle" | "starting" | "on-trip" | "ending"
  const [tripState, setTripState] = useState('idle');
  const [driverProfile, setDriverProfile] = useState(null);
  const [assignedRoute, setAssignedRoute] = useState(null);
  const [assignedBus, setAssignedBus] = useState(null);

  // GPS position hook
  const { 
    position: realPosition, 
    accuracy: realAccuracy, 
    speed: realSpeed, 
    heading: realHeading, 
    error: gpsError, 
    isTracking, 
    startTracking, 
    stopTracking 
  } = useGeolocation();

  const [simulatedGps, setSimulatedGps] = useState(false);
  const [mockPosition, setMockPosition] = useState(null);
  const [mockAccuracy, setMockAccuracy] = useState(null);

  const position = simulatedGps ? mockPosition : realPosition;
  const accuracy = simulatedGps ? mockAccuracy : realAccuracy;
  const speed = simulatedGps ? 0 : realSpeed;
  const heading = simulatedGps ? 0 : realHeading;

  // Permission and https states
  const [gpsPermission, setGpsPermission] = useState('prompt');
  const [httpsWarning, setHttpsWarning] = useState(false);

  // Active Journey states
  const [startStopId, setStartStopId] = useState('');
  const [endStopId, setEndStopId] = useState('');
  const [occupancy, setOccupancy] = useState(12);
  const [maxOccupancy, setMaxOccupancy] = useState(12);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [tripDistance, setTripDistance] = useState(0);

  const gpsServiceRef = useRef(null);
  const lastWriteCoordsRef = useRef(null);

  // HTTPS check
  useEffect(() => {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isHttps && !isLocalhost) {
      setHttpsWarning(true);
    }
  }, []);

  // Geolocation permission check
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          setGpsPermission(result.state);
          result.onchange = () => {
            setGpsPermission(result.state);
          };
        })
        .catch(err => console.warn('Navigator permission query unsupported:', err));
    }
    
    // Auto start tracking if permission is granted
    startTracking();
  }, [startTracking]);

  // Load Driver Profile, Bus and Route details
  useEffect(() => {
    if (!currentUser) return;
    
    const findDriverProfile = async () => {
      let matchedDriver = null;
      if (isFirebaseEnabled) {
        try {
          const docSnap = await getDoc(doc(db, 'drivers', currentUser.uid));
          if (docSnap.exists()) {
            matchedDriver = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          console.error("Firestore driver fetch failed, reverting to seeds:", e);
        }
      }

      if (!matchedDriver && currentUser.email) {
        const emailLower = currentUser.email.toLowerCase();
        const numMatch = emailLower.match(/driver(\d{1,2})/);
        if (numMatch) {
          const idx = parseInt(numMatch[1]) - 1;
          if (idx >= 0 && idx < seedDrivers.length) {
            matchedDriver = seedDrivers[idx];
          }
        }
      }

      if (!matchedDriver) {
        matchedDriver = seedDrivers.find(d => 
          d.uid === currentUser.uid || 
          d.name === currentUser.name || 
          currentUser.email?.toLowerCase().includes(d.id)
        );
      }

      if (matchedDriver) {
        setDriverProfile(matchedDriver);
        
        const routeMatch = routes.find(r => r.id === matchedDriver.assignedRouteId);
        setAssignedRoute(routeMatch);
        
        const busMatch = buses.find(b => b.id === matchedDriver.assignedBusId);
        setAssignedBus(busMatch);
        
        if (busMatch) {
          setOccupancy(busMatch.occupancy || 0);
          setMaxOccupancy(busMatch.occupancy || 0);
        }

        // Initialize starting stop default
        if (routeMatch && routeMatch.stopIds?.length > 0) {
          setStartStopId(routeMatch.stopIds[0]);
          setEndStopId(routeMatch.stopIds[routeMatch.stopIds.length - 1]);
        }
      }
    };

    findDriverProfile();
  }, [currentUser, routes, buses]);

  // Sync coords updates to GPS service
  useEffect(() => {
    if (gpsServiceRef.current && position) {
      gpsServiceRef.current.updateLivePositionReference({
        lat: position.lat,
        lng: position.lng,
        speed: speed || 0,
        heading: heading || 0,
        accuracy: accuracy || 10
      });

      // Calculate incremental trip distance covered
      if (tripState === 'on-trip' && lastWriteCoordsRef.current) {
        const d = haversineDistance(
          lastWriteCoordsRef.current.lat,
          lastWriteCoordsRef.current.lng,
          position.lat,
          position.lng
        );
        setTripDistance(prev => prev + d);
      }
      lastWriteCoordsRef.current = position;
    }
  }, [position, speed, heading, accuracy, tripState]);

  // Trip timer ticks
  useEffect(() => {
    let timer = null;
    if (tripState === 'on-trip' && tripStartTime) {
      timer = setInterval(() => {
        const diff = Date.now() - tripStartTime;
        const hrs = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setElapsedTime(`${hrs}:${mins}:${secs}`);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [tripState, tripStartTime]);

  const handleStartTripConfirm = async () => {
    if (!assignedBus || !assignedRoute) return;
    
    // Instantiate GPS service
    gpsServiceRef.current = new GPSService(assignedBus.id, currentUser.uid);
    gpsServiceRef.current.currentOccupancy = occupancy;
    
    const routeStops = assignedRoute.stopIds
      .map(sid => stops.find(s => s.id === sid))
      .filter(Boolean);

    try {
      await gpsServiceRef.current.startTrip(
        assignedRoute.id,
        startStopId,
        routeStops,
        assignedRoute,
        driverProfile
      );

      setTripStartTime(Date.now());
      setElapsedTime('00:00:00');
      setTripDistance(0);
      setTripState('on-trip');
      toast.success('Journey trip initialized!');
    } catch (e) {
      toast.error('Failed to start trip logs');
    }
  };

  const handleEndTripConfirm = async () => {
    if (gpsServiceRef.current) {
      try {
        await gpsServiceRef.current.endTrip(endStopId);
        gpsServiceRef.current.destroy();
        gpsServiceRef.current = null;
        setTripState('ended');
        toast.success('Duty trip closed successfully.');
      } catch (e) {
        toast.error('Failed to close trip log');
      }
    }
  };

  const handleStartNewJourney = () => {
    setTripState('idle');
    setOccupancy(12);
    setMaxOccupancy(12);
    setTripStartTime(null);
    setElapsedTime('00:00:00');
    setTripDistance(0);
    lastWriteCoordsRef.current = null;
  };

  const adjustOccupancy = (val) => {
    const nextOcc = Math.max(0, Math.min(52, occupancy + val));
    setOccupancy(nextOcc);
    if (nextOcc > maxOccupancy) {
      setMaxOccupancy(nextOcc);
    }
    if (gpsServiceRef.current) {
      gpsServiceRef.current.updateOccupancy(nextOcc);
    }
  };

  // Accuracy display styling helpers
  const getAccuracyLabel = (accVal) => {
    if (!accVal) return { text: "No GPS Fix", color: "text-slate-400" };
    if (accVal < 10) return { text: "Excellent Accuracy", color: "text-emerald-400 font-bold" };
    if (accVal <= 25) return { text: "Good Accuracy", color: "text-teal-400 font-bold" };
    if (accVal <= 50) return { text: "Fair Accuracy", color: "text-amber-400 font-bold" };
    return { text: "Poor — move to open area", color: "text-rose-400 font-bold" };
  };

  const accuracyBadge = getAccuracyLabel(accuracy);

  // Render Permission Blocks
  if (gpsPermission === 'denied') {
    return (
      <div className="p-6 text-center space-y-4 max-w-sm mx-auto pt-24 text-white">
        <ShieldAlert size={48} className="mx-auto text-rose-500 animate-bounce" />
        <h2 className="text-lg font-black">Location Access Required</h2>
        <p className="text-xs text-slate-400">
          The driver application coordinates watch requires location permissions to broadcast real-time telemetry to passenger maps.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3 px-6 rounded-xl w-full"
        >
          Open Browser Settings & Reload
        </button>
      </div>
    );
  }

  return (
    <div className={`p-5 space-y-5 select-none pb-12 min-h-full transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* HTTPS Warning Alert */}
      {httpsWarning && (
        <div className="bg-rose-950/40 border border-rose-900 rounded-2xl p-4 flex gap-3 text-xs text-rose-300">
          <ShieldAlert className="text-rose-500 shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="font-bold">GPS Protocol Alert</h4>
            <p className="text-[10px] text-rose-400 mt-0.5">
              Browser Geolocation requires a secure HTTPS context. Move to production hosting to initialize tracking.
            </p>
          </div>
        </div>
      )}

      {/* Roster profiles / Top Indicators */}
      <div className={`border rounded-2xl p-4 text-left shadow-lg transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active duty</span>
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
            {assignedBus?.number || 'PB-11-K-1001'}
          </span>
        </div>
        <h2 className={`text-base font-bold transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-800'}`}>{driverProfile?.name || 'Duty Operator'}</h2>
        <p className={`text-xs transition-colors duration-300 ${isDark ? 'text-slate-400' : 'text-slate-550'}`}>Licence: {driverProfile?.licenseNumber || 'PB-11-XXXX'}</p>
      </div>

      {/* STATE IDLE */}
      {tripState === 'idle' && (
        <div className="space-y-5">
          {/* Roster Grid */}
          <div className={`border rounded-3xl p-5 shadow-lg space-y-4 transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Duty Assignment</span>
            
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <span className="text-[9px] text-slate-500 block mb-0.5">ASSIGNED BUS</span>
                <span className={`block truncate transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{assignedBus?.number || 'PB-11-K-1001'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block mb-0.5">TRANSIT LINE</span>
                <span className={`block truncate transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{assignedRoute?.number || 'R-01'}</span>
              </div>
            </div>

            {/* GPS Lock status */}
            <div className={`border-t pt-3.5 flex items-center justify-between text-xs transition-colors duration-300 ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-555'}`}>GPS Lock:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${accuracy ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                <span className={accuracyBadge.color}>{accuracyBadge.text} {accuracy && `(±${Math.round(accuracy)}m)`}</span>
              </div>
            </div>

            {/* START JOURNEY trigger */}
            <button
              onClick={() => setTripState('starting')}
              disabled={!accuracy || accuracy > 50}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            >
              <Play size={16} fill="currentColor" />
              <span>START ACTIVE JOURNEY</span>
            </button>
            {accuracy > 50 && (
              <p className="text-[9px] text-amber-500 text-center font-bold">GPS accuracy is too poor to initialize (required under 50m).</p>
            )}
            {(!accuracy || accuracy > 50) && (
              <button
                type="button"
                onClick={() => {
                  const firstStopId = assignedRoute?.stopIds?.[0];
                  const firstStop = firstStopId ? stops.find(s => s.id === firstStopId) : null;
                  const loc = firstStop?.location || firstStop || { lat: 17.3850, lng: 78.4867 };
                  setMockPosition({ lat: loc.lat, lng: loc.lng });
                  setMockAccuracy(5);
                  setSimulatedGps(true);
                  toast.success("Simulated GPS Fix activated!");
                }}
                className={`w-full py-3.5 rounded-xl text-xs font-black transition mt-1 duration-300 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400' : 'bg-slate-200 hover:bg-slate-300 text-emerald-700'
                }`}
              >
                Simulate Location (Developer Bypass)
              </button>
            )}
          </div>
        </div>
      )}

      {/* STATE STARTING CONFIRMATION */}
      {tripState === 'starting' && (
        <div className={`border rounded-3xl p-5 shadow-xl space-y-4 transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex justify-between items-center">
            <h4 className={`font-extrabold text-sm transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Trip Initialization</h4>
            <button 
              onClick={() => setTripState('idle')}
              className={`text-xs transition-colors duration-300 ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4 text-xs font-semibold text-left">
            <p className={`transition-colors duration-300 ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-normal`}>
              Confirm starting journey for bus <span className="text-emerald-500 font-bold">{assignedBus?.number}</span> on line <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{assignedRoute?.number}</span>.
            </p>

            <div className="space-y-1">
              <label className={`uppercase text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Starting stop</label>
              <select
                value={startStopId}
                onChange={(e) => setStartStopId(e.target.value)}
                className={`w-full border rounded-xl py-3 px-4 font-bold outline-none transition-colors duration-300 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {assignedRoute?.stopIds.map(sid => (
                  <option key={sid} value={sid}>{sid}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartTripConfirm}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3.5 rounded-xl text-xs font-black shadow-md"
            >
              Confirm & Start Trip
            </button>
          </div>
        </div>
      )}

      {/* STATE ON-TRIP LIVE BROADCAST */}
      {tripState === 'on-trip' && (
        <div className="space-y-5 text-left">
          {/* LIVE indicator top */}
          <div className={`border rounded-2xl p-3 flex justify-between items-center text-xs transition-colors duration-300 ${
            isDark ? 'bg-rose-950/20 border-rose-900' : 'bg-rose-50 border-rose-100'
          }`}>
            <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              <span className="h-2 w-2 bg-rose-500 rounded-full animate-ping" />
              <span>GPS BROADCASTING LIVE</span>
            </div>
            <Badge variant="dark" className="font-mono tracking-wider">{elapsedTime}</Badge>
          </div>

          {/* Telemetry live stats */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className={`border rounded-2xl p-4 text-center transition-colors duration-300 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <Compass size={20} className="mx-auto text-primary animate-spin" style={{ animationDuration: '6s' }} />
              <span className={`text-[8px] font-bold uppercase block mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Speed</span>
              <span className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{speed || 0} km/h</span>
            </div>

            <div className={`border rounded-2xl p-4 text-center transition-colors duration-300 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <Users size={20} className="mx-auto text-secondary" />
              <span className={`text-[8px] font-bold uppercase block mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Passengers</span>
              <span className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{occupancy}</span>
            </div>
          </div>

          {/* Location debug logs */}
          <div className={`border rounded-2xl p-3.5 text-[9px] font-mono flex justify-between transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-650 shadow-sm'
          }`}>
            <span>Accuracy: ±{accuracy ? Math.round(accuracy) : '0'}m</span>
            <span>Distance: {tripDistance.toFixed(2)} km</span>
            <span>Fix: {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : 'Locking...'}</span>
          </div>

          {/* Passengers count adjust button capsule */}
          <div className={`border rounded-3xl p-5 flex justify-between items-center transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Passenger Logging</span>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Adjust Seats Filled</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => adjustOccupancy(-5)}
                disabled={occupancy <= 0}
                className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold disabled:opacity-40 transition-colors duration-200 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Minus size={18} />
              </button>
              <button
                onClick={() => adjustOccupancy(5)}
                disabled={occupancy >= 52}
                className="h-12 w-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-slate-950 text-lg font-bold disabled:opacity-40 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Live map mini view */}
          <div className={`h-40 rounded-3xl border overflow-hidden relative transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <MapFallback activeRouteId={assignedRoute?.id} userLocation={position} />
          </div>

          {/* Close trip trigger */}
          <button
            onClick={() => setTripState('ending')}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
          >
            <Square size={14} fill="currentColor" />
            <span>END JOURNEY TRIP</span>
          </button>
        </div>
      )}

      {/* STATE ENDING TERMINAL SELECTION */}
      {tripState === 'ending' && (
        <div className={`border rounded-3xl p-5 shadow-xl space-y-4 transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex justify-between items-center">
            <h4 className={`font-extrabold text-sm transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>End Journey</h4>
            <button 
              onClick={() => setTripState('on-trip')}
              className={`text-xs transition-colors duration-300 ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4 text-xs font-semibold text-left">
            <p className={`transition-colors duration-300 ${isDark ? 'text-slate-400' : 'text-slate-650'} leading-normal`}>
              Specify the ending terminal to finalize trip logs for bus <span className="text-rose-500 font-bold">{assignedBus?.number}</span>.
            </p>

            <div className="space-y-1">
              <label className={`uppercase text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ending Terminal Stop</label>
              <select
                value={endStopId}
                onChange={(e) => setEndStopId(e.target.value)}
                className={`w-full border rounded-xl py-3 px-4 font-bold outline-none transition-colors duration-300 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {assignedRoute?.stopIds.map(sid => (
                  <option key={sid} value={sid}>{sid}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleEndTripConfirm}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl text-xs font-black shadow-md"
            >
              Confirm & End Trip
            </button>
          </div>
        </div>
      )}

      {/* STATE ENDED / SUMMARY */}
      {tripState === 'ended' && (
        <div className={`border rounded-3xl p-5 shadow-xl space-y-5 transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Check size={24} />
            </div>
            <h4 className={`font-extrabold text-base transition-colors duration-300 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Journey Ended</h4>
            <p className="text-[10px] text-slate-400">Duty trip log finalized and synchronized</p>
          </div>

          <div className={`border rounded-2xl p-4.5 space-y-3.5 text-xs transition-colors duration-300 ${
            isDark ? 'bg-slate-955 border-slate-805' : 'bg-slate-50 border-slate-150'
          }`}>
            <span className="text-[9px] font-bold text-slate-500 uppercase block border-b border-slate-850 pb-1.5">Trip Summary Report</span>
            
            <div className="grid grid-cols-2 gap-4 text-left font-semibold">
              <div>
                <span className="text-[9px] text-slate-500 block mb-0.5">DURATION</span>
                <span className={`transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{elapsedTime}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block mb-0.5">DISTANCE COVERED</span>
                <span className={`transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{tripDistance.toFixed(2)} km</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block mb-0.5">MAX PASSENGERS</span>
                <span className={`transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{maxOccupancy} passengers</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block mb-0.5">VEHICLE ASSIGNED</span>
                <span className={`transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{assignedBus?.number}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleStartNewJourney}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3.5 rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 active:scale-95 transition"
            >
              Start New Journey
            </button>
            
            <button
              disabled
              className={`w-full border py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span>View Trip History</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>Soon</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverDashboard;
