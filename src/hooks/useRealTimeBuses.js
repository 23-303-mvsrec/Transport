import { useBuses } from '../contexts/BusContext';

/**
 * Custom hook to filter buses belonging to a specific route.
 * 
 * @param {string} routeId 
 * @returns {Array} List of buses active on this route
 */
export const useRealTimeBuses = (routeId) => {
  const { buses } = useBuses();
  if (!routeId) return [];
  return buses.filter(bus => bus.routeId === routeId);
};
