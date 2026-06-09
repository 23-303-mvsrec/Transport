import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseEnabled } from '../services/firebase';
import { useBuses } from '../contexts/BusContext';

/**
 * Hook to stream a single bus document with location transition memory and staleness check.
 * 
 * @param {string} busId 
 * @returns {Object} { bus, prevLocation, currentLocation, stale, loading, error }
 */
export const useRealTimeBus = (busId) => {
  const { buses } = useBuses();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prevLocation, setPrevLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [stale, setStale] = useState(false);
  const [, forceUpdate] = useState(0); // Ticker state for live second updates

  const lastLocRef = useRef(null);

  // Live seconds ticker to keep stale flag and "last updated" state accurate
  useEffect(() => {
    const ticker = setInterval(() => {
      forceUpdate(x => x + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Sync bus document from Firebase or Context
  useEffect(() => {
    if (!busId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isFirebaseEnabled) {
      const unsubscribe = onSnapshot(
        doc(db, 'buses', busId),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() };
            setBus(data);
            
            // Check location change
            const newLoc = data.currentLocation;
            if (newLoc && JSON.stringify(newLoc) !== JSON.stringify(lastLocRef.current)) {
              setPrevLocation(lastLocRef.current);
              setCurrentLocation(newLoc);
              lastLocRef.current = newLoc;
            }
          } else {
            setError(new Error('Bus document not found'));
          }
          setLoading(false);
        },
        (err) => {
          console.error("Firestore single bus stream failed:", err);
          setError(err);
          setLoading(false);
        }
      );
      return unsubscribe;
    } else {
      // Local Mock Mode: Watch Context buses updates
      const matched = buses.find(b => b.id === busId);
      if (matched) {
        setBus(matched);
        
        const newLoc = matched.currentLocation;
        if (newLoc && JSON.stringify(newLoc) !== JSON.stringify(lastLocRef.current)) {
          setPrevLocation(lastLocRef.current);
          setCurrentLocation(newLoc);
          lastLocRef.current = newLoc;
        }
      }
      setLoading(false);
    }
  }, [busId, buses]);

  // Derived Staleness (older than 60 seconds)
  useEffect(() => {
    if (!bus) {
      setStale(false);
      return;
    }

    let lastUpdatedMs = 0;
    if (bus.lastUpdated) {
      if (typeof bus.lastUpdated.toMillis === 'function') {
        lastUpdatedMs = bus.lastUpdated.toMillis();
      } else {
        lastUpdatedMs = new Date(bus.lastUpdated).getTime();
      }
    }

    if (lastUpdatedMs) {
      const isStale = Date.now() - lastUpdatedMs > 60000;
      setStale(isStale);
    } else {
      setStale(false);
    }
  }, [bus, Date.now()]); // Triggered on tick or bus update

  return {
    bus,
    prevLocation,
    currentLocation,
    stale,
    loading,
    error
  };
};

export default useRealTimeBus;
