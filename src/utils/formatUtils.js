import { format } from 'date-fns';

/**
 * Formats amount into Indian Rupees format.
 * @param {number} amount 
 * @returns {string} e.g. "₹25"
 */
export const formatRupees = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formats duration in minutes into a friendly string.
 * @param {number} minutes 
 * @returns {string} e.g. "12 mins" or "1 hr 5 mins"
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins !== 1 ? 's' : ''}` : ''}`;
};

/**
 * Generates greeting message based on current hour.
 * @returns {string} "Good morning", "Good afternoon", etc.
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Formats date into readable string.
 */
export const formatDate = (date) => {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
};

/**
 * Translates passenger count to status.
 */
export const getOccupancyStatus = (currentPassengerCount, capacity = 40) => {
  const ratio = currentPassengerCount / capacity;
  if (ratio < 0.3) return { text: 'Seats Available', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  if (ratio < 0.7) return { text: 'Standing Only', color: 'text-amber-600 bg-amber-50 border-amber-100' };
  return { text: 'Almost Full', color: 'text-rose-600 bg-rose-50 border-rose-100' };
};
