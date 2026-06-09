import { useBuses } from '../contexts/BusContext';
import { getDistance } from '../utils/geoUtils';

// Default center of operations (Hyderabad Koti) if user location is not active
const DEFAULT_CENTER = { lat: 17.3828, lng: 78.4831 };

/**
 * Hook to calculate and sort stops near a user location.
 * 
 * @param {Object} userLocation - { lat, lng }
 * @param {number} maxDistanceMeters - maximum range filter (optional)
 * @returns {Array} Stops sorted by proximity, with distance details
 */
export const useNearbyStops = (userLocation, maxDistanceMeters = 5000) => {
  const { stops } = useBuses();
  
  const referenceLocation = userLocation && userLocation.lat && userLocation.lng 
    ? userLocation 
    : DEFAULT_CENTER;

  const stopsWithDistance = stops.map(stop => {
    const stopLat = stop.location?.lat || stop.lat;
    const stopLng = stop.location?.lng || stop.lng;
    const distance = getDistance(
      referenceLocation.lat,
      referenceLocation.lng,
      stopLat,
      stopLng
    );
    return {
      ...stop,
      distanceMeters: distance
    };
  });

  // Sort stops by distance ascending
  const sortedStops = stopsWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Filter by max distance if requested
  if (maxDistanceMeters) {
    return sortedStops.filter(stop => stop.distanceMeters <= maxDistanceMeters);
  }

  return sortedStops;
};
