import { interpolatePosition, haversineDistance } from '../utils/geoUtils';

// Mock Stops coordinates around Hubli, Karnataka, India (approximate coordinates)
export const mockStops = {
  // Route 101 Stops
  'cbs': { id: 'cbs', name: 'Central Bus Stand (CBS)', lat: 15.3524, lng: 75.1378, amenities: ['Restroom', 'Ticketing', 'Water'] },
  'rly_stn': { id: 'rly_stn', name: 'Hubli Railway Station', lat: 15.3475, lng: 75.1481, amenities: ['Restroom', 'Waiting Hall'] },
  'vidya': { id: 'vidya', name: 'Vidyanagar Circle', lat: 15.3620, lng: 75.1220, amenities: ['Bench', 'Digital Display'] },
  'kle': { id: 'kle', name: 'KLE Tech University', lat: 15.3715, lng: 75.1205, amenities: ['Digital Display'] },
  'unkal': { id: 'unkal', name: 'Unkal Lake Terminal', lat: 15.3855, lng: 75.1145, amenities: ['Shelter', 'Ticketing'] },

  // Route 202 Stops
  'court': { id: 'court', name: 'District Court Circle', lat: 15.3545, lng: 75.1305, amenities: ['Shelter'] },
  'navanagar': { id: 'navanagar', name: 'Navanagar Bus Stop', lat: 15.3995, lng: 75.0880, amenities: ['Shelter', 'Water'] },
  'sattur': { id: 'sattur', name: 'Sattur Circle', lat: 15.4215, lng: 75.0590, amenities: ['Shelter'] },
  'sdm': { id: 'sdm', name: 'SDM Medical Hospital', lat: 15.4345, lng: 75.0450, amenities: ['Restroom', 'Shelter', 'Digital Display'] }
};

export const mockRoutes = [
  {
    id: '101',
    number: '101',
    name: 'CBS to Unkal Lake (via Vidyanagar)',
    color: '#0b57d0',
    fare: 15,
    stops: [
      mockStops.cbs,
      mockStops.rly_stn,
      mockStops.vidya,
      mockStops.kle,
      mockStops.unkal
    ]
  },
  {
    id: '202',
    number: '202',
    name: 'CBS to SDM Hospital (via Navanagar)',
    color: '#0f766e',
    fare: 25,
    stops: [
      mockStops.cbs,
      mockStops.court,
      mockStops.navanagar,
      mockStops.sattur,
      mockStops.sdm
    ]
  }
];

// Active mock buses list
let simulatedBuses = [
  {
    id: 'KA-25-F-1200',
    routeId: '101',
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98765 43210',
    capacity: 40,
    passengers: 12,
    speedKmh: 28,
    status: 'In Transit',
    lat: mockStops.cbs.lat,
    lng: mockStops.cbs.lng,
    currentStopIndex: 0,
    nextStopIndex: 1,
    direction: 1, // 1: forward, -1: reverse
    progress: 0, // 0 to 1 progress between current and next stop
    isBoarding: false,
    boardingTimer: 0
  },
  {
    id: 'KA-25-F-3400',
    routeId: '101',
    driverName: 'Abdul Hanif',
    driverPhone: '+91 94455 12345',
    capacity: 45,
    passengers: 38,
    speedKmh: 24,
    status: 'In Transit',
    lat: mockStops.unkal.lat,
    lng: mockStops.unkal.lng,
    currentStopIndex: 4,
    nextStopIndex: 3,
    direction: -1,
    progress: 0,
    isBoarding: false,
    boardingTimer: 0
  },
  {
    id: 'KA-25-F-5600',
    routeId: '202',
    driverName: 'Manjunath Gowda',
    driverPhone: '+91 91234 56789',
    capacity: 40,
    passengers: 22,
    speedKmh: 30,
    status: 'In Transit',
    lat: mockStops.cbs.lat,
    lng: mockStops.cbs.lng,
    currentStopIndex: 0,
    nextStopIndex: 1,
    direction: 1,
    progress: 0,
    isBoarding: false,
    boardingTimer: 0
  }
];

let intervalId = null;

export const startSimulation = (onUpdate) => {
  if (intervalId) return;

  intervalId = setInterval(() => {
    simulatedBuses = simulatedBuses.map(bus => {
      const route = mockRoutes.find(r => r.id === bus.routeId);
      if (!route) return bus;

      // Handle boarding delay at bus stop
      if (bus.isBoarding) {
        const nextTimer = bus.boardingTimer - 1;
        if (nextTimer <= 0) {
          // Finished boarding, continue to next segment
          return {
            ...bus,
            isBoarding: false,
            boardingTimer: 0,
            status: 'In Transit'
          };
        } else {
          return {
            ...bus,
            boardingTimer: nextTimer
          };
        }
      }

      // Increment progress along current route segment
      // Simulation speeds: advance progress by a step (e.g. 0.05 per tick)
      let progressStep = 0.03 + Math.random() * 0.02; // randomized speed increment
      let nextProgress = bus.progress + progressStep;

      let currentStop = route.stops[bus.currentStopIndex];
      let nextStop = route.stops[bus.nextStopIndex];

      if (!currentStop || !nextStop) return bus;

      if (nextProgress >= 1) {
        // Reached next stop! Set up boarding state
        const reachedStopIndex = bus.nextStopIndex;
        let newCurrentIndex = reachedStopIndex;
        let newNextIndex = reachedStopIndex + bus.direction;
        let newDirection = bus.direction;

        // Check if we hit the terminal ends of the route
        if (newNextIndex >= route.stops.length) {
          newDirection = -1;
          newNextIndex = reachedStopIndex - 1;
        } else if (newNextIndex < 0) {
          newDirection = 1;
          newNextIndex = reachedStopIndex + 1;
        }

        // Randomize passenger occupancy count at stops
        const newPassengers = Math.floor(Math.random() * (bus.capacity - 5)) + 3;

        return {
          ...bus,
          lat: nextStop.lat,
          lng: nextStop.lng,
          currentStopIndex: newCurrentIndex,
          nextStopIndex: newNextIndex,
          direction: newDirection,
          progress: 0,
          isBoarding: true,
          boardingTimer: 6, // Wait for 6 ticks (~6 seconds)
          status: `Boarding at ${nextStop.name}`,
          passengers: newPassengers
        };
      }

      // Interpolate current position between current and next stop
      const currentPos = interpolatePosition(currentStop, nextStop, nextProgress);

      return {
        ...bus,
        lat: currentPos.lat,
        lng: currentPos.lng,
        progress: nextProgress,
        status: 'In Transit'
      };
    });

    onUpdate([...simulatedBuses]);
  }, 1000); // Ticks every 1 second
};

export const stopSimulation = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

export const getSimulatedBuses = () => [...simulatedBuses];

// Helper to push a new bus to the fleet simulation
export const addSimulatedBus = (bus) => {
  simulatedBuses.push({
    ...bus,
    lat: mockStops.cbs.lat,
    lng: mockStops.cbs.lng,
    currentStopIndex: 0,
    nextStopIndex: 1,
    direction: 1,
    progress: 0,
    isBoarding: false,
    boardingTimer: 0
  });
};
