import { useBuses } from '../contexts/BusContext';

/**
 * Hook to stream coordinates for all active buses.
 * 
 * @returns {Array} List of active buses
 */
export const useAllBuses = () => {
  const { buses } = useBuses();
  return buses;
};

export default useAllBuses;
