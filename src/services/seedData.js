// Telangana (Hyderabad) Seed Data for CityBus

export const seedCity = {
  id: 'hyderabad',
  name: 'Hyderabad',
  state: 'Telangana',
  center: { lat: 17.4000, lng: 78.4800 },
  bounds: {
    north: 17.6500,
    south: 17.3000,
    east: 78.6500,
    west: 78.2500
  }
};

export const seedStops = [
  { id: 'stop-01', name: 'Koti Bus Station', address: 'Koti, Hyderabad', location: { lat: 17.3828, lng: 78.4831 }, routeIds: ['R-01', 'R-03', 'R-05'], nearbyLandmarks: 'Osmania Medical College', isActive: true },
  { id: 'stop-02', name: 'Nampally Station', address: 'Nampally, Hyderabad', location: { lat: 17.3888, lng: 78.4682 }, routeIds: ['R-01', 'R-03'], nearbyLandmarks: 'Hyderabad Deccan Station Entrance', isActive: true },
  { id: 'stop-03', name: 'Lakdikapul Metro', address: 'Lakdikapul, Hyderabad', location: { lat: 17.4042, lng: 78.4601 }, routeIds: ['R-01', 'R-03', 'R-06'], nearbyLandmarks: 'Ayodhya Junction', isActive: true },
  { id: 'stop-04', name: 'Punjagutta Circle', address: 'Punjagutta, Hyderabad', location: { lat: 17.4241, lng: 78.4523 }, routeIds: ['R-01', 'R-02', 'R-06'], nearbyLandmarks: 'NIMS Hospital', isActive: true },
  { id: 'stop-05', name: 'Ameerpet Junction', address: 'Ameerpet, Hyderabad', location: { lat: 17.4374, lng: 78.4482 }, routeIds: ['R-01', 'R-04'], nearbyLandmarks: 'Ameerpet Metro Interchange', isActive: true },
  { id: 'stop-06', name: 'Kukatpally Y Junction', address: 'Kukatpally, Hyderabad', location: { lat: 17.4841, lng: 78.4039 }, routeIds: ['R-01', 'R-04'], nearbyLandmarks: 'Kukatpally Metro', isActive: true },
  { id: 'stop-07', name: 'Miyapur Metro', address: 'Miyapur, Hyderabad', location: { lat: 17.4968, lng: 78.3614 }, routeIds: ['R-01', 'R-04'], nearbyLandmarks: 'Miyapur Bus Depot', isActive: true },
  { id: 'stop-08', name: 'Patancheru Terminus', address: 'Patancheru, Hyderabad', location: { lat: 17.5273, lng: 78.2677 }, routeIds: ['R-01'], nearbyLandmarks: 'Patancheru Industrial Area', isActive: true },
  { id: 'stop-09', name: 'Secunderabad Station', address: 'Secunderabad, Hyderabad', location: { lat: 17.4344, lng: 78.5016 }, routeIds: ['R-02', 'R-05', 'R-06', 'R-07'], nearbyLandmarks: 'Secunderabad Junction Platform 1', isActive: true },
  { id: 'stop-10', name: 'Begumpet Airport Road', address: 'Begumpet, Hyderabad', location: { lat: 17.4375, lng: 78.4622 }, routeIds: ['R-02', 'R-06'], nearbyLandmarks: 'Begumpet Metro Station', isActive: true },
  { id: 'stop-11', name: 'Khairatabad Circle', address: 'Khairatabad, Hyderabad', location: { lat: 17.4116, lng: 78.4608 }, routeIds: ['R-02', 'R-03', 'R-06'], nearbyLandmarks: 'Khairatabad Ganesh Pandal Gate', isActive: true },
  { id: 'stop-12', name: 'Masab Tank Junction', address: 'Masab Tank, Hyderabad', location: { lat: 17.4026, lng: 78.4501 }, routeIds: ['R-02', 'R-03', 'R-06'], nearbyLandmarks: 'JNTU Fine Arts College', isActive: true },
  { id: 'stop-13', name: 'Mehdipatnam Depot', address: 'Mehdipatnam, Hyderabad', location: { lat: 17.3916, lng: 78.4404 }, routeIds: ['R-02', 'R-03', 'R-06'], nearbyLandmarks: 'Rythu Bazar, PVNR Expressway Pillar 10', isActive: true },
  { id: 'stop-14', name: 'Tolichowki X Roads', address: 'Tolichowki, Hyderabad', location: { lat: 17.3986, lng: 78.4014 }, routeIds: ['R-03'], nearbyLandmarks: 'Tolichowki Flyover', isActive: true },
  { id: 'stop-15', name: 'Gachibowli Stadium', address: 'Gachibowli, Hyderabad', location: { lat: 17.4401, lng: 78.3489 }, routeIds: ['R-03'], nearbyLandmarks: 'Gachibowli ORR Entrance', isActive: true },
  { id: 'stop-16', name: 'Kondapur Junction', address: 'Kondapur, Hyderabad', location: { lat: 17.4622, lng: 78.3568 }, routeIds: ['R-03'], nearbyLandmarks: 'Botanical Garden Kondapur', isActive: true },
  { id: 'stop-17', name: 'Tarnaka Metro', address: 'Tarnaka, Hyderabad', location: { lat: 17.4262, lng: 78.5284 }, routeIds: ['R-05', 'R-07'], nearbyLandmarks: 'Aradhana Theatre Complex', isActive: true },
  { id: 'stop-18', name: 'Uppal Cross Roads', address: 'Uppal, Hyderabad', location: { lat: 17.4018, lng: 78.5602 }, routeIds: ['R-05', 'R-07'], nearbyLandmarks: 'Uppal Cricket Stadium Metro', isActive: true },
  { id: 'stop-19', name: 'LB Nagar Junction', address: 'LB Nagar, Hyderabad', location: { lat: 17.3460, lng: 78.5512 }, routeIds: ['R-05'], nearbyLandmarks: 'LB Nagar Ring Road', isActive: true },
  { id: 'stop-20', name: 'Dilshuknagar Bus Station', address: 'Dilshuknagar, Hyderabad', location: { lat: 17.3688, lng: 78.5247 }, routeIds: ['R-05'], nearbyLandmarks: 'Dilshuknagar Metro Pillar', isActive: true }
];

export const seedRoutes = [
  {
    id: 'R-01',
    number: '218',
    name: 'Koti to Patancheru via Ameerpet',
    fromStopId: 'stop-01',
    toStopId: 'stop-08',
    fromStopName: 'Koti Bus Station',
    toStopName: 'Patancheru Terminus',
    stopIds: ['stop-01', 'stop-02', 'stop-03', 'stop-11', 'stop-04', 'stop-05', 'stop-06', 'stop-07', 'stop-08'],
    totalDistance: 29.5,
    estimatedDuration: 75,
    firstBus: '06:00',
    lastBus: '22:00',
    frequency: 15,
    isActive: true
  },
  {
    id: 'R-02',
    number: '49M',
    name: 'Secunderabad to Mehdipatnam via Begumpet',
    fromStopId: 'stop-09',
    toStopId: 'stop-13',
    fromStopName: 'Secunderabad Station',
    toStopName: 'Mehdipatnam Depot',
    stopIds: ['stop-09', 'stop-10', 'stop-04', 'stop-11', 'stop-12', 'stop-13'],
    totalDistance: 11.2,
    estimatedDuration: 35,
    firstBus: '06:30',
    lastBus: '21:30',
    frequency: 20,
    isActive: true
  },
  {
    id: 'R-03',
    number: '127K',
    name: 'Koti to Kondapur via Mehdipatnam',
    fromStopId: 'stop-01',
    toStopId: 'stop-16',
    fromStopName: 'Koti Bus Station',
    toStopName: 'Kondapur Junction',
    stopIds: ['stop-01', 'stop-02', 'stop-03', 'stop-11', 'stop-12', 'stop-13', 'stop-14', 'stop-15', 'stop-16'],
    totalDistance: 18.5,
    estimatedDuration: 50,
    firstBus: '07:00',
    lastBus: '21:00',
    frequency: 30,
    isActive: true
  },
  {
    id: 'R-04',
    number: '219S',
    name: 'Ameerpet to Miyapur Shuttle',
    fromStopId: 'stop-05',
    toStopId: 'stop-07',
    fromStopName: 'Ameerpet Junction',
    toStopName: 'Miyapur Metro',
    stopIds: ['stop-05', 'stop-06', 'stop-07'],
    totalDistance: 9.8,
    estimatedDuration: 25,
    firstBus: '07:00',
    lastBus: '20:00',
    frequency: 30,
    isActive: true
  },
  {
    id: 'R-05',
    number: '90L',
    name: 'Secunderabad to Dilshuknagar via Uppal',
    fromStopId: 'stop-09',
    toStopId: 'stop-01',
    fromStopName: 'Secunderabad Station',
    toStopName: 'Koti Bus Station',
    stopIds: ['stop-09', 'stop-17', 'stop-18', 'stop-19', 'stop-20', 'stop-01'],
    totalDistance: 22.4,
    estimatedDuration: 60,
    firstBus: '06:15',
    lastBus: '21:45',
    frequency: 25,
    isActive: true
  },
  {
    id: 'R-06',
    number: '5K',
    name: 'Secunderabad to Mehdipatnam via Birla Temple',
    fromStopId: 'stop-09',
    toStopId: 'stop-13',
    fromStopName: 'Secunderabad Station',
    toStopName: 'Mehdipatnam Depot',
    stopIds: ['stop-09', 'stop-10', 'stop-03', 'stop-11', 'stop-12', 'stop-13'],
    totalDistance: 12.0,
    estimatedDuration: 40,
    firstBus: '06:00',
    lastBus: '22:00',
    frequency: 15,
    isActive: true
  },
  {
    id: 'R-07',
    number: '18V',
    name: 'Secunderabad to Uppal Express',
    fromStopId: 'stop-09',
    toStopId: 'stop-18',
    fromStopName: 'Secunderabad Station',
    toStopName: 'Uppal Cross Roads',
    stopIds: ['stop-09', 'stop-17', 'stop-18'],
    totalDistance: 8.5,
    estimatedDuration: 20,
    firstBus: '07:30',
    lastBus: '20:30',
    frequency: 30,
    isActive: true
  }
];

export const seedBuses = [
  { id: 'bus-01', number: 'TS-09-UA-1001', routeId: 'R-01', routeName: 'Koti to Patancheru via Ameerpet', driverId: 'driver-01', driverName: 'Srinivasa Rao', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: true, type: 'regular', lastUpdated: null },
  { id: 'bus-02', number: 'TS-09-UA-1002', routeId: 'R-01', routeName: 'Koti to Patancheru via Ameerpet', driverId: 'driver-02', driverName: 'K. Venkatesh', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-03', number: 'TS-10-UB-2001', routeId: 'R-02', routeName: 'Secunderabad to Mehdipatnam via Begumpet', driverId: 'driver-03', driverName: 'Mohd. Jahangir', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: true, type: 'express', lastUpdated: null },
  { id: 'bus-04', number: 'TS-10-UB-2002', routeId: 'R-02', routeName: 'Secunderabad to Mehdipatnam via Begumpet', driverId: 'driver-04', driverName: 'T. Naresh', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-05', number: 'TS-11-UC-3001', routeId: 'R-03', routeName: 'Koti to Kondapur via Mehdipatnam', driverId: 'driver-05', driverName: 'Ch. Ramakrishna', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-06', number: 'TS-11-UC-3002', routeId: 'R-03', routeName: 'Koti to Kondapur via Mehdipatnam', driverId: 'driver-06', driverName: 'G. Anjaneyulu', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: true, type: 'regular', lastUpdated: null },
  { id: 'bus-07', number: 'TS-12-UD-4001', routeId: 'R-04', routeName: 'Ameerpet to Miyapur Shuttle', driverId: 'driver-07', driverName: 'P. Prabhakar', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-08', number: 'TS-12-UD-4002', routeId: 'R-04', routeName: 'Ameerpet to Miyapur Shuttle', driverId: 'driver-08', driverName: 'Syed Yousuf', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-09', number: 'TS-13-UE-5001', routeId: 'R-05', routeName: 'Secunderabad to Dilshuknagar via Uppal', driverId: 'driver-09', driverName: 'M. Sridhar', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: true, type: 'regular', lastUpdated: null },
  { id: 'bus-10', number: 'TS-13-UE-5002', routeId: 'R-05', routeName: 'Secunderabad to Dilshuknagar via Uppal', driverId: 'driver-10', driverName: 'B. Vijay Kumar', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-11', number: 'TS-14-UF-6001', routeId: 'R-06', routeName: 'Secunderabad to Mehdipatnam via Birla Temple', driverId: 'driver-11', driverName: 'K. Shiva Kumar', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: true, type: 'express', lastUpdated: null },
  { id: 'bus-12', number: 'TS-14-UF-6002', routeId: 'R-06', routeName: 'Secunderabad to Mehdipatnam via Birla Temple', driverId: 'driver-12', driverName: 'J. Raju', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-13', number: 'TS-07-UG-7001', routeId: 'R-07', routeName: 'Secunderabad to Uppal Express', driverId: 'driver-13', driverName: 'V. Ravi', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null },
  { id: 'bus-14', number: 'TS-08-UH-8001', routeId: 'R-07', routeName: 'Secunderabad to Uppal Express', driverId: 'driver-14', driverName: 'N. Srinivas', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: true, type: 'regular', lastUpdated: null },
  { id: 'bus-15', number: 'TS-08-UH-8002', routeId: 'R-07', routeName: 'Secunderabad to Uppal Express', driverId: 'driver-15', driverName: 'D. Bhaskar', capacity: 52, occupancy: 0, status: 'idle', isOnTrip: false, currentLocation: null, currentStopIndex: 0, speed: 0, heading: 0, isAC: false, type: 'regular', lastUpdated: null }
];

export const seedDrivers = [
  { id: 'driver-01', uid: 'driver-uid-01', name: 'Srinivasa Rao', phone: '+91 98480 22001', licenseNumber: 'TS-09-2015-001', assignedBusId: 'bus-01', assignedRouteId: 'R-01', status: 'on-duty', isOnTrip: false, joinDate: '2019-04-12', rating: 4.8, totalTrips: 1250 },
  { id: 'driver-02', uid: 'driver-uid-02', name: 'K. Venkatesh', phone: '+91 98480 22002', licenseNumber: 'TS-09-2016-002', assignedBusId: 'bus-02', assignedRouteId: 'R-01', status: 'on-duty', isOnTrip: false, joinDate: '2020-01-15', rating: 4.5, totalTrips: 980 },
  { id: 'driver-03', uid: 'driver-uid-03', name: 'Mohd. Jahangir', phone: '+91 98480 22003', licenseNumber: 'TS-10-2017-003', assignedBusId: 'bus-03', assignedRouteId: 'R-02', status: 'on-duty', isOnTrip: false, joinDate: '2021-06-20', rating: 4.9, totalTrips: 740 },
  { id: 'driver-04', uid: 'driver-uid-04', name: 'T. Naresh', phone: '+91 98480 22004', licenseNumber: 'TS-10-2015-004', assignedBusId: 'bus-04', assignedRouteId: 'R-02', status: 'on-duty', isOnTrip: false, joinDate: '2018-09-05', rating: 4.2, totalTrips: 1540 },
  { id: 'driver-05', uid: 'driver-uid-05', name: 'Ch. Ramakrishna', phone: '+91 98480 22005', licenseNumber: 'TS-11-2018-005', assignedBusId: 'bus-05', assignedRouteId: 'R-03', status: 'on-duty', isOnTrip: false, joinDate: '2022-02-11', rating: 4.6, totalTrips: 520 },
  { id: 'driver-06', uid: 'driver-uid-06', name: 'G. Anjaneyulu', phone: '+91 98480 22006', licenseNumber: 'TS-11-2019-006', assignedBusId: 'bus-06', assignedRouteId: 'R-03', status: 'on-duty', isOnTrip: false, joinDate: '2022-10-01', rating: 4.7, totalTrips: 410 },
  { id: 'driver-07', uid: 'driver-uid-07', name: 'P. Prabhakar', phone: '+91 98480 22007', licenseNumber: 'TS-12-2020-007', assignedBusId: 'bus-07', assignedRouteId: 'R-04', status: 'on-duty', isOnTrip: false, joinDate: '2023-03-15', rating: 4.4, totalTrips: 310 },
  { id: 'driver-08', uid: 'driver-uid-08', name: 'Syed Yousuf', phone: '+91 98480 22008', licenseNumber: 'TS-12-2016-008', assignedBusId: 'bus-08', assignedRouteId: 'R-04', status: 'on-duty', isOnTrip: false, joinDate: '2020-11-20', rating: 4.6, totalTrips: 830 },
  { id: 'driver-09', uid: 'driver-uid-09', name: 'M. Sridhar', phone: '+91 98480 22009', licenseNumber: 'TS-13-2017-009', assignedBusId: 'bus-09', assignedRouteId: 'R-05', status: 'on-duty', isOnTrip: false, joinDate: '2021-02-25', rating: 4.8, totalTrips: 690 },
  { id: 'driver-10', uid: 'driver-uid-10', name: 'B. Vijay Kumar', phone: '+91 98480 22010', licenseNumber: 'TS-13-2015-010', assignedBusId: 'bus-10', assignedRouteId: 'R-05', status: 'on-duty', isOnTrip: false, joinDate: '2019-12-05', rating: 4.3, totalTrips: 1120 },
  { id: 'driver-11', uid: 'driver-uid-11', name: 'K. Shiva Kumar', phone: '+91 98480 22011', licenseNumber: 'TS-14-2021-011', assignedBusId: 'bus-11', assignedRouteId: 'R-06', status: 'on-duty', isOnTrip: false, joinDate: '2024-01-15', rating: 4.7, totalTrips: 150 },
  { id: 'driver-12', uid: 'driver-uid-12', name: 'J. Raju', phone: '+91 98480 22012', licenseNumber: 'TS-14-2022-012', assignedBusId: 'bus-12', assignedRouteId: 'R-06', status: 'on-duty', isOnTrip: false, joinDate: '2024-05-10', rating: 4.5, totalTrips: 80 },
  { id: 'driver-13', uid: 'driver-uid-13', name: 'V. Ravi', phone: '+91 98480 22013', licenseNumber: 'TS-07-2020-013', assignedBusId: 'bus-13', assignedRouteId: 'R-07', status: 'on-duty', isOnTrip: false, joinDate: '2023-08-22', rating: 4.4, totalTrips: 280 },
  { id: 'driver-14', uid: 'driver-uid-14', name: 'N. Srinivas', phone: '+91 98480 22014', licenseNumber: 'TS-08-2018-014', assignedBusId: 'bus-14', assignedRouteId: 'R-07', status: 'on-duty', isOnTrip: false, joinDate: '2022-05-18', rating: 4.7, totalTrips: 490 },
  { id: 'driver-15', uid: 'driver-uid-15', name: 'D. Bhaskar', phone: '+91 98480 22015', licenseNumber: 'TS-08-2019-015', assignedBusId: 'bus-15', assignedRouteId: 'R-07', status: 'on-duty', isOnTrip: false, joinDate: '2023-02-14', rating: 4.6, totalTrips: 340 }
];

export const seedAnnouncements = [
  { id: 'ann-01', title: 'Route 218: Delay Alert', message: 'Moderate traffic near Punjagutta Circle. Buses on Route 218 facing 5-10 mins delay.', type: 'delay', affectedRouteId: 'R-01', affectedBusNumber: null, priority: 'medium', isActive: true, createdBy: 'admin-uid', createdAt: new Date(Date.now() - 30 * 60000).toISOString(), expiresAt: null },
  { id: 'ann-02', title: 'New Electric Buses on 49M and 127K', message: 'Happy to introduce new electric AC Smart Buses on Secunderabad and Mehdipatnam routes starting this Monday!', type: 'info', affectedRouteId: null, affectedBusNumber: null, priority: 'low', isActive: true, createdBy: 'admin-uid', createdAt: new Date(Date.now() - 180 * 60000).toISOString(), expiresAt: null },
  { id: 'ann-03', title: 'Road Diversion at Begumpet', address: 'Begumpet Flyover Junction', message: 'Buses on 49M and 5K are taking detour via Airport Road. Stops at Begumpet Station might experience minor delays.', type: 'route', affectedRouteId: 'R-02', affectedBusNumber: null, priority: 'high', isActive: true, createdBy: 'admin-uid', createdAt: new Date(Date.now() - 600 * 60000).toISOString(), expiresAt: null },
  { id: 'ann-04', title: 'Maintenance Notice - Bus TS-09-UA-1002', message: 'Bus TS-09-UA-1002 is under scheduled maintenance today. Route 218 backup bus is running.', type: 'maintenance', affectedRouteId: 'R-01', affectedBusNumber: 'TS-09-UA-1002', priority: 'low', isActive: true, createdBy: 'admin-uid', createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), expiresAt: null },
  { id: 'ann-05', title: 'Monsoon Scheduling Updates', message: 'During heavy rain, frequency of all Express routes may be relaxed to 25 minutes for passenger safety.', type: 'info', affectedRouteId: null, affectedBusNumber: null, priority: 'medium', isActive: true, createdBy: 'admin-uid', createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), expiresAt: null }
];
