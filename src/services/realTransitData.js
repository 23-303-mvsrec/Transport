import { haversineDistance } from '../utils/geoUtils';

const DEFAULT_GTFS_BASE_URL = '/gtfs';

export const DATA_SOURCES = {
  seed: 'seed',
  tgsrtcGtfs: 'tgsrtc-gtfs'
};

const stripBom = (value) => value?.replace(/^\uFEFF/, '') ?? '';

export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((item) => item !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((item) => item !== '')) rows.push(row);

  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => stripBom(header).trim());
  return rows.slice(1).map((values) => (
    headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {})
  ));
};

const fetchGtfsFile = async (baseUrl, fileName) => {
  const url = `${baseUrl.replace(/\/$/, '')}/${fileName}`;
  const response = await fetch(url, { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error(`GTFS file unavailable: ${fileName} (${response.status})`);
  }

  return parseCsv(await response.text());
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildStopRouteIndex = (trips, stopTimes) => {
  const tripToRoute = new Map(trips.map((trip) => [trip.trip_id, trip.route_id]));
  const index = new Map();

  stopTimes.forEach((stopTime) => {
    const routeId = tripToRoute.get(stopTime.trip_id);
    if (!routeId || !stopTime.stop_id) return;
    if (!index.has(stopTime.stop_id)) index.set(stopTime.stop_id, new Set());
    index.get(stopTime.stop_id).add(routeId);
  });

  return index;
};

const buildRouteStops = (trips, stopTimes) => {
  const firstTripByRoute = new Map();
  trips.forEach((trip) => {
    if (!firstTripByRoute.has(trip.route_id)) {
      firstTripByRoute.set(trip.route_id, trip.trip_id);
    }
  });

  const stopTimesByTrip = new Map();
  stopTimes.forEach((stopTime) => {
    if (!stopTimesByTrip.has(stopTime.trip_id)) stopTimesByTrip.set(stopTime.trip_id, []);
    stopTimesByTrip.get(stopTime.trip_id).push(stopTime);
  });

  const routeStops = new Map();
  firstTripByRoute.forEach((tripId, routeId) => {
    const orderedStops = (stopTimesByTrip.get(tripId) || [])
      .sort((a, b) => toNumber(a.stop_sequence) - toNumber(b.stop_sequence))
      .map((stopTime) => stopTime.stop_id)
      .filter(Boolean);

    routeStops.set(routeId, [...new Set(orderedStops)]);
  });

  return routeStops;
};

const estimateDistance = (stopIds, stopMap) => {
  let totalKm = 0;

  for (let index = 1; index < stopIds.length; index += 1) {
    const prev = stopMap.get(stopIds[index - 1]);
    const next = stopMap.get(stopIds[index]);
    if (!prev || !next) continue;
    totalKm += haversineDistance(prev.location.lat, prev.location.lng, next.location.lat, next.location.lng);
  }

  return Number(totalKm.toFixed(1));
};

const getRouteTimeWindow = (stopIds, stopTimes, trips, routeId) => {
  const tripIds = new Set(trips.filter((trip) => trip.route_id === routeId).map((trip) => trip.trip_id));
  const matchingTimes = stopTimes
    .filter((stopTime) => tripIds.has(stopTime.trip_id) && stopIds.includes(stopTime.stop_id))
    .map((stopTime) => stopTime.departure_time || stopTime.arrival_time)
    .filter(Boolean)
    .sort();

  return {
    firstBus: matchingTimes[0]?.slice(0, 5) || '',
    lastBus: matchingTimes[matchingTimes.length - 1]?.slice(0, 5) || ''
  };
};

export const normalizeGtfs = ({ routes, stops, trips, stopTimes }) => {
  const routeStopIndex = buildStopRouteIndex(trips, stopTimes);

  const normalizedStops = stops
    .filter((stop) => stop.stop_id && stop.stop_lat && stop.stop_lon)
    .map((stop) => ({
      id: stop.stop_id,
      name: stop.stop_name || stop.stop_id,
      address: stop.stop_desc || stop.zone_id || '',
      location: {
        lat: toNumber(stop.stop_lat),
        lng: toNumber(stop.stop_lon)
      },
      routeIds: [...(routeStopIndex.get(stop.stop_id) || [])],
      nearbyLandmarks: stop.stop_desc || '',
      isActive: true,
      source: DATA_SOURCES.tgsrtcGtfs
    }));

  const stopMap = new Map(normalizedStops.map((stop) => [stop.id, stop]));
  const routeStops = buildRouteStops(trips, stopTimes);

  const normalizedRoutes = routes
    .filter((route) => route.route_id)
    .map((route) => {
      const stopIds = routeStops.get(route.route_id) || [];
      const fromStop = stopMap.get(stopIds[0]);
      const toStop = stopMap.get(stopIds[stopIds.length - 1]);
      const timeWindow = getRouteTimeWindow(stopIds, stopTimes, trips, route.route_id);
      const totalDistance = estimateDistance(stopIds, stopMap);

      return {
        id: route.route_id,
        number: route.route_short_name || route.route_id,
        name: route.route_long_name || route.route_short_name || route.route_id,
        fromStopId: fromStop?.id || '',
        toStopId: toStop?.id || '',
        fromStopName: fromStop?.name || '',
        toStopName: toStop?.name || '',
        stopIds,
        totalDistance,
        estimatedDuration: totalDistance ? Math.max(10, Math.round((totalDistance / 18) * 60)) : 0,
        firstBus: timeWindow.firstBus,
        lastBus: timeWindow.lastBus,
        frequency: 0,
        isActive: true,
        source: DATA_SOURCES.tgsrtcGtfs
      };
    });

  return {
    routes: normalizedRoutes,
    stops: normalizedStops,
    source: DATA_SOURCES.tgsrtcGtfs,
    attribution: 'Contains data provided by TGSRTC'
  };
};

export const loadTgsrtcGtfsData = async () => {
  const source = import.meta.env.VITE_TRANSIT_DATA_SOURCE || '';
  const baseUrl = import.meta.env.VITE_TGSRTC_GTFS_BASE_URL || DEFAULT_GTFS_BASE_URL;

  if (source !== DATA_SOURCES.tgsrtcGtfs && !import.meta.env.VITE_TGSRTC_GTFS_BASE_URL) {
    return null;
  }

  const [routes, stops, trips, stopTimes] = await Promise.all([
    fetchGtfsFile(baseUrl, 'routes.txt'),
    fetchGtfsFile(baseUrl, 'stops.txt'),
    fetchGtfsFile(baseUrl, 'trips.txt'),
    fetchGtfsFile(baseUrl, 'stop_times.txt')
  ]);

  return normalizeGtfs({ routes, stops, trips, stopTimes });
};

export const fetchLegacyTsrtcBusStatus = async (trackingId) => {
  const baseUrl = import.meta.env.VITE_TSRTC_LEGACY_BATS_PROXY_URL;
  if (!baseUrl || !trackingId) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/appQuery.do?query=${encodeURIComponent(trackingId)}&flag=21`);
  if (!response.ok) throw new Error(`Legacy TSRTC status request failed (${response.status})`);

  const text = await response.text();
  if (!text || text === 'No records found.') return null;

  const parts = text.split(',');
  return {
    trackingId,
    raw: text,
    landmark: parts[4] || '',
    lastUpdated: parts[5] || '',
    status: parts[10] || '',
    source: 'legacy-tsrtc-bats'
  };
};
