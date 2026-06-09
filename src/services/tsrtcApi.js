// TSRTC (Telangana State Road Transport Corporation) API Integration
// Real-time bus tracking and ETA data
// Sources: TGSRTC Open Data, VTPIS API, GAMYAM app

// ==================== API CONFIGURATION ====================

const TSRTC_CONFIG = {
  // VTPIS API (Legacy) - May be decommissioned
  vtpisBaseUrl: 'http://125.16.1.204:8080/vtpis',
  
  // TGSRTC Open Data Portal
  openDataPortal: 'https://tgsrtc.telangana.gov.in/open-data',
  
  // GTFS Download Form
  gtfsDownloadForm: 'https://docs.google.com/forms/d/e/1FAIpQLScwhvSJvhDiFUQfe0gngnxhcabpE95n01ANDa6SM3jE65R6ow/viewform',
  
  // GAMYAM App (Official TGSRTC tracking)
  gamyamApp: 'https://play.google.com/store/apps/details?id=com.tsrtc',
  
  // Request timeout
  timeout: 10000,
  
  // Rate limiting (requests per minute)
  maxRequestsPerMinute: 30,
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000
};

// ==================== VTPIS API ====================

/**
 * Fetch real-time ETA data for a bus stop from TSRTC VTPIS API
 * @param {string} stopId - TSRTC stop ID (e.g., "348" for Koti)
 * @returns {Promise<Array>} Array of bus arrivals with ETA
 */
export async function fetchStopETA(stopId) {
  try {
    const url = `${TSRTC_CONFIG.vtpisBaseUrl}/appQuery.do?query=${stopId},0,67&flag=6`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'CityBus-Hyderabad/1.0'
      },
      signal: AbortSignal.timeout(TSRTC_CONFIG.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`VTPIS API error: ${response.status}`);
    }
    
    const text = await response.text();
    return parseVTPISResponse(text, stopId);
  } catch (error) {
    console.warn(`VTPIS API unavailable for stop ${stopId}:`, error.message);
    // Return simulated data as fallback
    return generateSimulatedETA(stopId);
  }
}

/**
 * Parse VTPIS API response (semicolon-separated text)
 * Format: "vehicle,route,direction,eta;vehicle,route,direction,eta;..."
 * Example: "AP11Z6881-METRO EXPRESS,222A,KOTI,15:02:51;AP11Z6882-METRO EXPRESS,222A,KOTI,15:02:53"
 */
function parseVTPISResponse(text, stopId) {
  if (!text || text.trim() === '') {
    return [];
  }
  
  const arrivals = [];
  const busEntries = text.split(';').filter(entry => entry.trim() !== '');
  
  for (const entry of busEntries) {
    const parts = entry.split(',');
    if (parts.length >= 4) {
      const [vehicleInfo, route, direction, eta] = parts;
      const [vehicleNumber, busType] = vehicleInfo.split('-');
      
      arrivals.push({
        stopId,
        vehicleNumber: vehicleNumber?.trim() || 'Unknown',
        route: route?.trim() || 'Unknown',
        direction: direction?.trim() || 'Unknown',
        busType: busType?.trim() || 'CITY BUS',
        eta: eta?.trim() || 'Unknown',
        timestamp: new Date().toISOString(),
        source: 'vtpis'
      });
    }
  }
  
  return arrivals;
}

// ==================== GTFS DATA PARSER ====================

/**
 * Parse GTFS stops.txt file content
 * @param {string} csvContent - CSV content of stops.txt
 * @returns {Array} Parsed stops array
 */
export function parseGTFSStops(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const stops = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      const stop = {};
      headers.forEach((header, index) => {
        stop[header] = values[index]?.trim().replace(/"/g, '');
      });
      
      stops.push({
        id: stop.stop_id || stop.id,
        name: stop.stop_name || stop.name,
        location: {
          lat: parseFloat(stop.stop_lat || stop.lat),
          lng: parseFloat(stop.stop_lon || stop.lng)
        },
        routeIds: [],
        nearbyLandmarks: '',
        isActive: true
      });
    }
  }
  
  return stops;
}

/**
 * Parse GTFS routes.txt file content
 * @param {string} csvContent - CSV content of routes.txt
 * @returns {Array} Parsed routes array
 */
export function parseGTFSRoutes(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const routes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      const route = {};
      headers.forEach((header, index) => {
        route[header] = values[index]?.trim().replace(/"/g, '');
      });
      
      routes.push({
        id: `R-${route.route_id || route.id}`,
        number: route.route_short_name || route.route || 'Unknown',
        name: route.route_long_name || route.origin_destination || '',
        fromStopId: null,
        toStopId: null,
        fromStopName: '',
        toStopName: '',
        stopIds: [],
        totalDistance: 0,
        estimatedDuration: 0,
        firstBus: '06:00',
        lastBus: '22:00',
        frequency: 15,
        isActive: true
      });
    }
  }
  
  return routes;
}

/**
 * Parse GTFS trips.txt file content
 * @param {string} csvContent - CSV content of trips.txt
 * @returns {Array} Parsed trips array
 */
export function parseGTFSTrips(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const trips = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      const trip = {};
      headers.forEach((header, index) => {
        trip[header] = values[index]?.trim().replace(/"/g, '');
      });
      
      trips.push({
        id: trip.trip_id || trip.id,
        routeId: trip.route_id,
        directionId: parseInt(trip.direction_id) || 0,
        serviceId: trip.service_id,
        shapeId: trip.shape_id
      });
    }
  }
  
  return trips;
}

/**
 * Parse GTFS stop_times.txt file content
 * @param {string} csvContent - CSV content of stop_times.txt
 * @returns {Array} Parsed stop times array
 */
export function parseGTFSStopTimes(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const stopTimes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      const stopTime = {};
      headers.forEach((header, index) => {
        stopTime[header] = values[index]?.trim().replace(/"/g, '');
      });
      
      stopTimes.push({
        tripId: stopTime.trip_id,
        arrivalTime: stopTime.arrival_time,
        departureTime: stopTime.departure_time,
        stopId: stopTime.stop_id,
        stopSequence: parseInt(stopTime.stop_sequence) || 0,
        stopHeadsign: stopTime.stop_headsign
      });
    }
  }
  
  return stopTimes;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse a CSV line, handling quoted values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Generate simulated ETA data when API is unavailable
 * Uses realistic patterns based on time of day
 */
function generateSimulatedETA(stopId) {
  const now = new Date();
  const hour = now.getHours();
  const isPeakHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
  
  const baseFrequency = isPeakHour ? 8 : 15;
  const numBuses = isPeakHour ? 3 : 2;
  
  const arrivals = [];
  const vehiclePrefixes = ['AP11Z', 'TS09UA', 'TS10UB', 'TS11UC'];
  const busTypes = ['METRO EXPRESS', 'METRO DELUX', 'CITY BUS', 'PUSHRAK AC'];
  const directions = ['INBOUND', 'OUTBOUND'];
  
  for (let i = 0; i < numBuses; i++) {
    const etaMinutes = (i + 1) * baseFrequency + Math.floor(Math.random() * 5);
    const etaTime = new Date(now.getTime() + etaMinutes * 60000);
    
    arrivals.push({
      stopId,
      vehicleNumber: `${vehiclePrefixes[Math.floor(Math.random() * vehiclePrefixes.length)]}${Math.floor(1000 + Math.random() * 9000)}`,
      route: `${Math.floor(1 + Math.random() * 300)}${['A', 'B', 'C', 'D', 'S', 'N', 'V'][Math.floor(Math.random() * 7)]}`,
      direction: directions[Math.floor(Math.random() * directions.length)],
      busType: busTypes[Math.floor(Math.random() * busTypes.length)],
      eta: `${etaTime.getHours().toString().padStart(2, '0')}:${etaTime.getMinutes().toString().padStart(2, '0')}:${etaTime.getSeconds().toString().padStart(2, '0')}`,
      timestamp: now.toISOString(),
      source: 'simulated'
    });
  }
  
  return arrivals;
}

// ==================== DATA CONVERSION ====================

/**
 * Convert TSRTC raw stop data to CityBus format
 * @param {Array} rawStops - Raw stop data from CSV
 * @returns {Array} CityBus format stops
 */
export function convertTSRTCStopsToCityBus(rawStops) {
  return rawStops.map(stop => ({
    id: stop.stop_id || stop.id,
    name: stop.stop_name || stop.name,
    address: `${stop.stop_name || stop.name}, Hyderabad`,
    location: {
      lat: parseFloat(stop.lat || stop.stop_lat),
      lng: parseFloat(stop.lng || stop.stop_lon)
    },
    routeIds: [],
    nearbyLandmarks: '',
    isActive: true
  }));
}

/**
 * Convert TSRTC raw route data to CityBus format
 * @param {Array} rawRoutes - Raw route data from CSV
 * @returns {Array} CityBus format routes
 */
export function convertTSRTCRoutesToCityBus(rawRoutes) {
  return rawRoutes.map(route => ({
    id: `R-${route.route_id || route.id}`,
    number: route.route || route.route_short_name || 'Unknown',
    name: route.origin_destination || route.route_long_name || '',
    fromStopId: null,
    toStopId: null,
    fromStopName: '',
    toStopName: '',
    stopIds: [],
    totalDistance: 0,
    estimatedDuration: 0,
    firstBus: '06:00',
    lastBus: '22:00',
    frequency: 15,
    isActive: true
  }));
}

/**
 * Convert TSRTC raw route stops order data to CityBus format
 * @param {Array} rawRouteStops - Raw route stops order data
 * @returns {Object} Map of routeId to ordered stopIds
 */
export function convertTSRTCRouteStopsToCityBus(rawRouteStops) {
  const routeStopMap = {};
  
  for (const entry of rawRouteStops) {
    const routeId = `R-${entry.route_id}`;
    if (!routeStopMap[routeId]) {
      routeStopMap[routeId] = [];
    }
    routeStopMap[routeId].push(entry.stop_id);
  }
  
  return routeStopMap;
}

// ==================== EXPORTS ====================

export default {
  fetchStopETA,
  parseGTFSStops,
  parseGTFSRoutes,
  parseGTFSTrips,
  parseGTFSStopTimes,
  convertTSRTCStopsToCityBus,
  convertTSRTCRoutesToCityBus,
  convertTSRTCRouteStopsToCityBus,
  TSRTC_CONFIG
};
