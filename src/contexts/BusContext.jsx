import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseEnabled } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  limit
} from 'firebase/firestore';
import { 
  seedBuses, 
  seedRoutes, 
  seedStops, 
  seedAnnouncements 
} from '../services/seedData';
import { loadTgsrtcGtfsData, DATA_SOURCES } from '../services/realTransitData';
import toast from 'react-hot-toast';

const BusContext = createContext();

export const useBuses = () => useContext(BusContext);

export const BusProvider = ({ children }) => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState(seedRoutes);
  const [stops, setStops] = useState(seedStops);
  const [alerts, setAlerts] = useState(seedAnnouncements);
  const [activeRouteId, setActiveRouteId] = useState('R-01');
  const [activeBusId, setActiveBusId] = useState(null);
  const [isFirebaseOffline, setIsFirebaseOffline] = useState(false);
  const [dataSource, setDataSource] = useState(DATA_SOURCES.seed);
  const [dataAttribution, setDataAttribution] = useState('');
  
  // Real-time synchronization
  useEffect(() => {
    if (isFirebaseEnabled) {
      let firstLoad = true;
      
      const handleError = (error) => {
        console.warn("Firestore sync:", error.code || error.message);
        if (['unavailable', 'permission-denied', 'not-found', 'failed-precondition'].includes(error.code)) {
          setIsFirebaseOffline(true);
        }
      };

      // Load and sync from Firestore with limits
      const unsubscribeBuses = onSnapshot(
        query(collection(db, 'buses'), limit(100)),
        (snapshot) => {
          setIsFirebaseOffline(false);
          const busList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setBuses(busList);
          
          // Auto-seed if empty on first load
          if (firstLoad && busList.length === 0) {
            console.log('Firestore buses empty, auto-seeding...');
            import('../services/firebase').then(({ seedDatabase }) => {
              seedDatabase().then(() => console.log('Auto-seed complete')).catch(console.error);
            });
          }
          firstLoad = false;
        },
        handleError
      );

      const unsubscribeRoutes = onSnapshot(
        query(collection(db, 'routes'), limit(50)),
        (snapshot) => {
          setIsFirebaseOffline(false);
          const routeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRoutes(routeList.length > 0 ? routeList : seedRoutes);
        },
        handleError
      );

      const unsubscribeStops = onSnapshot(
        query(collection(db, 'stops'), limit(200)),
        (snapshot) => {
          setIsFirebaseOffline(false);
          const stopList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStops(stopList.length > 0 ? stopList : seedStops);
        },
        handleError
      );

      const unsubscribeAlerts = onSnapshot(
        query(collection(db, 'announcements'), limit(50)),
        (snapshot) => {
          setIsFirebaseOffline(false);
          const alertList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAlerts(alertList.length > 0 ? alertList : seedAnnouncements);
        },
        handleError
      );

      return () => {
        unsubscribeBuses();
        unsubscribeRoutes();
        unsubscribeStops();
        unsubscribeAlerts();
      };
    } else {
      // Mock Local Storage synchronization
      let cancelled = false;

      const syncLocalData = () => {
        const localBuses = localStorage.getItem('citybus_mock_buses');
        const localRoutes = localStorage.getItem('citybus_mock_routes');
        const localStops = localStorage.getItem('citybus_mock_stops');
        const localAlerts = localStorage.getItem('citybus_mock_announcements');

        if (localBuses) {
          setBuses(JSON.parse(localBuses));
        } else {
          localStorage.setItem('citybus_mock_buses', JSON.stringify(seedBuses));
          setBuses(seedBuses);
        }

        if (localRoutes) {
          setRoutes(JSON.parse(localRoutes));
        } else {
          localStorage.setItem('citybus_mock_routes', JSON.stringify(seedRoutes));
          setRoutes(seedRoutes);
        }

        if (localStops) {
          setStops(JSON.parse(localStops));
        } else {
          localStorage.setItem('citybus_mock_stops', JSON.stringify(seedStops));
          setStops(seedStops);
        }

        if (localAlerts) {
          setAlerts(JSON.parse(localAlerts));
        } else {
          localStorage.setItem('citybus_mock_announcements', JSON.stringify(seedAnnouncements));
          setAlerts(seedAnnouncements);
        }
      };

      syncLocalData();
      loadTgsrtcGtfsData()
        .then((gtfsData) => {
          if (cancelled || !gtfsData) return;
          if (gtfsData.routes.length > 0) {
            setRoutes(gtfsData.routes);
            localStorage.setItem('citybus_mock_routes', JSON.stringify(gtfsData.routes));
          }
          if (gtfsData.stops.length > 0) {
            setStops(gtfsData.stops);
            localStorage.setItem('citybus_mock_stops', JSON.stringify(gtfsData.stops));
          }
          setDataSource(gtfsData.source);
          setDataAttribution(gtfsData.attribution);
        })
        .catch((error) => {
          if (import.meta.env.VITE_TRANSIT_DATA_SOURCE === DATA_SOURCES.tgsrtcGtfs) {
            console.warn('TGSRTC GTFS data could not be loaded; using bundled seed data.', error.message);
          }
        });

      const interval = setInterval(syncLocalData, 1000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, []);

  // CRUD FOR BUSES
  const addBus = async (busData) => {
    if (isFirebaseEnabled) {
      try {
        await setDoc(doc(db, 'buses', busData.id), busData);
        toast.success(`Bus ${busData.id} added successfully`);
      } catch (err) {
        toast.error('Failed to add bus');
      }
    } else {
      const updated = [...buses, busData];
      localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
      setBuses(updated);
      toast.success(`Bus ${busData.id} added successfully`);
    }
  };

  const updateBus = async (busId, updatedFields) => {
    if (isFirebaseEnabled) {
      try {
        await updateDoc(doc(db, 'buses', busId), updatedFields);
        toast.success(`Bus details updated`);
      } catch (err) {
        toast.error('Failed to update bus');
      }
    } else {
      const updated = buses.map(bus => bus.id === busId ? { ...bus, ...updatedFields } : bus);
      localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
      setBuses(updated);
      toast.success(`Bus details updated`);
    }
  };

  const deleteBus = async (busId) => {
    if (isFirebaseEnabled) {
      try {
        await deleteDoc(doc(db, 'buses', busId));
        toast.success(`Bus deleted`);
      } catch (err) {
        toast.error('Failed to delete bus');
      }
    } else {
      const updated = buses.filter(bus => bus.id !== busId);
      localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
      setBuses(updated);
      toast.success(`Bus deleted`);
    }
  };

  // CRUD FOR ROUTES
  const addRoute = async (routeData) => {
    if (isFirebaseEnabled) {
      try {
        await addDoc(collection(db, 'routes'), routeData);
        toast.success(`Route ${routeData.number} created`);
      } catch (err) {
        toast.error('Failed to create route');
      }
    } else {
      const newRoute = { id: String(Date.now()), ...routeData };
      const updated = [...routes, newRoute];
      localStorage.setItem('citybus_mock_routes', JSON.stringify(updated));
      setRoutes(updated);
      toast.success(`Route ${routeData.number} created locally`);
    }
  };

  const updateRoute = async (routeId, updatedFields) => {
    if (isFirebaseEnabled) {
      try {
        await updateDoc(doc(db, 'routes', routeId), updatedFields);
        toast.success(`Route updated`);
      } catch (err) {
        toast.error('Failed to update route');
      }
    } else {
      const updated = routes.map(r => r.id === routeId ? { ...r, ...updatedFields } : r);
      localStorage.setItem('citybus_mock_routes', JSON.stringify(updated));
      setRoutes(updated);
      toast.success(`Route details updated`);
    }
  };

  const deleteRoute = async (routeId) => {
    if (isFirebaseEnabled) {
      try {
        await deleteDoc(doc(db, 'routes', routeId));
        toast.success('Route deleted');
      } catch (err) {
        toast.error('Failed to delete route');
      }
    } else {
      const updated = routes.filter(r => r.id !== routeId);
      localStorage.setItem('citybus_mock_routes', JSON.stringify(updated));
      setRoutes(updated);
      toast.success('Route deleted locally');
    }
  };

  // CRUD FOR STOPS
  const addStop = async (stopData) => {
    if (isFirebaseEnabled) {
      try {
        await addDoc(collection(db, 'stops'), stopData);
        toast.success(`Stop ${stopData.name} created`);
      } catch (err) {
        toast.error('Failed to add stop');
      }
    } else {
      const newStop = { id: `stop-${Date.now()}`, ...stopData };
      const updated = [...stops, newStop];
      localStorage.setItem('citybus_mock_stops', JSON.stringify(updated));
      setStops(updated);
      toast.success(`Stop ${stopData.name} created locally`);
    }
  };

  const updateStop = async (stopId, updatedFields) => {
    if (isFirebaseEnabled) {
      try {
        await updateDoc(doc(db, 'stops', stopId), updatedFields);
        toast.success(`Stop details updated`);
      } catch (err) {
        toast.error('Failed to update stop');
      }
    } else {
      const updated = stops.map(s => s.id === stopId ? { ...s, ...updatedFields } : s);
      localStorage.setItem('citybus_mock_stops', JSON.stringify(updated));
      setStops(updated);
      toast.success('Stop details updated');
    }
  };

  const deleteStop = async (stopId) => {
    if (isFirebaseEnabled) {
      try {
        await deleteDoc(doc(db, 'stops', stopId));
        toast.success('Stop deleted');
      } catch (err) {
        toast.error('Failed to delete stop');
      }
    } else {
      const updated = stops.filter(s => s.id !== stopId);
      localStorage.setItem('citybus_mock_stops', JSON.stringify(updated));
      setStops(updated);
      toast.success('Stop deleted locally');
    }
  };

  // CRUD FOR ALERTS / ANNOUNCEMENTS
  const addAlert = async (alertData) => {
    const newAlert = {
      id: `alert-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...alertData
    };
    
    if (isFirebaseEnabled) {
      try {
        await setDoc(doc(db, 'announcements', newAlert.id), newAlert);
        toast.success('Announcement broadcasted');
      } catch (err) {
        toast.error('Failed to broadcast announcement');
      }
    } else {
      const updated = [newAlert, ...alerts];
      localStorage.setItem('citybus_mock_announcements', JSON.stringify(updated));
      setAlerts(updated);
      toast.success('Announcement broadcasted locally');
    }
  };

  const deleteAlert = async (alertId) => {
    if (isFirebaseEnabled) {
      try {
        await deleteDoc(doc(db, 'announcements', alertId));
        toast.success('Announcement deleted');
      } catch (err) {
        toast.error('Failed to delete announcement');
      }
    } else {
      const updated = alerts.filter(a => a.id !== alertId);
      localStorage.setItem('citybus_mock_announcements', JSON.stringify(updated));
      setAlerts(updated);
      toast.success('Announcement removed');
    }
  };

  return (
    <BusContext.Provider value={{
      buses,
      routes,
      stops,
      alerts,
      activeRouteId,
      setActiveRouteId,
      activeBusId,
      setActiveBusId,
      addBus,
      updateBus,
      deleteBus,
      addRoute,
      updateRoute,
      deleteRoute,
      addStop,
      updateStop,
      deleteStop,
      addAlert,
      deleteAlert,
      isFirebaseOffline,
      isSimulated: !isFirebaseEnabled,
      dataSource,
      dataAttribution
    }}>
      {children}
    </BusContext.Provider>
  );
};
