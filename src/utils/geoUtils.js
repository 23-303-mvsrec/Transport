/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Finds the stop in a list that is closest to the user's location.
 */
export const getClosestStop = (userLocation, stopsList) => {
  if (!userLocation || !stopsList || stopsList.length === 0) return null;
  
  let closest = null;
  let minDistance = Infinity;
  
  stopsList.forEach(stop => {
    const stopLat = stop.location?.lat || stop.lat;
    const stopLng = stop.location?.lng || stop.lng;
    
    if (stopLat !== undefined && stopLng !== undefined) {
      const dist = haversineDistance(userLocation.lat, userLocation.lng, stopLat, stopLng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = stop;
      }
    }
  });
  
  return closest;
};

/**
 * Calculates the bearing angle in degrees (0-360) between two points.
 */
export const getBearing = (from, to) => {
  const lat1 = (from.lat * Math.PI) / 180;
  const lon1 = (from.lng * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const lon2 = (to.lng * Math.PI) / 180;
  
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return ((brng * 180) / Math.PI + 360) % 360;
};

/**
 * Interpolates coordinates between two positions.
 */
export const interpolatePosition = (from, to, fraction) => {
  const lat = from.lat + (to.lat - from.lat) * fraction;
  const lng = from.lng + (to.lng - from.lng) * fraction;
  return { lat, lng };
};
