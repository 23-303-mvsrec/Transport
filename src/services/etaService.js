import { haversineDistance } from '../utils/geoUtils';

/**
 * Calculates the ETA and delay status for a bus arriving at a target stop.
 * 
 * @param {Object} bus - Bus object with currentLocation, speed, currentStopIndex, status
 * @param {Object} targetStop - Target Stop object { id, lat, lng }
 * @param {Array} allStopsOnRoute - Array of all Stop objects on this route in sequence
 * @param {Object} route - Route object
 * @returns {Object} { etaMinutes, delayMinutes, status }
 */
export const calculateETA = (bus, targetStop, allStopsOnRoute, route) => {
  if (!bus || !targetStop || !allStopsOnRoute || allStopsOnRoute.length === 0) {
    return { etaMinutes: 5, delayMinutes: 0, status: "On Time" };
  }

  const currentIndex = bus.currentStopIndex || 0;
  const targetIndex = allStopsOnRoute.findIndex(s => s.id === targetStop.id);

  if (targetIndex === -1 || targetIndex < currentIndex) {
    return { etaMinutes: 0, delayMinutes: 0, status: "On Time" };
  }

  let remainingDistance = 0;
  
  // Start from bus's current real-time coordinates
  let currentPos = bus.currentLocation || {
    lat: allStopsOnRoute[currentIndex]?.location?.lat || allStopsOnRoute[currentIndex]?.lat || 30.3667,
    lng: allStopsOnRoute[currentIndex]?.location?.lng || allStopsOnRoute[currentIndex]?.lng || 76.1333
  };

  // Sum distance of consecutive segments up to the target stop
  for (let i = currentIndex; i <= targetIndex; i++) {
    const stop = allStopsOnRoute[i];
    const stopLat = stop.location?.lat || stop.lat;
    const stopLng = stop.location?.lng || stop.lng;
    
    if (stopLat !== undefined && stopLng !== undefined) {
      remainingDistance += haversineDistance(currentPos.lat, currentPos.lng, stopLat, stopLng);
      currentPos = { lat: stopLat, lng: stopLng };
    }
  }

  // Determine bus velocity: fallback to 25 km/h if static/offline
  const speed = bus.speed && bus.speed > 2 ? bus.speed : 25; 
  
  // ETA in minutes
  const etaMinutes = Math.max(1, Math.round((remainingDistance / speed) * 60));
  
  // Map any delays
  const delayMinutes = bus.status === 'maintenance' || bus.status === 'offline' ? 12 : 0;
  const status = delayMinutes > 0 ? `Delayed ${delayMinutes} min` : "On Time";

  return {
    etaMinutes,
    delayMinutes,
    status
  };
};

/**
 * Calculates cumulative ETAs for a series of remaining stops.
 */
export const calculateRouteETAs = (busCoords, remainingStops, avgSpeedKmh = 25) => {
  let currentPos = busCoords;
  let cumulativeMinutes = 0;
  
  return remainingStops.map((stop, index) => {
    const stopLat = stop.location?.lat || stop.lat;
    const stopLng = stop.location?.lng || stop.lng;
    const distanceMeters = haversineDistance(currentPos.lat, currentPos.lng, stopLat, stopLng) * 1000;
    
    const speedMps = (avgSpeedKmh * 1000) / 3600;
    const durationSeconds = (distanceMeters / speedMps) * 1.3;
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    
    cumulativeMinutes += durationMinutes;
    if (index > 0) cumulativeMinutes += 0.5;
    
    currentPos = { lat: stopLat, lng: stopLng };
    
    return {
      ...stop,
      etaMinutes: Math.round(cumulativeMinutes),
      distanceMeters
    };
  });
};
