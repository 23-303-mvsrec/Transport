import { useState, useEffect, useMemo } from 'react';
import { useRealTimeBus } from './useRealTimeBus';
import { useBuses } from '../contexts/BusContext';
import { calculateETA } from '../services/etaService';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseEnabled } from '../services/firebase';

/**
 * Custom hook to calculate arrival estimations and upcoming stop names for an active bus.
 * 
 * @param {string} busId 
 * @param {string} targetStopId - ID of user's nearest stop
 * @returns {Object} { etaMinutes, nextStop, followingStop, delayStatus, isCalculating }
 */
export const useETA = (busId, targetStopId) => {
  const { bus, loading: busLoading } = useRealTimeBus(busId);
  const { routes, stops } = useBuses();

  const [routeCache, setRouteCache] = useState({});
  const [fetchingRoute, setFetchingRoute] = useState(false);

  // Get active route ID
  const routeId = bus?.routeId;

  // Retrieve route stops (fetching from Firestore and caching if not already loaded)
  useEffect(() => {
    if (!routeId) return;

    // Check context cache first
    const ctxRoute = routes.find(r => r.id === routeId);
    if (ctxRoute) {
      setRouteCache(prev => ({ ...prev, [routeId]: ctxRoute }));
      return;
    }

    // Check local state cache
    if (routeCache[routeId]) return;

    if (isFirebaseEnabled) {
      setFetchingRoute(true);
      getDoc(doc(db, 'routes', routeId))
        .then((docSnap) => {
          if (docSnap.exists()) {
            setRouteCache(prev => ({ ...prev, [routeId]: { id: docSnap.id, ...docSnap.data() } }));
          }
        })
        .catch(err => console.error("Failed to fetch route for ETA calculation:", err))
        .finally(() => setFetchingRoute(false));
    }
  }, [routeId, routes, routeCache]);

  const results = useMemo(() => {
    const isCalculating = busLoading || fetchingRoute;

    if (!bus || !routeId || !routeCache[routeId] || !targetStopId) {
      return { 
        etaMinutes: null, 
        nextStop: null, 
        followingStop: null, 
        delayStatus: 'On Time', 
        isCalculating 
      };
    }

    const route = routeCache[routeId];
    
    // Resolve all stop sequences
    const routeStops = route.stopIds
      .map(sid => stops.find(s => s.id === sid) || { id: sid, name: sid })
      .filter(Boolean);

    const targetStop = routeStops.find(s => s.id === targetStopId);

    // Run segment travel calculations
    const etaObj = calculateETA(bus, targetStop, routeStops, route);

    // Identify next and following stops based on bus progression and direction
    const direction = bus.direction || 1;
    const currentIdx = bus.currentStopIndex || 0;
    
    const nextIdx = currentIdx + direction;
    const followIdx = currentIdx + (direction * 2);

    const nextStop = routeStops[nextIdx] || null;
    const followingStop = routeStops[followIdx] || null;

    return {
      etaMinutes: etaObj.etaMinutes,
      nextStop,
      followingStop,
      delayStatus: etaObj.status,
      isCalculating
    };
  }, [bus, routeId, routeCache, targetStopId, stops, busLoading, fetchingRoute]);

  return results;
};

export default useETA;
