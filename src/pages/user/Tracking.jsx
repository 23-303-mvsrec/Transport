import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRealTimeBus } from '../../hooks/useRealTimeBus';
import { useETA } from '../../hooks/useETA';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { initMap, loadGoogleMaps } from '../../services/mapsService';
import { useConnectionQuality } from '../../hooks/useConnectionQuality';
import { getClosestStop, haversineDistance } from '../../utils/geoUtils';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Star, 
  Bus, 
  User, 
  Phone, 
  MapPin, 
  AlertTriangle, 
  Volume2, 
  Check, 
  Clock, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Info,
  ShieldCheck,
  Send,
  Compass,
  Share2
} from 'lucide-react';
import Badge from '../../components/shared/Badge';
import { Spinner } from '../../components/shared/Loader';
import toast from 'react-hot-toast';

export const Tracking = () => {
  const { busId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, updateProfile } = useAuth();
  const { stops, routes } = useBuses();
  
  // Custom single bus telemetry stream
  const { bus, prevLocation, currentLocation, stale, loading: busLoading, error } = useRealTimeBus(busId);

  const { isLowBandwidth } = useConnectionQuality();

  // States
  const [userLocation, setUserLocation] = useState({ lat: 17.3850, lng: 78.4867 });
  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'leaflet' | 'loading'
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [lastUpdatedSecs, setLastUpdatedSecs] = useState(0);

  // Issue Form fields
  const [issueType, setIssueType] = useState('not-running');
  const [description, setDescription] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Maps element refs
  const mapContainerRef = useRef(null);
  const mapAdapterRef = useRef(null);

  // Retrieve user coordinates
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      );
    }
  }, []);

  // Compute nearest stop to user among route stops
  const route = routes.find(r => r.id === bus?.routeId);
  const routeStops = React.useMemo(() => {
    if (!route) return [];
    return route.stopIds
      .map(sid => stops.find(s => s.id === sid))
      .filter(Boolean);
  }, [route, stops]);

  const nearestStop = React.useMemo(() => {
    return getClosestStop(userLocation, routeStops);
  }, [userLocation, routeStops]);

  // Hook for calculations
  const { etaMinutes, nextStop, followingStop, delayStatus } = useETA(busId, nearestStop?.id);

  // Live "Last updated X seconds ago" counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (bus?.lastUpdated) {
        let ts = 0;
        if (typeof bus.lastUpdated.toMillis === 'function') {
          ts = bus.lastUpdated.toMillis();
        } else {
          ts = new Date(bus.lastUpdated).getTime();
        }
        setLastUpdatedSecs(Math.max(0, Math.round((Date.now() - ts) / 1000)));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [bus]);

  // Toggle Favourites
  const handleToggleFavourite = async (e) => {
    e.stopPropagation();
    if (!route) return;
    const favs = userProfile?.favoriteRouteIds || [];
    let updatedFavs = [];
    
    if (favs.includes(route.id)) {
      updatedFavs = favs.filter(id => id !== route.id);
      toast.success('Removed route from bookmarks');
    } else {
      updatedFavs = [...favs, route.id];
      toast.success('Bookmarked route');
    }
    await updateProfile({ favoriteRouteIds: updatedFavs });
  };

  // Modals Focus Trapping
  useEffect(() => {
    const handleFocusTrap = (show, id) => {
      if (!show) return;
      const modalEl = document.getElementById(id);
      if (!modalEl) return;
      
      const getFocusable = () => {
        return modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
      };
      
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      first.focus();

      const handleKey = (e) => {
        if (e.key !== 'Tab') return;
        const currentFocusable = getFocusable();
        const curFirst = currentFocusable[0];
        const curLast = currentFocusable[currentFocusable.length - 1];
        
        if (e.shiftKey) {
          if (document.activeElement === curFirst) {
            curLast.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === curLast) {
            curFirst.focus();
            e.preventDefault();
          }
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    };

    if (showTimelineModal) return handleFocusTrap(showTimelineModal, 'timeline-modal');
    if (showReportModal) return handleFocusTrap(showReportModal, 'report-modal');
    if (showDetailsSheet) return handleFocusTrap(showDetailsSheet, 'details-sheet');
  }, [showTimelineModal, showReportModal, showDetailsSheet]);

  // Maps loading & preference setup - use Leaflet by default (no Google Maps key)
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const pref = localStorage.getItem('userMapPreference');
    
    // If no Google Maps key or user prefers OSM, use Leaflet immediately
    if (!apiKey || apiKey === 'your_google_maps_api_key_here' || isLowBandwidth || pref === 'OSM') {
      setMapEngine('leaflet');
      return;
    }

    let scriptTimeout = setTimeout(() => {
      console.warn('Google Maps took too long, using Leaflet OSM...');
      setMapEngine('leaflet');
    }, 3000);

    loadGoogleMaps()
      .then(() => {
        clearTimeout(scriptTimeout);
        setMapEngine('google');
      })
      .catch(() => {
        clearTimeout(scriptTimeout);
        setMapEngine('leaflet');
      });

    return () => clearTimeout(scriptTimeout);
  }, [isLowBandwidth]);

  // Unified map init and update effect
  useEffect(() => {
    if (mapEngine === 'loading' || !mapContainerRef.current || !route) return;

    let active = true;
    let adapter = mapAdapterRef.current;

    const setupMap = async () => {
      if (adapter && adapter.provider !== mapEngine) {
        adapter.destroy();
        adapter = null;
        mapAdapterRef.current = null;
      }

      const center = currentLocation || userLocation;

      if (!adapter) {
        try {
          adapter = await initMap(mapContainerRef.current, {
            center,
            zoom: 14,
            disableDefaultUI: true,
            zoomControl: false
          }, mapEngine);
          if (!active) {
            adapter.destroy();
            return;
          }
          mapAdapterRef.current = adapter;

          // Fit bounds to show user and bus initially
          const bounds = [userLocation];
          if (currentLocation) {
            bounds.push(currentLocation);
          }
          adapter.fitBounds(bounds);
        } catch (err) {
          console.error('Failed to initialize map provider:', mapEngine, err);
          if (mapEngine === 'google') {
            setMapEngine('leaflet');
          }
          return;
        }
      }

      // Draw polyline
      const pathCoords = routeStops.map(s => {
        const stopLat = s.location?.lat || s.lat;
        const stopLng = s.location?.lng || s.lng;
        return { lat: stopLat, lng: stopLng };
      });
      adapter.createPolyline('route-line', pathCoords, {
        color: '#0b57d0',
        weight: 4,
        opacity: 0.7
      });

      // Draw Stop markers
      routeStops.forEach((stop, index) => {
        const stopLat = stop.location?.lat || stop.lat;
        const stopLng = stop.location?.lng || stop.lng;
        const passed = index <= (bus?.currentStopIndex || 0);

        adapter.createMarker(`stop-${stop.id}`, { lat: stopLat, lng: stopLng }, {
          isStop: true,
          isPassed: passed,
          popupContent: `<div style="color:#000; font-family:sans-serif; font-size:11px; font-weight:bold; padding:2px;">${stop.name}</div>`
        });
      });

      // User location marker
      adapter.createMarker('user-location', userLocation, {
        popupContent: `<div style="color:#000; font-family:sans-serif; font-size:11px; font-weight:bold; padding:2px;">You are here</div>`
      });

      // Bus marker animate/update
      if (currentLocation) {
        const iconOptions = {};
        if (mapEngine === 'google' && window.google) {
          iconOptions.icon = {
            path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
            fillColor: '#0b57d0',
            fillOpacity: stale ? 0.5 : 1,
            scale: 1.5,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: bus.heading || 0
          };
        } else {
          iconOptions.iconHtml = `<div style="transform: rotate(${bus.heading || 0}deg); opacity: ${stale ? 0.5 : 1};" class="bg-primary border-2 border-white rounded-full h-8 w-8 flex items-center justify-center text-white"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4H8m0 0l3 3m-3-3l3-3"/></svg></div>`;
        }

        const prevPos = prevLocation || currentLocation;
        const exists = adapter.markers[`bus-${bus.id}`];

        if (!exists) {
          adapter.createMarker(`bus-${bus.id}`, prevPos, iconOptions);
        }

        adapter.updateMarker(`bus-${bus.id}`, currentLocation, {
          animate: true,
          opacity: stale ? 0.5 : 1,
          ...iconOptions
        });

        // Center on the bus
        adapter.panTo(currentLocation.lat, currentLocation.lng);
      } else {
        adapter.removeMarker(`bus-${bus.id}`);
      }
    };

    setupMap();

    return () => {
      active = false;
    };
  }, [mapEngine, route, currentLocation, stale, routeStops, bus, userLocation]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapAdapterRef.current) {
        mapAdapterRef.current.destroy();
      }
    };
  }, []);

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe your concern');
      return;
    }

    setSubmittingIssue(true);
    const report = {
      busId: bus.id,
      busNumber: bus.number,
      reportedBy: currentUser?.uid || 'guest-passenger',
      issueType,
      description: description.trim(),
      status: 'open',
      createdAt: isFirebaseEnabled ? serverTimestamp() : new Date().toISOString()
    };

    try {
      if (isFirebaseEnabled) {
        await addDoc(collection(db, 'issueReports'), report);
      } else {
        const local = JSON.parse(localStorage.getItem('citybus_mock_reports') || '[]');
        local.push({ id: `report-${Date.now()}`, ...report });
        localStorage.setItem('citybus_mock_reports', JSON.stringify(local));
      }
      toast.success('Report submitted. Thank you.');
      setShowReportModal(false);
      setDescription('');
    } catch (err) {
      toast.error('Submission failed.');
    } finally {
      setSubmittingIssue(false);
    }
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white min-h-[400px] gap-2">
        <AlertTriangle size={32} className="text-rose-500" />
        <p className="text-xs font-bold text-slate-300">Tracking unavailable: {error.message}</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-4 bg-primary text-white text-xs font-bold py-2 px-4 rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (busLoading || !bus) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white min-h-[400px]">
        <Spinner size="lg" color="white" />
        <p className="mt-4 text-xs font-semibold text-slate-400 animate-pulse">Connecting live GPS stream...</p>
      </div>
    );
  }

  const isFav = userProfile?.favoriteRouteIds?.includes(route?.id);
  const isStaleGps = stale;
  const isOffline = !bus.isOnTrip || !currentLocation;

  return (
    <div className="p-0 relative h-full flex flex-col bg-slate-50 text-slate-800">
      
      {/* Dynamic Stale Alert Banner */}
      {isStaleGps && (
        <div className="bg-amber-600 text-white py-2 px-4 text-[10px] font-bold text-center flex items-center justify-center gap-1.5 z-40 animate-pulse">
          <AlertTriangle size={12} />
          <span>GPS signal lost. Showing last known location.</span>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-11 h-11 flex items-center justify-center hover:bg-slate-100 rounded-lg transition text-slate-600"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-[8px] font-bold uppercase text-slate-400">Live Navigation</span>
            <h3 className="text-sm font-black text-slate-800 leading-tight">Live Tracking</h3>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Share button */}
          <button
            onClick={async () => {
              const url = window.location.href;
              const shareData = {
                title: `Bus ${bus?.number || 'PB-01-AB-1234'} is near you`,
                text: "Track this bus live",
                url
              };
              if (navigator.share) {
                try {
                  await navigator.share(shareData);
                } catch (err) {
                  console.log('Share canceled/failed', err);
                }
              } else {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success('Link copied!');
                } catch (err) {
                  toast.error('Failed to copy link');
                }
              }
            }}
            className="w-11 h-11 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
            title="Share Location"
            aria-label="Share location"
          >
            <Share2 size={18} />
          </button>

          {/* Favourites button */}
          <button
            onClick={handleToggleFavourite}
            className="w-11 h-11 flex items-center justify-center hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition"
            aria-label={isFav ? "Remove bookmark" : "Bookmark route"}
          >
            <Star size={18} className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
          </button>
        </div>
      </div>

      {/* Bus Info Banner (tappable) */}
      <div 
        onClick={() => setShowDetailsSheet(true)}
        className="bg-white border-b border-slate-100 px-5 py-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition z-20"
      >
        <div className="flex gap-3">
          <div className="bg-primary-light text-primary p-2.5 rounded-xl self-center">
            <Bus size={20} className={!isOffline ? 'animate-pulse' : ''} />
          </div>
          <div className="text-left">
            <h4 className="font-extrabold text-xs text-slate-800">{bus.number}</h4>
            <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[200px]">
              {route?.name || 'Loading route details...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOffline ? (
            <Badge variant="neutral">Bus Offline</Badge>
          ) : isStaleGps ? (
            <Badge variant="warning">GPS Signal Lost</Badge>
          ) : (
            <Badge variant={delayStatus?.includes('Delayed') ? 'danger' : 'success'}>
              {delayStatus || 'On Time'}
            </Badge>
          )}
          <ChevronDown size={16} className="text-slate-400" />
        </div>
      </div>

      {/* Live Map wrapper */}
      <div className="flex-grow min-h-[200px] relative bg-slate-950 flex flex-col justify-center items-center">
        {/* Offline notice */}
        {isOffline && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white gap-2">
            <Bus size={42} className="text-slate-500" />
            <h4 className="font-bold text-sm">Bus Not Started Yet</h4>
            <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
              This bus is currently idle. Real-world GPS logs will compile once the duty driver initiates the journey trip.
            </p>
          </div>
        )}

        {/* Dynamic Low-Bandwidth Alert Banner */}
        {mapEngine === 'leaflet' && (
          <div className="absolute top-2 left-2 bg-slate-900/90 text-slate-300 border border-slate-800 rounded-lg py-1 px-2.5 text-[8px] font-bold z-30 flex items-center gap-1">
            <Info size={10} className="text-emerald-400" />
            <span>Low data mode — using lightweight map</span>
          </div>
        )}

        {/* Canvas placeholder */}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Bottom Info Card */}
      <div className="bg-white border-t border-slate-100 p-5 shadow-2xl space-y-4 rounded-t-3xl z-20">
        
        {isOffline ? (
          <div className="text-center py-2 text-xs font-semibold text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">This bus has not started its journey yet.</p>
            <p className="text-[10px] text-slate-400">Scheduled to depart every {route?.frequency || 15} minutes starting from {route?.firstBus || '06:00'}.</p>
          </div>
        ) : isStaleGps ? (
          <div className="text-center py-2 text-xs font-bold text-slate-500">
            Last known position shown. GPS signal lost.
          </div>
        ) : (
          <div className="space-y-3">
            {/* ETA display row */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Arrival</span>
                <span role="status" aria-live="polite" className="text-2xl font-black text-slate-900 leading-none">
                  {etaMinutes || 5} min{etaMinutes !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Distance</span>
                <span className="text-xs font-bold text-slate-700">
                  {nearestStop ? `${haversineDistance(userLocation.lat, userLocation.lng, nearestStop.location?.lat || nearestStop.lat, nearestStop.location?.lng || nearestStop.lng).toFixed(1)} km away` : 'Calculating...'}
                </span>
              </div>
            </div>

            {/* Next stop sequence */}
            <div className="bg-slate-50 rounded-xl p-2.5 flex justify-between items-center text-[10px] font-semibold text-slate-600">
              <span className="truncate">Next Stop: <span className="font-bold text-slate-800">{nextStop?.name || 'Terminus'}</span></span>
              <span className="truncate border-l border-slate-200 pl-2 ml-2">Following: <span className="font-bold text-slate-800">{followingStop?.name || 'N/A'}</span></span>
            </div>
          </div>
        )}

        {/* Occupancy seats level */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
            <span>Occupancy Seats</span>
            <span>{bus.occupancy || 0} / {bus.capacity || 52} seats filled</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                (bus.occupancy / (bus.capacity || 52)) < 0.3 
                  ? 'bg-emerald-500' 
                  : (bus.occupancy / (bus.capacity || 52)) < 0.7 
                    ? 'bg-amber-500' 
                    : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, ((bus.occupancy || 0) / (bus.capacity || 52)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Dynamic Buttons */}
        <div className="grid grid-cols-2 gap-3.5 pt-1.5">
          <button
            onClick={() => setShowTimelineModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3.5 rounded-2xl transition"
          >
            View Full Route
          </button>
          
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-bold py-3.5 rounded-2xl transition"
          >
            Report Issue
          </button>
        </div>

      </div>

      {/* FULL ROUTE TIMELINE MODAL */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="timeline-modal" className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-fade-in-slide-up flex flex-col max-h-[80vh] text-slate-800">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Compass size={16} className="text-primary" />
                Line {route?.number} Stop Sequence
              </h4>
              <button 
                onClick={() => setShowTimelineModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stops list sequence */}
            <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4 no-scrollbar">
              <div className="relative pl-6 space-y-5 border-l border-slate-200 ml-3 py-1">
                {routeStops.map((stop, index) => {
                  const passed = index < (bus?.currentStopIndex || 0);
                  const isCurrent = index === (bus?.currentStopIndex || 0);
                  
                  return (
                    <div key={stop.id} className="relative group text-left">
                      {/* Timeline Node */}
                      <div className={`absolute -left-[32px] top-0.5 rounded-full h-5.5 w-5.5 flex items-center justify-center border-2 transition ${
                        isCurrent 
                          ? 'bg-primary border-white ring-2 ring-primary scale-125 z-10' 
                          : passed 
                            ? 'bg-slate-200 border-slate-300' 
                            : 'bg-white border-slate-300'
                      }`}>
                        {passed ? (
                          <Check size={10} className="text-slate-500 stroke-[3]" />
                        ) : isCurrent ? (
                          <Bus size={10} className="text-white" />
                        ) : null}
                      </div>

                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className={`font-bold text-xs leading-none ${
                            isCurrent ? 'text-primary font-black' : passed ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}>
                            {stop.name}
                          </h5>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            {isCurrent ? 'Bus is currently boarding here' : `Landmark: ${stop.nearbyLandmarks}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUS DETAILS BOTTOM SHEET */}
      {showDetailsSheet && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div id="details-sheet" className="bg-white w-full max-w-md rounded-t-3xl p-5 shadow-2xl animate-slide-up space-y-4 text-slate-800 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900">Vehicle Roster & Operators</h4>
              <button 
                onClick={() => setShowDetailsSheet(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary p-2 rounded-xl">
                    <Bus size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">{bus.number}</h5>
                    <p className="text-[9px] text-slate-400">{bus.type?.toUpperCase()} • Capacity: {bus.capacity || 52}</p>
                  </div>
                </div>
                {bus.isAC && <Badge variant="info">Air Conditioned</Badge>}
              </div>

              {/* Driver info */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-200 text-slate-600 p-2 rounded-xl">
                    <User size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">{bus.driverName || 'Active Operator'}</h5>
                    <p className="text-[9px] text-slate-400">Assigned Operator</p>
                  </div>
                </div>
                
                <a 
                  href={`tel:${bus.driverPhone || '+919876543210'}`}
                  className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3.5 py-1.5 rounded-xl font-bold hover:bg-emerald-100 transition flex items-center gap-1"
                >
                  <Phone size={11} /> Call
                </a>
              </div>

              {/* Accuracy details */}
              <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-bold uppercase">
                <div>
                  <span className="text-[8px] text-slate-400 block mb-0.5">GPS TELEMETRY</span>
                  <span className="text-slate-800">Accuracy: ±{bus.accuracy || 10}m</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 block mb-0.5">LAST SYNC</span>
                  <span className="text-slate-800">{lastUpdatedSecs} seconds ago</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* REPORT ISSUE MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div id="report-modal" className="bg-white w-full max-w-md rounded-t-3xl p-5 border-t border-slate-200 animate-slide-up space-y-4 text-slate-800 text-left">
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <AlertTriangle size={16} className="text-rose-600" />
                Report Transit Issue
              </h4>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-500">Choose Issue Type</label>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    { id: 'not-running', label: 'Bus not running' },
                    { id: 'wrong-route', label: 'Wrong route detour' },
                    { id: 'safety', label: 'Safety concern' },
                    { id: 'driver', label: 'Driver conduct' },
                    { id: 'app-issue', label: 'App tracking bug' },
                    { id: 'other', label: 'Other feedback' }
                  ].map(opt => (
                    <label 
                      key={opt.id}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer select-none transition ${
                        issueType === opt.id 
                          ? 'bg-rose-50 border-rose-200 text-rose-700' 
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'
                      }`}
                      onClick={() => setIssueType(opt.id)}
                    >
                      <input
                        type="radio"
                        name="issueType"
                        checked={issueType === opt.id}
                        onChange={() => setIssueType(opt.id)}
                        className="hidden"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Provide Description Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  placeholder="Describe timing deviations or reckless driver speeding here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:border-primary focus:bg-white transition"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingIssue}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-1 shadow-md shadow-rose-600/20"
              >
                {submittingIssue ? <Spinner size="sm" color="white" /> : (
                  <>
                    <Send size={12} />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Tracking;
