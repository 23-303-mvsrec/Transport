// Hyderabad Seed Data for CityBus
// Uses real TSRTC data from TGSRTC open data portal
// Source: https://github.com/iotakodali/hyd-bus-data (CC BY-NC-SA 4.0)

import {
  hyderabadCity as seedCity,
  hyderabadStops as seedStops,
  hyderabadRoutes as seedRoutes,
  hyderabadBuses as seedBuses,
  hyderabadDrivers as seedDrivers,
  hyderabadAnnouncements as seedAnnouncements,
  stopRouteMapping
} from './hyderabadTransitData';

export { seedCity, seedStops, seedRoutes, seedBuses, seedDrivers, seedAnnouncements, stopRouteMapping };

// Helper function to get stops by route ID
export function getStopsByRoute(routeId) {
  const route = seedRoutes.find(r => r.id === routeId);
  if (!route) return [];
  return route.stopIds.map(stopId => seedStops.find(s => s.id === stopId)).filter(Boolean);
}

// Helper function to get routes by stop ID
export function getRoutesByStop(stopId) {
  const routeIds = stopRouteMapping[stopId] || [];
  return routeIds.map(routeId => seedRoutes.find(r => r.id === routeId)).filter(Boolean);
}

// Helper function to get buses by route ID
export function getBusesByRoute(routeId) {
  return seedBuses.filter(b => b.routeId === routeId);
}

// Helper function to search stops by name
export function searchStops(query) {
  const lowerQuery = query.toLowerCase();
  return seedStops.filter(stop => 
    stop.name.toLowerCase().includes(lowerQuery) ||
    stop.address.toLowerCase().includes(lowerQuery)
  );
}

// Helper function to get nearby stops
export function getNearbyStops(lat, lng, radiusKm = 2) {
  const R = 6371; // Earth's radius in km
  
  return seedStops
    .map(stop => {
      const dLat = (stop.location.lat - lat) * Math.PI / 180;
      const dLng = (stop.location.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(stop.location.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return { ...stop, distance };
    })
    .filter(stop => stop.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Export total counts for admin dashboard
export const dataStats = {
  totalStops: seedStops.length,
  totalRoutes: seedRoutes.length,
  totalBuses: seedBuses.length,
  totalDrivers: seedDrivers.length,
  totalAnnouncements: seedAnnouncements.length
};
