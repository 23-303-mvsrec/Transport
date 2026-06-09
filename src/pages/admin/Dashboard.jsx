import React, { useState, useEffect, useRef } from 'react';
import { useBuses } from '../../contexts/BusContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled, seedDatabase, seedDriverAccounts } from '../../services/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { initMap, loadGoogleMaps } from '../../services/mapsService';
import { useConnectionQuality } from '../../hooks/useConnectionQuality';
import { 
  Bus, 
  GitFork, 
  UserCheck, 
  Users, 
  MapPin, 
  AlertTriangle, 
  Check, 
  Map, 
  ExternalLink 
} from 'lucide-react';
import Badge from '../../components/shared/Badge';
import toast from 'react-hot-toast';

const CountUp = ({ to, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(to, 10) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = progress * (2 - progress); // Ease out quad
      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(step);
  }, [to, duration]);

  return <span>{count}</span>;
};

export const Dashboard = () => {
  const { buses: contextBuses, routes: contextRoutes, stops: contextStops } = useBuses();
  const { isMock } = useAuth();

  const [isSeedingData, setIsSeedingData] = useState(false);
  const [isSeedingDrivers, setIsSeedingDrivers] = useState(false);
  const [seedingLog, setSeedingLog] = useState('');

  const handleSeedDatabase = async () => {
    setIsSeedingData(true);
    setSeedingLog('Initializing database seed...');
    try {
      await seedDatabase();
      setSeedingLog(prev => prev + '\n✓ Transit stops, routes, buses, and announcements seeded successfully!');
      toast.success('Database seeded successfully!');
    } catch (error) {
      setSeedingLog(prev => prev + `\n✗ Seeding failed: ${error.message || error}`);
      toast.error('Seeding failed!');
    } finally {
      setIsSeedingData(false);
    }
  };

  const handleSeedDrivers = async () => {
    setIsSeedingDrivers(true);
    setSeedingLog('Initializing driver authentication provisioning...');
    try {
      const results = await seedDriverAccounts();
      const logs = results.map(r => `• ${r.email}: ${r.status}`).join('\n');
      setSeedingLog(prev => prev + `\n✓ Driver accounts seeded!\n${logs}`);
      toast.success('Driver Auth accounts seeded successfully!');
    } catch (error) {
      setSeedingLog(prev => prev + `\n✗ Driver account seeding failed: ${error.message || error}`);
      toast.error('Driver seeding failed!');
    } finally {
      setIsSeedingDrivers(false);
    }
  };

  // Statistics States
  const [activeBuses, setActiveBuses] = useState(0);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [driversOnDuty, setDriversOnDuty] = useState(0);
  const [registeredUsers, setRegisteredUsers] = useState(0);

  // Pulse effect triggers
  const [pulseActiveBuses, setPulseActiveBuses] = useState(false);
  const [pulseRoutes, setPulseRoutes] = useState(false);
  const [pulseDrivers, setPulseDrivers] = useState(false);
  const [pulseUsers, setPulseUsers] = useState(false);

  // Lists States
  const [allBuses, setAllBuses] = useState([]);
  const [issues, setIssues] = useState([]);

  const { isLowBandwidth } = useConnectionQuality();

  // Map Engine & Refs
  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'leaflet' | 'loading'
  const mapContainerRef = useRef(null);
  const mapAdapterRef = useRef(null);

  // 1. Real-time statistics synchronization
  useEffect(() => {
    if (isFirebaseEnabled) {
      // Active buses
      const unsubscribeBuses = onSnapshot(collection(db, 'buses'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllBuses(list);
        
        const activeCount = list.filter(b => b.status === 'active' && b.isOnTrip).length;
        setActiveBuses(prev => {
          if (prev !== activeCount && prev !== 0) {
            setPulseActiveBuses(true);
            setTimeout(() => setPulseActiveBuses(false), 1000);
          }
          return activeCount;
        });
      });

      // Total routes where isActive == true
      const qRoutes = query(collection(db, 'routes'), where('isActive', '==', true));
      const unsubscribeRoutes = onSnapshot(qRoutes, (snapshot) => {
        const count = snapshot.size;
        setTotalRoutes(prev => {
          if (prev !== count && prev !== 0) {
            setPulseRoutes(true);
            setTimeout(() => setPulseRoutes(false), 1000);
          }
          return count;
        });
      });

      // Drivers on duty
      const qDrivers = query(collection(db, 'drivers'), where('status', '==', 'on-duty'));
      const unsubscribeDrivers = onSnapshot(qDrivers, (snapshot) => {
        const count = snapshot.size;
        setDriversOnDuty(prev => {
          if (prev !== count && prev !== 0) {
            setPulseDrivers(true);
            setTimeout(() => setPulseDrivers(false), 1000);
          }
          return count;
        });
      });

      // Registered users where role == 'user'
      const qUsers = query(collection(db, 'users'), where('role', '==', 'user'));
      const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        const count = snapshot.size;
        setRegisteredUsers(prev => {
          if (prev !== count && prev !== 0) {
            setPulseUsers(true);
            setTimeout(() => setPulseUsers(false), 1000);
          }
          return count;
        });
      });

      // Last 5 issues reports
      const qIssues = query(
        collection(db, 'issueReports'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const unsubscribeIssues = onSnapshot(qIssues, (snapshot) => {
        setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubscribeBuses();
        unsubscribeRoutes();
        unsubscribeDrivers();
        unsubscribeUsers();
        unsubscribeIssues();
      };
    } else {
      // Mock Storage real-time poll
      const pollStats = () => {
        const localBuses = JSON.parse(localStorage.getItem('citybus_mock_buses') || '[]');
        const localRoutes = JSON.parse(localStorage.getItem('citybus_mock_routes') || '[]');
        const localDrivers = JSON.parse(localStorage.getItem('citybus_mock_drivers') || '[]');
        const localUsers = JSON.parse(localStorage.getItem('citybus_mock_users') || '[]');
        const localIssues = JSON.parse(localStorage.getItem('citybus_mock_reports') || '[]');

        setAllBuses(localBuses);

        const activeCount = localBuses.filter(b => b.status === 'active' && b.isOnTrip).length;
        if (activeBuses !== activeCount && activeBuses !== 0) {
          setPulseActiveBuses(true);
          setTimeout(() => setPulseActiveBuses(false), 1000);
        }
        setActiveBuses(activeCount);

        const routeCount = localRoutes.filter(r => r.isActive).length;
        if (totalRoutes !== routeCount && totalRoutes !== 0) {
          setPulseRoutes(true);
          setTimeout(() => setPulseRoutes(false), 1000);
        }
        setTotalRoutes(routeCount);

        const driverCount = localDrivers.filter(d => d.status === 'on-duty').length;
        if (driversOnDuty !== driverCount && driversOnDuty !== 0) {
          setPulseDrivers(true);
          setTimeout(() => setPulseDrivers(false), 1000);
        }
        setDriversOnDuty(driverCount);

        // Fallback registered users
        const usersCount = localUsers.length > 0 ? localUsers.filter(u => u.role === 'user').length : 3;
        if (registeredUsers !== usersCount && registeredUsers !== 0) {
          setPulseUsers(true);
          setTimeout(() => setPulseUsers(false), 1000);
        }
        setRegisteredUsers(usersCount);

        const sortedIssues = [...localIssues].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
        setIssues(sortedIssues);
      };

      pollStats();
      const interval = setInterval(pollStats, 1000);
      return () => clearInterval(interval);
    }
  }, [activeBuses, totalRoutes, driversOnDuty, registeredUsers]);

  // 2. Maps Script Loading / preference fallbacks
  useEffect(() => {
    const pref = localStorage.getItem('userMapPreference');
    if (isLowBandwidth || pref === 'OSM') {
      setMapEngine('leaflet');
      return;
    }

    let scriptTimeout = setTimeout(() => {
      if (mapEngine === 'loading') {
        setMapEngine('leaflet');
      }
    }, 5000);

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
    if (mapEngine === 'loading' || !mapContainerRef.current) return;

    let active = true;
    let adapter = mapAdapterRef.current;

    const setupMap = async () => {
      if (adapter && adapter.provider !== mapEngine) {
        adapter.destroy();
        adapter = null;
        mapAdapterRef.current = null;
      }

      if (!adapter) {
        try {
          const center = { lat: 17.4000, lng: 78.4800 };
          adapter = await initMap(mapContainerRef.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true
          }, mapEngine);
          
          if (!active) {
            adapter.destroy();
            return;
          }
          mapAdapterRef.current = adapter;

          // Draw all Route Polylines in light blue
          contextRoutes.forEach(r => {
            const stopCoords = r.stopIds
              ?.map(sid => contextStops.find(s => s.id === sid))
              .filter(Boolean)
              .map(s => ({ lat: s.location?.lat || s.lat, lng: s.location?.lng || s.lng }));

            if (stopCoords && stopCoords.length > 0) {
              adapter.createPolyline(`route-line-${r.id}`, stopCoords, {
                color: '#93c5fd', // Light Blue
                opacity: 0.6,
                weight: 3
              });
            }
          });
        } catch (err) {
          console.error('Failed to init map in dashboard', err);
          if (mapEngine === 'google') {
            setMapEngine('leaflet');
          }
          return;
        }
      }

      const activeBusIds = new Set();

      allBuses.forEach((bus) => {
        if (!bus.currentLocation) return;
        activeBusIds.add(bus.id);

        const lat = bus.currentLocation.lat || bus.currentLocation._lat;
        const lng = bus.currentLocation.lng || bus.currentLocation._lng;
        const pos = { lat, lng };

        // Determine colors
        let markerColor = '#94a3b8'; // gray
        let leafletMarkerBg = 'bg-slate-400';
        if (bus.isOnTrip && bus.status === 'active') {
          markerColor = '#10b981'; // green
          leafletMarkerBg = 'bg-emerald-500';
        }
        if (bus.status === 'maintenance') {
          markerColor = '#ef4444'; // red
          leafletMarkerBg = 'bg-rose-500';
        }

        const iconOptions = {};
        if (mapEngine === 'google') {
          iconOptions.icon = {
            path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
            fillColor: markerColor,
            fillOpacity: 1,
            scale: 1.4,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            rotation: bus.heading || 0
          };
        } else {
          iconOptions.iconHtml = `<div style="transform: rotate(${bus.heading || 0}deg)" class="${leafletMarkerBg} border-2 border-white rounded-full h-7 w-7 flex items-center justify-center text-white shadow"><svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg></div>`;
        }

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 11px; padding: 4px; color: #1e293b; text-align: left;">
            <h5 style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold;">Bus ${bus.number}</h5>
            <p style="margin: 2px 0;"><b>Route:</b> ${bus.routeName || 'N/A'}</p>
            <p style="margin: 2px 0;"><b>Driver:</b> ${bus.driverName || 'Unassigned'}</p>
            <p style="margin: 2px 0;"><b>Speed:</b> ${bus.speed || 0} km/h</p>
            <p style="margin: 2px 0;"><b>Occupancy:</b> ${bus.occupancy || 0}/${bus.capacity || 52}</p>
            <a href="/tracking/${bus.id}" target="_blank" style="display: block; margin-top: 6px; font-weight: bold; color: #2563eb; text-decoration: none;">Track Live →</a>
          </div>
        `;

        const exists = adapter.markers[bus.id];
        if (!exists) {
          adapter.createMarker(bus.id, pos, {
            popupContent,
            ...iconOptions
          });
        } else {
          adapter.updateMarker(bus.id, pos, {
            animate: true,
            ...iconOptions
          });
        }
      });

      // Clear offline buses
      Object.keys(adapter.markers).forEach(id => {
        if (!activeBusIds.has(id)) {
          adapter.removeMarker(id);
        }
      });
    };

    setupMap();

    return () => {
      active = false;
    };
  }, [mapEngine, allBuses, contextRoutes, contextStops]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapAdapterRef.current) {
        mapAdapterRef.current.destroy();
      }
    };
  }, []);

  // 5. Resolve Issue Action
  const handleResolveIssue = async (issueId) => {
    try {
      if (isFirebaseEnabled) {
        await updateDoc(doc(db, 'issueReports', issueId), { status: 'resolved' });
      } else {
        const stored = JSON.parse(localStorage.getItem('citybus_mock_reports') || '[]');
        const updated = stored.map(i => i.id === issueId ? { ...i, status: 'resolved' } : i);
        localStorage.setItem('citybus_mock_reports', JSON.stringify(updated));
      }
      toast.success('Incident ticket marked as resolved');
    } catch (e) {
      toast.error('Failed to resolve issue');
    }
  };

  // 6. Filter Offline buses list
  const offlineBuses = allBuses.filter(bus => !bus.isOnTrip);

  return (
    <div className="space-y-6">
      
      {/* Real-time stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Active Buses Card */}
        <div className={`bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center gap-4 transition duration-300 ${pulseActiveBuses ? 'scale-105 border-emerald-400 bg-emerald-50/10' : ''}`}>
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl relative">
            <Bus size={22} className="stroke-[2.2]" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Fleet</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800"><CountUp to={activeBuses} /></span>
              <span className="text-slate-400 text-xs font-semibold">buses live</span>
            </div>
          </div>
        </div>

        {/* Total Routes Card */}
        <div className={`bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center gap-4 transition duration-300 ${pulseRoutes ? 'scale-105 border-blue-400 bg-blue-50/10' : ''}`}>
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl">
            <GitFork size={22} className="stroke-[2.2]" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Lines</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800"><CountUp to={totalRoutes} /></span>
              <span className="text-slate-400 text-xs font-semibold">routes</span>
            </div>
          </div>
        </div>

        {/* Drivers On Duty Card */}
        <div className={`bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center gap-4 transition duration-300 ${pulseDrivers ? 'scale-105 border-purple-400 bg-purple-50/10' : ''}`}>
          <div className="bg-purple-50 text-purple-600 p-3.5 rounded-2xl">
            <UserCheck size={22} className="stroke-[2.2]" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Drivers Duty</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800"><CountUp to={driversOnDuty} /></span>
              <span className="text-slate-400 text-xs font-semibold">on duty</span>
            </div>
          </div>
        </div>

        {/* Registered Passengers Card */}
        <div className={`bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center gap-4 transition duration-300 ${pulseUsers ? 'scale-105 border-indigo-400 bg-indigo-50/10' : ''}`}>
          <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl">
            <Users size={22} className="stroke-[2.2]" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Passengers</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-800"><CountUp to={registeredUsers} /></span>
              <span className="text-slate-400 text-xs font-semibold">registered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map + Offline list Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Live map panel */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Map size={16} className="text-primary" />
                Live Fleet Tracking
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Monitoring vehicles live in Hyderabad regional grid</p>
            </div>
            {/* Bus count overlay badge */}
            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow">
              {activeBuses} buses active
            </span>
          </div>

          <div className="h-[450px] relative rounded-2xl overflow-hidden border border-slate-100">
            {mapEngine === 'leaflet' && (
              <div className="absolute top-2 left-2 bg-slate-900/90 text-slate-300 border border-slate-800 rounded-lg py-1 px-2.5 text-[8px] font-bold z-30 flex items-center gap-1">
                <span>Low data mode — using lightweight map</span>
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        </div>

        {/* Offline Buses Sidebar */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col gap-4 text-left">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Offline Fleet</h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Buses currently idle or in maintenance</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[450px] space-y-3 pr-1 no-scrollbar">
            {offlineBuses.length === 0 ? (
              <div className="text-slate-400 text-xs text-center py-12 font-semibold">
                No offline buses.
              </div>
            ) : (
              offlineBuses.map((bus) => (
                <div 
                  key={bus.id}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col gap-2 hover:bg-slate-100/40 transition"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 text-xs">{bus.number}</span>
                    <Badge variant={bus.status === 'maintenance' ? 'danger' : 'neutral'}>
                      {bus.status?.toUpperCase() || 'OFFLINE'}
                    </Badge>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 space-y-0.5">
                    <p>Line: {bus.routeName?.split(' via ')[0] || 'Unassigned'}</p>
                    <p>Last seen: {bus.lastUpdated ? new Date(bus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System Setup & Seeding control panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 text-left">
        <div>
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <Check className="text-emerald-500" size={16} />
            System Setup & Seeding Control Panel
          </h4>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Initialize or reset the database collections and credentials for the Hyderabad regional grid
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4 font-semibold text-xs text-slate-600">
            <p>
              Operating Mode:{" "}
              {isFirebaseEnabled ? (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Firebase Connected
                </span>
              ) : (
                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                  Local Mock Storage Mode (Empty/Placeholder .env)
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              If Firebase is connected, this seeds active collections directly into Firestore. If operating in Local Mock Storage Mode, it seeds `localStorage` so you can test driver login (`driver1@citybus.gov.in` / `CityBus@2024`) and passenger live views without any network setup.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSeedDatabase}
                disabled={isSeedingData || isSeedingDrivers}
                className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl shadow-md transition"
              >
                {isSeedingData ? 'Seeding Datasets...' : 'Seed Hyderabad Datasets'}
              </button>

              <button
                onClick={handleSeedDrivers}
                disabled={isSeedingData || isSeedingDrivers}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl shadow-md transition"
              >
                {isSeedingDrivers ? 'Provisioning Drivers...' : 'Provision Driver Accounts'}
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col h-36">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-850 pb-1.5 mb-1.5">
              Seeding Logs Console
            </span>
            <textarea
              readOnly
              value={seedingLog || 'Idle. Awaiting command...'}
              className="flex-1 bg-transparent text-[10px] font-mono text-emerald-400 outline-none resize-none border-none leading-relaxed no-scrollbar"
            />
          </div>
        </div>
      </div>

      {/* Recent Issues List */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 text-left">
        <div>
          <h4 className="font-extrabold text-slate-800 text-sm">Recent Incident Tickets</h4>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Passenger submitted complaints and vehicle telemetry warnings</p>
        </div>

        <div className="overflow-x-auto w-full no-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Bus Details</th>
                <th className="py-3 px-4">Issue Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-semibold">
                    No recent incident reports. System clean! 🎉
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{issue.busNumber || `ID: ${issue.busId}`}</td>
                    <td className="py-3.5 px-4 capitalize font-bold text-slate-600">{issue.issueType?.replace('-', ' ')}</td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{issue.description}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-semibold">
                      {new Date(issue.createdAt?.seconds * 1000 || issue.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4">
                      {issue.status === 'resolved' ? (
                        <Badge variant="success">Resolved</Badge>
                      ) : (
                        <Badge variant="danger">Open</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {issue.status === 'open' && (
                        <button
                          onClick={() => handleResolveIssue(issue.id)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 ml-auto"
                        >
                          <Check size={10} />
                          <span>Mark Resolved</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
