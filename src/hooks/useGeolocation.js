import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to interface with the browser Geolocation watchPosition API.
 * 
 * @returns {Object} { position, accuracy, speed, heading, error, isTracking, startTracking, stopTracking }
 */
export const useGeolocation = () => {
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isTrackingRef = useRef(false);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (retryTimeoutRef.current !== null) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setPosition(null);
    setAccuracy(null);
    setSpeed(null);
    setHeading(null);
    setError(null);
    setIsTracking(false);
    console.log("Geolocation tracking terminated.");
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    if (watchIdRef.current !== null) return; // Already watching

    isTrackingRef.current = true;
    setIsTracking(true);
    setError(null);

    const successCallback = (pos) => {
      const coords = pos.coords;
      
      setPosition({
        lat: coords.latitude,
        lng: coords.longitude
      });
      
      setAccuracy(coords.accuracy);
      
      // Convert m/s speed to km/h speed
      setSpeed(coords.speed !== null && coords.speed !== undefined ? Math.round(coords.speed * 3.6) : null);
      setHeading(coords.heading);
      setError(null);
    };

    const errorCallback = (err) => {
      let message = "An unknown error occurred while retrieving location.";
      
      if (err.code === err.PERMISSION_DENIED) {
        message = "Please allow location access in browser settings";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        message = "GPS signal unavailable. Move to open area.";
      } else if (err.code === err.TIMEOUT) {
        message = "Location request timed out. Retrying...";
        
        // Auto-retry on timeout after 3 seconds
        if (isTrackingRef.current) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          retryTimeoutRef.current = setTimeout(() => {
            if (isTrackingRef.current) startTracking();
          }, 3000);
        }
      }
      
      setError(message);
      console.warn("Geolocation watchPosition error:", message, err);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    try {
      const id = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
      watchIdRef.current = id;
    } catch (e) {
      setError("Failed to initialize location watch listener.");
      setIsTracking(false);
      isTrackingRef.current = false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    position,
    accuracy,
    speed,
    heading,
    error,
    isTracking,
    startTracking,
    stopTracking
  };
};

export default useGeolocation;
