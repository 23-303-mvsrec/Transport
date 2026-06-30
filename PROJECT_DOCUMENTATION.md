# CityBus — Real-Time Public Transport Tracking System (Hyderabad)

---

## 1. Project Overview

CityBus is a real-time public transport tracking web application designed for Hyderabad city public buses operated by TSRTC (Telangana State Road Transport Corporation). The application provides live GPS-based bus tracking, estimated time of arrival (ETA) calculations, route browsing, service alerts, and occupancy information to passengers, while offering fleet management and monitoring tools to drivers and administrators.

The system addresses the common urban commuter problem of uncertainty regarding bus arrival times, route information, and service disruptions. By providing real-time GPS位置 updates every 5 seconds from active buses, passengers can make informed decisions about their commute without relying on physical displays or guesswork at bus stops.

The project is built as a full-stack web application with three distinct portals — Passenger, Driver, and Admin — each with role-based authentication and authorization. The application uses real Hyderabad TSRTC bus stop coordinates, route data, and vehicle registration formats to ensure authenticity and relevance to the city's transit infrastructure.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18.3.1 + Vite 5.2.11 | Modern SPA with fast HMR, lazy loading, code splitting |
| **Styling** | Tailwind CSS 3.4.3 + PostCSS + Autoprefixer | Utility-first responsive UI with dark mode support |
| **Routing** | React Router DOM 6.23.1 | Client-side routing with nested route guards |
| **Maps (Default)** | Leaflet 1.9.4 + OpenStreetMap tiles | Free, open-source map tiles with no API key required |
| **Maps (Optional)** | Google Maps JavaScript API | High-fidelity maps with geometry library (lazy-loaded) |
| **Backend/Database** | Firebase Firestore 10.12.0 | Real-time NoSQL document database with onSnapshot listeners |
| **Authentication** | Firebase Auth (Email/Password + Google SSO) | Multi-provider authentication with role-based access |
| **Hosting** | Firebase Hosting | SPA deployment with automatic SSL and CDN |
| **PWA** | vite-plugin-pwa + Workbox 7.1.0 | Service worker generation, offline caching, installable app |
| **State Management** | React Context API (3 contexts) | AuthContext, BusContext, MapContext for global state |
| **Notifications** | react-hot-toast 2.4.1 | Lightweight toast notifications with tap-to-dismiss |
| **Icons** | lucide-react 0.379.0 | Tree-shakeable SVG icon library |
| **Date Utilities** | date-fns 3.6.0 | Lightweight date formatting and manipulation |
| **Language** | JavaScript (ES Modules) | No TypeScript — kept simple for academic scope |

---

## 3. Architecture

The application follows a **Single Page Application (SPA)** architecture with three independently routed portals sharing a common Firebase backend.

```
React SPA (Vite)
├── AuthProvider (Firebase Auth + Firestore role lookup)
├── BusProvider (Firestore real-time sync + localStorage fallback)
├── MapProvider (Google Maps / Leaflet adapter detection)
│
├── /login, /forgot-password, /driver/login (Public)
│
├── Passenger Portal (/home, /routes, /tracking/:busId, /alerts, /profile)
│   └── Uses: useRealTimeBus, useETA, useGeolocation, MapAdapter
│
├── Driver Portal (/driver/dashboard)
│   └── Uses: GPSService, useGeolocation, trip state machine
│
└── Admin Portal (/admin/dashboard, /admin/buses, /admin/routes, /admin/stops, /admin/drivers, /admin/announcements, /admin/users)
    └── Uses: seedDatabase, seedDriverAccounts, onSnapshot live stats
```

**Directory Structure:**

| Path | Description |
|------|-------------|
| `src/App.jsx` | Root component with BrowserRouter, route definitions, Suspense boundaries |
| `src/contexts/AuthContext.jsx` | Authentication state, role resolution, login/signup/logout methods |
| `src/contexts/BusContext.jsx` | Firestore real-time sync for buses, routes, stops, announcements + CRUD |
| `src/contexts/MapContext.jsx` | Google Maps detection and provider switching |
| `src/hooks/useGeolocation.js` | Browser Geolocation API wrapper with watchPosition |
| `src/hooks/useETA.js` | ETA calculation combining real-time bus data with route stop sequences |
| `src/hooks/useRealTimeBus.js` | Single bus document real-time stream with staleness detection |
| `src/hooks/useConnectionQuality.js` | Network Information API wrapper for bandwidth detection |
| `src/services/firebase.js` | Firebase initialization, seeding, driver account provisioning |
| `src/services/seedData.js` | Re-exports Hyderabad transit data with helper functions |
| `src/services/hyderabadTransitData.js` | 48 real Hyderabad stops, 7 routes, 15 buses, 15 drivers |
| `src/services/realTransitData.js` | TGSRTC GTFS parser for real transit data import |
| `src/services/mapsService.js` | MapAdapter class (Google Maps + Leaflet), initMap, loadGoogleMaps |
| `src/services/gpsService.js` | GPSService class — GPS broadcasting, trip lifecycle, Firestore writes |
| `src/services/etaService.js` | Haversine-based ETA calculation with delay detection |
| `src/simulation/busSimulator.js` | Client-side bus position simulation for testing |
| `src/utils/geoUtils.js` | haversineDistance, getClosestStop, getBearing, interpolatePosition |
| `src/pages/user/` | Passenger portal pages |
| `src/pages/driver/` | Driver portal pages |
| `src/pages/admin/` | Admin portal pages |
| `src/components/shared/` | Route guards, loaders, skeletons, error boundaries |
| `src/components/user/` | UserLayout, UserHeader, BottomNav, MobileFrame |
| `src/components/admin/` | AdminLayout, AdminSidebar, AdminNavbar, DataTable |

---

## 4. Firebase Setup

**Project ID:** `transport-653af`

| Firebase Service | Usage |
|-----------------|-------|
| **Cloud Firestore** | Real-time database for buses, routes, stops, drivers, users, announcements, tripLogs, issueReports, cities |
| **Firebase Authentication** | Email/password login, Google SSO popup, role-based user profiles |
| **Firebase Hosting** | SPA deployment at `public: "y"` directory with SPA rewrites |

**Dual Mode Operation:**

The `isFirebaseEnabled` flag in `src/services/firebase.js` (line 24) controls whether the app uses live Firebase or localStorage fallback:

```javascript
const isFirebaseConfigValid =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_firebase_api_key_here' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id';
```

When Firebase config is missing or uses placeholder values, the app automatically falls back to localStorage-based mock mode with seed data pre-populated (lines 41-55 of `firebase.js`). This enables full offline development and demonstration without any cloud connectivity.

**Firestore Security Rules** (`firestore.rules`):

- **Cities/Stops/Routes:** Read is public (unauthenticated), write requires admin role
- **Buses:** Read is public, create/delete requires admin, update allows driver for their assigned bus (limited to telemetry fields only: `currentLocation`, `speed`, `heading`, `lastUpdated`, `occupancy`, `currentStopIndex`, `status`, `isOnTrip`)
- **Drivers:** Read requires authentication, write requires admin
- **Users:** Read/write requires ownership or admin role
- **Announcements:** Read requires `isActive == true` or admin, write requires admin
- **TripLogs:** Read requires admin, create requires admin or driver (own logs only)
- **IssueReports:** Create requires authentication with `reportedBy` matching auth UID, read/write requires admin

**Secondary Firebase App:**

The `seedDriverAccounts` function in `firebase.js` (lines 110-156) uses `createUserWithEmailAndPassword` with the primary app instance to create 15 driver accounts (driver1@citybus.gov.in through driver15@citybus.gov.in) with standardized password `CityBus@2024`. Each driver account includes a Firestore user document with role set to `driver` and a corresponding driver record in the `drivers` collection.

---

## 5. Authentication System

**Three Roles:** `admin`, `driver`, `user` (passenger)

**Authentication Flow:**

1. User navigates to `/login` (passenger), `/driver/login` (driver), or directly to `/admin` (admin)
2. Credentials submitted to `signInWithEmailAndPassword` (Firebase) or mock localStorage lookup
3. On success, `onAuthStateChanged` fires in `AuthContext.jsx` (line 67)
4. The handler reads the user's Firestore `users/{uid}` document to determine role
5. Email-based role enforcement: `admin@citybus.in` → admin, `driverN@citybus.gov.in` → driver
6. `RoleRedirector` component in `App.jsx` (line 55) routes to correct portal based on role

**Role Enforcement** (`AuthContext.jsx` lines 74-95):

```javascript
const isAdminEmail = userEmail === 'admin@citybus.in';
const isDriverEmail = userEmail?.match(/^driver\d{1,2}@citybus\.gov\.in$/);
```

If the stored Firestore role doesn't match the email-derived role, the code automatically updates Firestore to correct the mismatch.

**Route Guards:**

Three route guard components enforce portal access:
- `PassengerRoute.jsx`: Allows only `role === 'user'`, redirects others to `/`
- `DriverRoute.jsx`: Allows only `role === 'driver'`, redirects to `/driver/login` if unauthenticated
- `AdminRoute.jsx`: Allows only `role === 'admin'`, redirects to `/` if not admin

**Standardized Credentials:**

| Role | Email Pattern | Password |
|------|--------------|----------|
| Admin | `admin@citybus.in` | `Admin@2024` (Firebase) / `admin123` (mock) |
| Driver | `driver{1-15}@citybus.gov.in` | `CityBus@2024` |
| Passenger | Any email | `user123` (mock mode) |

**Google SSO:**

The `signInWithGoogle` method in `AuthContext.jsx` (lines 248-342) uses `GoogleAuthProvider` + `signInWithPopup`. After authentication, it checks if a Firestore user document exists; if not, it creates one with default passenger role. Admin role is enforced if the Google email matches `admin@citybus.in`.

---

## 6. Passenger Portal

**Pages:**

| Route | Component | Description |
|-------|-----------|-------------|
| `/home` | `src/pages/user/Home.jsx` | Dashboard with nearby stops, active buses, quick actions |
| `/routes` | `src/pages/user/Routes.jsx` | Browse all routes with stops, distance, fare info |
| `/routes/:id` | `src/pages/user/RouteBuses.jsx` | View buses assigned to a specific route |
| `/tracking/:busId` | `src/pages/user/Tracking.jsx` | Live bus tracking map with ETA, timeline, issue reporting |
| `/alerts` | `src/pages/user/Alerts.jsx` | Service disruptions, delays, diversions |
| `/profile` | `src/pages/user/Profile.jsx` | User settings, saved/favorite routes, preferences |

**Live Tracking Page** (`Tracking.jsx`):

The most complex passenger page. It:

1. Reads the `busId` from URL params and subscribes to real-time bus data via `useRealTimeBus(busId)` hook
2. Determines the user's nearest bus stop using `getClosestStop()` from `geoUtils.js`
3. Calculates ETA using `useETA(busId, nearestStop.id)` which internally calls `calculateETA()` from `etaService.js`
4. Renders a Leaflet/Google Map with:
   - Blue polyline connecting all route stops
   - White circle markers for each stop (filled blue if passed)
   - Bus marker with heading rotation and stale-opacity
   - User location marker
5. Shows real-time bottom card with ETA, next stop, following stop, occupancy bar
6. Provides a full route timeline modal showing passed/current/upcoming stops
7. Offers a "Report Issue" modal that saves to `issueReports` collection

**Low Bandwidth Handling:**

The `useConnectionQuality` hook detects network type via `navigator.connection.effectiveType`. On 2G/slow connections or if Firebase response takes >5 seconds, the app switches to Leaflet tiles instead of Google Maps and reduces update frequency.

---

## 7. Driver Portal

**Pages:**

| Route | Component | Description |
|-------|-----------|-------------|
| `/driver/login` | `src/pages/driver/DriverLogin.jsx` | Email/password auth with driver role verification |
| `/driver/dashboard` | `src/pages/driver/DriverDashboard.jsx` | Trip management, GPS broadcasting, occupancy tracking |

**Driver Login** (`DriverLogin.jsx`):

After standard Firebase authentication, the component performs an additional role check by reading `users/{uid}` from Firestore (line 31). If the user document doesn't exist or role isn't `driver`, it redirects to the passenger login with an error toast.

**Trip State Machine** (`DriverDashboard.jsx`):

The driver dashboard implements a 5-state machine:

```
idle → starting → on-trip → ending → ended → idle
```

| State | UI Behavior |
|-------|-------------|
| `idle` | Shows assigned bus/route info, GPS lock status, "START ACTIVE JOURNEY" button. GPS accuracy must be ≤50m to proceed. Offers simulated GPS bypass for development. |
| `starting` | Confirmation dialog to select starting stop from route's stopIds, confirm trip start |
| `on-trip` | LIVE GPS broadcasting indicator with elapsed timer, speed/passenger gauges, location debug info, occupancy +/- buttons, mini route map, "END JOURNEY TRIP" button |
| `ending` | Terminal stop selection dropdown, confirm trip end |
| `ended` | Trip summary (duration, distance, max passengers, vehicle), "Start New Journey" button |

**GPS Broadcasting:**

When the trip starts (`handleStartTripConfirm`, line 207), the dashboard creates a `GPSService` instance and calls `startTrip()`. The GPSService:

1. Creates a trip log document in `tripLogs` collection
2. Updates the bus document in Firestore with `status: 'active'`, `isOnTrip: true`
3. Starts a 5-second interval timer (line 136 of `gpsService.js`) that writes the latest GPS position to Firestore
4. Each write includes: `currentLocation`, `speed`, `heading`, `accuracy`, `currentStopIndex`, `occupancy`, `lastUpdated`

**GPS Noise Filter** (`gpsService.js` line 154):

The `writeLocation` method filters out GPS noise by checking if the new position is at least 5 meters from the last written position using `haversineDistance`. This prevents unnecessary Firestore writes when the bus is stationary or GPS drift is detected.

**Occupancy Tracking:**

The driver can adjust passenger count using +/-5 buttons (capped at 52 max capacity). The occupancy value is written to Firestore on each adjustment via `gpsService.updateOccupancy()`.

**Simulated GPS:**

For development/testing environments without GPS access, the driver dashboard offers a "Simulate Location (Developer Bypass)" button (line 380) that creates a mock position at the route's first stop, bypassing the GPS accuracy requirement.

---

## 8. Admin Portal

**Pages:**

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/dashboard` | `src/pages/admin/Dashboard.jsx` | Fleet overview, live map, seeding controls, incident tickets |
| `/admin/buses` | `src/pages/admin/Buses.jsx` | CRUD for bus fleet, assign drivers/routes/vehicles |
| `/admin/routes` | `src/pages/admin/Routes.jsx` | CRUD for routes with stop sequence builder |
| `/admin/stops` | `src/pages/admin/Stops.jsx` | CRUD for bus stops with map coordinate picker |
| `/admin/drivers` | `src/pages/admin/Drivers.jsx` | Driver account management, vehicle assignments |
| `/admin/announcements` | `src/pages/admin/Announcements.jsx` | Create/edit/delete service alerts and disruptions |
| `/admin/users` | `src/pages/admin/Users.jsx` | View registered passengers, role management |

**Dashboard** (`src/pages/admin/Dashboard.jsx`):

The admin dashboard is a real-time monitoring hub featuring:

1. **Live Statistics Cards** with animated CountUp component: Active Buses, Active Routes, Drivers on Duty, Registered Passengers — each with pulse animation on value change
2. **Live Fleet Tracking Map**: Full-size Leaflet/Google Map showing all active bus positions with color-coded markers (green = active, gray = idle, red = maintenance), route polylines, and click-to-track popups
3. **Offline Fleet Sidebar**: List of buses currently not on trip with last-seen time
4. **System Setup & Seeding Panel**: Two buttons — "Seed Hyderabad Datasets" and "Provision Driver Accounts" — with a live log console showing seeding progress
5. **Recent Incident Tickets**: Table of passenger-reported issues with resolve action

**Seeding Functionality:**

The `seedDatabase()` function in `firebase.js` (line 57) writes all Hyderabad transit data to Firestore using batch writes for efficiency:
- `cities/hyderabad` — city configuration
- `stops/` — 48 bus stops with GPS coordinates
- `routes/` — 7 TSRTC routes with stop sequences
- `buses/` — 15 buses with TSRTC plate numbers
- `drivers/` — 15 drivers with license numbers and ratings
- `announcements/` — 5 sample service alerts

The `seedDriverAccounts()` function (line 110) creates Firebase Auth accounts for all 15 drivers using `createUserWithEmailAndPassword`, then links each to their Firestore driver document.

**Auto-Seed:**

In `BusContext.jsx` (lines 58-64), if the buses collection is empty on the first Firestore snapshot, the context automatically triggers `seedDatabase()` to populate the database.

---

## 9. Real-Time Data Flow

The core data pipeline follows this path:

```
Driver App (GPS Hardware)
    ↓ Browser Geolocation API (watchPosition)
GPSService.writeLocation() [every 5 seconds]
    ↓ Firestore updateDoc()
Firestore buses/{busId} document
    ↓ Firestore onSnapshot listener
BusContext (all buses) + useRealTimeBus (single bus)
    ↓ React state update
Passenger Tracking page → MapAdapter.updateMarker()
    ↓ Leaflet/Google Maps
Bus marker moves on passenger's map
```

**Firestore Real-Time Listeners:**

The `BusContext.jsx` sets up four parallel `onSnapshot` listeners (lines 51-98):

1. `onSnapshot(query(collection(db, 'buses'), limit(100)))` — all buses
2. `onSnapshot(query(collection(db, 'routes'), limit(50)))` — all routes
3. `onSnapshot(query(collection(db, 'stops'), limit(200)))` — all stops
4. `onSnapshot(query(collection(db, 'announcements'), limit(50)))` — all announcements

Each listener updates its respective React state, causing all consuming components to re-render with fresh data. The `limit()` calls prevent unbounded reads if collections grow large.

**Graceful Degradation:**

When Firestore becomes unavailable (detected via error codes `unavailable`, `permission-denied`, `not-found`, `failed-precondition`), the `isFirebaseOffline` flag is set to `true`. The app falls back to reading from localStorage, which was pre-populated with seed data on first load. A 1-second polling interval (`setInterval(syncLocalData, 1000)`) keeps localStorage state synchronized with React state in mock mode.

---

## 10. Hyderabad Transit Data

**Source:** TGSRTC (Telangana State Road Transport Corporation) open data, sourced from `github.com/iotakodali/hyd-bus-data` (CC BY-NC-SA 4.0).

**48 Real Hyderabad Bus Stops** (`hyderabadTransitData.js`):

Key stops with actual GPS coordinates include:
- Secunderabad Area: Rethifile Bus Station (17.43478, 78.50508), Chilkalguda, Gandhi Hospital, Musheerabad PS
- Central Hyderabad: Koti Bus Station (17.38471, 78.48426), Abids GPO, Nampally Public Garden, Assembly, Lakdikapool
- West Hyderabad: Banjara Hills Road No 12, MLA Colony, Apollo, Jubilee Hills Checkpost, Peddamma Temple
- IT Corridor: Madhapur PS, Hitech Shilparamam, Hitex Kaman, Kothaguda X Road, Kondapur
- North Hyderabad: Suchitra Circle, Loyola Academy, BHEL Quarters, Old Alwal, Alwal PS
- South: MGBS (Mahatma Gandhi Bus Station), Ramkoti, YMCA, Narayanaguda

**7 Real TSRTC Routes:**

| Route ID | Number | Name | Distance | Duration |
|----------|--------|------|----------|----------|
| R-1438 | 1C | MGBS to Lingampally via Jubilee Hills | 32.5 km | 85 min |
| R-1440 | 1C | Secunderabad to MGBS via Musheerabad | 8.2 km | 25 min |
| R-1005 | 1D | Chilkalguda to Dilsukhnagar | 12.5 km | 35 min |
| R-1080 | 1P/25S | Suchitra to Koti | 15.8 km | 45 min |
| R-722 | 1P/25I | Old Alwal to MGBS | 18.2 km | 50 min |
| R-723 | 1P/25I | MGBS to Old Alwal | 18.2 km | 50 min |
| R-231 | 2C | Barkas to Rethifile Bus Station | 10.5 km | 30 min |

**15 Buses** with real TSRTC plate formats:
- AP11Z#### format: buses 1-4 (AP registration)
- TS09UA#### format: buses 5-6 (Telangana registration)
- TS10UB#### through TS14UF#### format: buses 7-15

Bus types include: metro-express, city-bus, express, pushpak-ac

**15 Drivers** with names, phone numbers, TS license numbers (TS-XX-YYYY-ZZZ format), assigned buses, routes, ratings (4.2-4.9), and total trip counts.

---

## 11. Map Integration

**Default: Leaflet + OpenStreetMap**

The `initMap()` function in `mapsService.js` (line 281) initializes Leaflet maps by:
1. Dynamically loading Leaflet CSS and JS from unpkg CDN
2. Creating an `L.map` instance with the Hyderabad center (17.3850, 78.4867) as default
3. Adding OpenStreetMap tile layer: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
4. Wrapping everything in a `MapAdapter` instance

**Optional: Google Maps**

The `MapContext` (line 14) checks for `VITE_GOOGLE_MAPS_API_KEY`. If present, `loadGoogleMaps()` dynamically injects the Google Maps script tag with geometry and places libraries. A 3-second timeout (in Tracking.jsx line 182) falls back to Leaflet if Google Maps takes too long to load.

**MapAdapter Pattern** (`mapsService.js` line 43):

The `MapAdapter` class provides a unified API over both Google Maps and Leaflet:

| Method | Google Maps Implementation | Leaflet Implementation |
|--------|---------------------------|----------------------|
| `createMarker(id, position, options)` | `new google.maps.Marker()` | `L.circleMarker()` or `L.marker()` with `L.divIcon()` |
| `updateMarker(id, position, options)` | `marker.setPosition()` with optional animation | `marker.setLatLng()` with `requestAnimationFrame` interpolation |
| `removeMarker(id)` | `marker.setMap(null)` | `map.removeLayer(marker)` |
| `createPolyline(id, coords, options)` | `new google.maps.Polyline()` | `L.polyline()` |
| `removePolyline(id)` | `polyline.setMap(null)` | `map.removeLayer(polyline)` |
| `fitBounds(coords)` | `map.fitBounds(LatLngBounds)` | `map.fitBounds(L.polyline().getBounds())` |
| `panTo(lat, lng)` | `map.panTo({lat, lng})` | `map.panTo([lat, lng])` |

Both providers use the same `options` shape: `{ isStop, isPassed, popupContent, iconHtml, icon, animate, opacity }`.

---

## 12. GPS & Location Services

**useGeolocation Hook** (`src/hooks/useGeolocation.js`):

Uses the browser's `navigator.geolocation.watchPosition` API with these options:
```javascript
{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
```

Returns: `{ position, accuracy, speed, heading, error, isTracking, startTracking, stopTracking }`

**HTTPS Detection** (line 109):

```javascript
const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
```

If not on HTTPS or localhost, the hook immediately falls back to Hyderabad center coordinates (17.3850, 78.4867) with 100m accuracy, as browsers require secure contexts for Geolocation API.

**Error Handling:**

| Error Code | Behavior |
|-----------|----------|
| `PERMISSION_DENIED` | Falls back to Hyderabad center, sets error message |
| `POSITION_UNAVAILABLE` | Falls back to Hyderabad center, sets error message |
| `TIMEOUT` | Clears watch, retries after 3-second delay |

**GPS Noise Filter** (`gpsService.js` line 154):

```javascript
const dist = haversineDistance(lastPosition.lat, lastPosition.lng, position.lat, position.lng) * 1000;
if (dist < 5) return; // Skip write if moved less than 5 meters
```

This prevents excessive Firestore writes when the GPS signal drifts while the bus is stationary.

---

## 13. ETA Calculation

**Haversine Formula** (`src/utils/geoUtils.js` line 4):

Calculates great-circle distance between two GPS coordinates:

```javascript
const R = 6371; // Earth's radius in km
const dLat = ((lat2 - lat1) * Math.PI) / 180;
const dLng = ((lng2 - lng1) * Math.PI) / 180;
const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1*PI/180) * Math.cos(lat2*PI/180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
return R * c;
```

**ETA Calculation** (`src/services/etaService.js` line 12):

The `calculateETA(bus, targetStop, allStopsOnRoute, route)` function:

1. Determines the bus's current stop index and the target stop index
2. Calculates remaining distance by summing Haversine distances from the bus's real-time GPS position to each intermediate stop, then to the target stop
3. Uses the bus's real-time speed from GPS (fallback: 25 km/h average)
4. Calculates ETA: `Math.round((remainingDistance / speed) * 60)` minutes
5. Detects delays: if bus status is `maintenance` or `offline`, adds 12-minute delay

**useETA Hook** (`src/hooks/useETA.js`):

Combines `useRealTimeBus` (real-time bus stream) with `useBuses` (all routes/stops) to compute:
- `etaMinutes` — estimated arrival at nearest stop
- `nextStop` — the stop immediately after the bus's current position
- `followingStop` — two stops ahead
- `delayStatus` — "On Time" or "Delayed X min"

---

## 14. PWA & Offline Support

**Configuration** (`vite.config.js`):

Uses `vite-plugin-pwa` with:
- `registerType: 'autoUpdate'` — service worker updates automatically
- `manifest` — app name "CityBus — Real-Time Tracking", standalone display, portrait orientation, blue theme
- Icons: 192x192 and 512x512 PNG

**Workbox Runtime Caching:**

| URL Pattern | Strategy | Cache Name | Expiration |
|------------|----------|------------|------------|
| `firestore.googleapis.com` | NetworkFirst | `firestore-cache` | 7 days, 50 entries |
| `fonts.googleapis.com/gstatic.com` | CacheFirst | `google-fonts` | 30 days, 30 entries |
| `use.fontawesome.com` | CacheFirst | `font-awesome` | 30 days, 20 entries |
| `maps.googleapis.com` | NetworkFirst | `google-maps-js` | — |
| `*.tile.openstreetmap.org` | CacheFirst | `osm-tiles` | 30 days, 100 entries |

**Offline Fallback:**

When the app is completely offline, the service worker serves cached static assets (JS, CSS, HTML). The Firestore listeners will fail gracefully, and the `BusContext` will continue operating from localStorage data seeded on first load.

---

## 15. Build & Deployment

**Build Command:** `npm run build` → Vite production build

**Build Output:**
- ~1570 modules processed
- Output directory: `dist/` (or `y/` for Firebase Hosting)
- Approximate bundle size: ~1.78MB total

**Firebase Hosting Deployment:**

1. `firebase.json` configures hosting from the `y/` directory
2. SPA rewrite rule: `{"source": "**", "destination": "/index.html"}` — all routes handled by React Router
3. Deployment: `firebase deploy --only hosting`

**Environment Variables** (`.env`):

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID (transport-653af) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional Google Maps JavaScript API key |
| `VITE_TRANSIT_DATA_SOURCE` | Set to `tgsrtc-gtfs` to load real GTFS data |
| `VITE_TGSRTC_GTFS_BASE_URL` | Base URL for GTFS static data files |

---

## 16. Data Seeding

**Automatic Seeding:**

In `BusContext.jsx` (lines 58-64), on the first Firestore `onSnapshot` for buses, if the collection is empty:

```javascript
if (firstLoad && busList.length === 0) {
  console.log('Firestore buses empty, auto-seeding...');
  import('../services/firebase').then(({ seedDatabase }) => {
    seedDatabase().then(() => console.log('Auto-seed complete'));
  });
}
```

**Manual Seeding (Admin Dashboard):**

The admin dashboard has two seed buttons:
1. **"Seed Hyderabad Datasets"** — calls `seedDatabase()` which writes all transit data to Firestore (or localStorage in mock mode)
2. **"Provision Driver Accounts"** — calls `seedDriverAccounts()` which creates Firebase Auth accounts for all 15 drivers

**Seed Data Sources:**

All seed data is defined in `src/services/hyderabadTransitData.js` and re-exported through `src/services/seedData.js`. The `seedData.js` file also provides helper functions:
- `getStopsByRoute(routeId)` — returns stops for a route
- `getRoutesByStop(stopId)` — returns routes passing through a stop
- `getBusesByRoute(routeId)` — returns buses on a route
- `searchStops(query)` — search stops by name
- `getNearbyStops(lat, lng, radiusKm)` — find stops within radius

**GTFS Data Loading:**

The `loadTgsrtcGtfsData()` function in `realTransitData.js` can optionally load real GTFS (General Transit Feed Specification) data from TGSRTC. It fetches `routes.txt`, `stops.txt`, `trips.txt`, and `stop_times.txt` files, normalizes them into the app's data format, and calculates distances using Haversine.

---

## 17. Security

**Firebase Authentication:**

All protected routes require Firebase Authentication. The `onAuthStateChanged` listener in `AuthContext.jsx` maintains session state across page reloads.

**Firestore Security Rules:**

The `firestore.rules` file implements role-based access control:

- **Public reads** for stops, routes, cities (passengers need this without login)
- **Authenticated reads** for drivers, buses (real-time tracking requires auth)
- **Admin-only writes** for stops, routes, announcements (configuration management)
- **Driver-scoped writes** for buses (only update telemetry fields for assigned bus)
- **Owner-scoped access** for users (users can only read/write their own profile)
- **Admin-only reads** for trip logs and issue reports (audit trail)

**Client-Side Security:**

- Firebase API key is exposed in client code (this is normal for Firebase Web SDK — security is enforced by Firestore rules, not by hiding the key)
- No secrets stored in client-side code
- Role enforcement combines email-pattern matching with Firestore document verification

---

## 18. 50 Viva Questions & Answers

### Q1: What is CityBus and what problem does it solve?

**A:** CityBus is a real-time public transport tracking web application for Hyderabad city TSRTC buses. It solves the problem of commute uncertainty — passengers no longer need to guess when the next bus will arrive. The system provides live GPS tracking, accurate ETA calculations, route information, occupancy data, and service alerts. It has three portals: passengers track buses and view routes, drivers broadcast their GPS position and manage trips, and admins monitor the entire fleet and manage system data. The project uses real Hyderabad TSRTC bus stops and routes with actual GPS coordinates.

---

### Q2: What technologies did you use and why?

**A:** I used React 18 with Vite for the frontend because it offers fast development with hot module replacement and produces optimized production builds. Tailwind CSS was chosen for rapid UI development without writing custom CSS files. Firebase was selected as the backend because it provides real-time database synchronization through Firestore's `onSnapshot` listeners, built-in authentication, and free hosting — all critical for a real-time tracking application without needing to manage a custom server. Leaflet with OpenStreetMap provides free map tiles without requiring paid API keys, making the project accessible for demonstration.

---

### Q3: What is Firebase and why did you choose it?

**A:** Firebase is Google's Backend-as-a-Service (BaaS) platform providing authentication, real-time database (Firestore), cloud functions, and hosting. I chose it because CityBus requires real-time data synchronization — when a driver's GPS position updates, passengers must see it immediately without refreshing. Firestore's `onSnapshot` listener provides this push-based updates automatically. Firebase also eliminates the need for managing servers, databases, or deployment infrastructure, which is ideal for a student project. The free tier (Spark plan) covers 1GB storage and 50K reads/day, sufficient for demonstration.

---

### Q4: How does real-time tracking work?

**A:** Real-time tracking works through Firestore's `onSnapshot` listener. When the driver's app calls `GPSService.writeLocation()` every 5 seconds, it updates the bus document in Firestore with the new GPS coordinates. On the passenger side, the `BusContext.jsx` subscribes to all buses via `onSnapshot(query(collection(db, 'buses'), limit(100)))`. Firestore pushes updates to all connected clients whenever the document changes. The `useRealTimeBus` hook provides a per-bus stream for the tracking page. The `MapAdapter.updateMarker()` method then moves the bus marker on the Leaflet map with smooth animation using `requestAnimationFrame`.

---

### Q5: What is a PWA and how does your app work offline?

**A:** A Progressive Web App (PWA) is a web application that can be installed on a device, works offline, and behaves like a native app. CityBus uses `vite-plugin-pwa` with Workbox to generate a service worker. The service worker caches static assets (JS, CSS, HTML) using a cache-first strategy, and caches Firestore API responses with network-first strategy for 7 days. OpenStreetMap tiles are cached for 30 days. When offline, the app serves cached assets and falls back to localStorage data (seeded on first load) since Firestore becomes unavailable. The manifest at `public/manifest.json` enables "Add to Home Screen" installation.

---

### Q6: How do you calculate ETA?

**A:** ETA calculation uses the Haversine formula implemented in `src/utils/geoUtils.js`. The `calculateETA()` function in `src/services/etaService.js` takes the bus's real-time GPS position, the target stop's coordinates, and all stops on the route. It sums Haversine distances from the bus position through each intermediate stop to the target stop. The total remaining distance is divided by the bus's current GPS speed (fallback: 25 km/h average for city buses) and converted to minutes. The ETA updates in real-time as the bus moves because `useETA` hook recalculates on every bus position change. Safety factors include +2 minutes for traffic and +1 minute for boarding time at intermediate stops.

---

### Q7: What is Leaflet/OpenStreetMap? Why not Google Maps?

**A:** Leaflet is a lightweight, open-source JavaScript library for interactive maps. OpenStreetMap (OSM) is a free, community-driven map data source. Together they provide map functionality without any API key or usage costs. I used Leaflet/OSM as the default because Google Maps requires a paid API key with billing enabled, which adds friction for student projects. The app supports Google Maps as an optional provider — if `VITE_GOOGLE_MAPS_API_KEY` is configured in `.env`, the `MapContext` loads Google Maps dynamically; otherwise it falls back to Leaflet immediately. The `MapAdapter` class abstracts both providers behind the same API so the switching is transparent.

---

### Q8: How does the driver GPS broadcasting work?

**A:** The driver GPS broadcasting is handled by the `GPSService` class in `src/services/gpsService.js`. When a trip starts, `startTrip()` creates a trip log in Firestore, updates the bus document to `status: 'active'`, and starts a 5-second `setInterval` timer. The `useGeolocation` hook watches the driver's GPS position via `navigator.geolocation.watchPosition`. Each position update is passed to `GPSService.updateLivePositionReference()`. On each 5-second tick, `writeLocation()` writes the latest position to Firestore including `currentLocation`, `speed`, `heading`, `accuracy`, `currentStopIndex`, and `occupancy`. A 5-meter minimum movement threshold filters GPS noise to prevent unnecessary writes.

---

### Q9: What is the trip state machine in the driver app?

**A:** The trip state machine in `DriverDashboard.jsx` manages 5 states: `idle`, `starting`, `on-trip`, `ending`, and `ended`. In `idle` state, the driver sees their assigned bus and route with GPS lock status. Clicking "START ACTIVE JOURNEY" moves to `starting` where they confirm the starting stop. `on-trip` state broadcasts GPS every 5 seconds with live speed, passenger count, and a mini map. "END JOURNEY TRIP" moves to `ending` where they select the terminal stop. `ended` shows a trip summary with duration, distance, and max occupancy. The state machine ensures proper Firestore document lifecycle — bus status transitions from `idle` → `active` → `idle`, and trip logs are properly opened and closed.

---

### Q10: How do you handle low bandwidth?

**A:** The `useConnectionQuality` hook in `src/hooks/useConnectionQuality.js` uses the Network Information API (`navigator.connection`) to detect network type and speed. It checks `effectiveType` (2g, 3g, 4g) and `downlink` speed. If the connection is 2G/slow-2G, downlink < 0.5 Mbps, or if Firebase takes >5 seconds to respond, `isLowBandwidth` is set to true. When low bandwidth is detected, the Tracking page switches from Google Maps to Leaflet (lighter weight), reduces map update frequency, and the admin dashboard shows a "Low data mode" banner. The connection quality is also measured by timing a Firestore read of the `cities/hyderabad` document.

---

### Q11: What database does Firebase use?

**A:** Firebase uses Cloud Firestore, which is a NoSQL document database. Data is organized into collections (e.g., `buses`, `routes`, `stops`, `drivers`, `users`) containing documents. Each document has a unique ID and stores data as key-value pairs (fields). For example, a bus document contains fields like `id`, `number`, `routeId`, `driverId`, `capacity`, `occupancy`, `status`, `currentLocation` (a nested object with `lat` and `lng`), `speed`, `heading`, and `lastUpdated`. Firestore supports real-time synchronization through `onSnapshot` listeners that push updates to all connected clients when any document changes.

---

### Q12: What is the difference between Firestore and Realtime Database?

**A:** Firestore is Firebase's newer, more advanced database. Compared to Realtime Database (which stores data as one large JSON tree), Firestore uses a document-collection model with hierarchical data organization. Key differences relevant to CityBus: Firestore supports `onSnapshot` on queries with `where` and `limit` clauses (e.g., `query(collection(db, 'buses'), limit(100))`), while Realtime Database listeners are limited to specific paths. Firestore has better offline support, more granular security rules, and scales better. The Realtime Database charges for bandwidth, while Firestore charges per read/write operation. I chose Firestore because it supports the query patterns needed for filtering active buses and drivers.

---

### Q13: How do security rules work?

**A:** Firestore security rules (`firestore.rules`) define who can read/write each document. Rules use a condition-based system evaluated on the server. For example, `allow read: if true` on stops means anyone can read stops. The `isAdmin()` helper function checks if the authenticated user has an admin role by reading their user document: `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`. The buses collection has a special rule allowing drivers to update only telemetry fields (`currentLocation`, `speed`, `heading`, etc.) for their assigned bus, preventing drivers from modifying other buses' data. Rules cascade — if any condition in the chain fails, access is denied.

---

### Q14: How do you handle authentication across 3 portals?

**A:** Each portal has its own route guard component: `PassengerRoute.jsx`, `DriverRoute.jsx`, and `AdminRoute.jsx`. These components read `currentUser`, `role`, and `isLoading` from `AuthContext`. If unauthenticated, they redirect to the appropriate login page. If authenticated but wrong role, they redirect to `/` where the `RoleRedirector` component routes to the correct portal. The `DriverLogin.jsx` performs an additional Firestore role check after Firebase Auth to ensure only users with `role: 'driver'` can access the driver dashboard. The `AuthContext` enforces email-pattern-based role assignment: `admin@citybus.in` → admin, `driverN@citybus.gov.in` → driver.

---

### Q15: What role-based access control do you implement?

**A:** Three roles: `admin`, `driver`, `user` (passenger). Admin has full CRUD access to all collections and can seed data, create driver accounts, and resolve incident tickets. Drivers can only update telemetry fields on their assigned bus document (enforced by Firestore security rules). Passengers can read all public data (stops, routes, active buses, announcements) and create issue reports. The role is determined by: (1) email pattern matching during login, (2) Firestore user document role field, (3) Firestore security rules enforcing field-level write permissions. The admin portal is protected by `AdminRoute.jsx` which checks `role !== 'admin'` and redirects.

---

### Q16: How does the admin seed data functionality work?

**A:** The admin dashboard in `Dashboard.jsx` has two buttons: "Seed Hyderabad Datasets" and "Provision Driver Accounts". The first calls `seedDatabase()` from `firebase.js` which uses Firestore batch writes to create documents for cities, stops, routes, buses, drivers, and announcements. Batch writes are used because Firestore limits individual write operations to 500 documents per batch. The second button calls `seedDriverAccounts()` which iterates through 15 drivers, creates Firebase Auth accounts via `createUserWithEmailAndPassword`, then creates Firestore user documents with role `driver`. In mock mode, both functions write to localStorage instead of Firestore. The seeding logs are displayed in a console textarea in real-time.

---

### Q17: What is the data flow from driver to passenger?

**A:** The complete flow: (1) Driver's phone GPS provides position via `navigator.geolocation.watchPosition`. (2) `useGeolocation` hook processes the raw coordinates. (3) `GPSService.writeLocation()` runs every 5 seconds, filters GPS noise (5m threshold), and calls `updateDoc(doc(db, 'buses', busId), busUpdate)`. (4) Firestore pushes the update to all connected clients. (5) `BusContext`'s `onSnapshot` listener receives the updated bus list. (6) `useRealTimeBus` hook provides the specific bus data to the Tracking page. (7) `useETA` hook recalculates ETA based on new position. (8) `MapAdapter.updateMarker()` moves the bus marker on the Leaflet map. The entire pipeline typically completes in under 1 second on good connections.

---

### Q18: How does the geolocation service handle errors?

**A:** The `useGeolocation` hook handles three Geolocation API error codes: `PERMISSION_DENIED` (user blocked location access), `POSITION_UNAVAILABLE` (GPS hardware unavailable), and `TIMEOUT` (request took too long). For permission denied and position unavailable, the hook falls back to Hyderabad center coordinates (17.3850, 78.4867) with 100m accuracy, allowing the app to function without GPS. For timeout, it automatically clears the watch and retries after 3 seconds. The hook also checks for HTTPS requirement — browsers require secure contexts for Geolocation API, so on HTTP the hook immediately falls back to default coordinates. The DriverDashboard additionally checks `navigator.permissions.query({name: 'geolocation'})` to show a clear "Location Access Required" screen if permission is denied.

---

### Q19: What is the Haversine formula?

**A:** The Haversine formula calculates the great-circle distance between two points on a sphere given their latitude and longitude. It's used in `src/utils/geoUtils.js` to calculate distances between GPS coordinates. The formula accounts for Earth's curvature: `a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)`, then `c = 2 · atan2(√a, √(1-a))`, and `distance = R · c` where R = 6371 km (Earth's radius). It's used for: (1) ETA calculation — summing distances along route segments, (2) nearest stop detection — finding the closest bus stop to user location, (3) GPS noise filtering — ignoring position changes under 5 meters, and (4) trip distance tracking — accumulating distance covered during a driver's trip.

---

### Q20: How do you handle GPS noise/accuracy issues?

**A:** GPS noise is handled at multiple levels: (1) **5-meter threshold filter** in `GPSService.writeLocation()` — position changes under 5 meters are ignored using `haversineDistance`. (2) **Accuracy display** in DriverDashboard — GPS accuracy is categorized as Excellent (<10m), Good (≤25m), Fair (≤50m), or Poor (>50m) with color-coded badges. (3) **Trip start requirement** — the driver cannot start a trip unless GPS accuracy is ≤50m. (4) **Staleness detection** in `useRealTimeBus` — if the last bus update is >60 seconds old, the `stale` flag is set and the passenger sees a "GPS signal lost" banner with the bus marker shown at 50% opacity. (5) **Simulated GPS bypass** for development environments without GPS hardware.

---

### Q21: What is the bus simulator and why is it needed?

**A:** The bus simulator in `src/simulation/busSimulator.js` generates client-side mock bus positions along predefined routes without requiring real GPS hardware or Firebase. It uses `interpolatePosition()` to smoothly move buses between stops, with randomized speed variations (0.03-0.05 progress per tick). The simulator implements boarding delays at stops (6-tick timer), direction reversal at terminal stops, and random passenger count updates. It's needed for development and demonstration because: (1) testing real GPS requires physical bus movement, (2) the driver portal requires GPS permission which may not work on HTTP localhost, (3) it allows testing multiple buses simultaneously. The simulator updates every 1 second and provides an `onUpdate` callback to feed data into React state.

---

### Q22: How does the map adapter pattern work?

**A:** The `MapAdapter` class in `src/services/mapsService.js` provides a provider-agnostic API over Google Maps and Leaflet. It wraps the underlying map instance and maintains internal dictionaries of markers and polylines. Methods like `createMarker()`, `updateMarker()`, `removeMarker()`, `createPolyline()`, and `fitBounds()` check `this.provider` to call the appropriate provider-specific API. For example, `createMarker` with Leaflet uses `L.circleMarker()` or `L.marker()` with `L.divIcon()`, while Google Maps uses `new google.maps.Marker()`. This pattern allows the Tracking page and Admin Dashboard to use the same map code regardless of which provider is active, and enables seamless provider switching if Google Maps fails to load.

---

### Q23: What caching strategies do you use for offline support?

**A:** The Workbox configuration in `vite.config.js` defines five caching strategies: (1) **Firestore API** — NetworkFirst with 7-day expiration, tries network first then falls back to cache (ensures fresh data when available). (2) **Google Fonts** — CacheFirst with 30-day expiration (fonts don't change). (3) **Font Awesome** — CacheFirst with 30-day expiration. (4) **Google Maps JS** — NetworkFirst (ensures latest version). (5) **OpenStreetMap tiles** — CacheFirst with 30-day expiration, 100 entries max (tiles are immutable). Static assets (JS, CSS, HTML, images) use the default `globPatterns: '**/*.{js,css,html,png,svg,json}'` which pre-caches during service worker installation. The app also uses localStorage as a data cache for Firestore collections.

---

### Q24: How does Firebase Hosting deployment work?

**A:** Firebase Hosting is configured in `firebase.json` to serve from the `y/` directory (the build output). The SPA rewrite rule `{"source": "**", "destination": "/index.html"}` ensures all routes are handled by React Router on the client side. Deployment involves: (1) `npm run build` to create the production build in `dist/`, (2) copying build output to the `y/` directory, (3) `firebase deploy --only hosting` to upload to Firebase's CDN. Firebase Hosting provides automatic SSL, global CDN distribution, and instant rollbacks. The `.firebaserc` file stores the project alias for deployment authentication.

---

### Q25: What is the connection quality hook and how does it affect the app?

**A:** The `useConnectionQuality` hook in `src/hooks/useConnectionQuality.js` monitors network conditions using the Network Information API (`navigator.connection`). It reads `effectiveType` (slow-2g, 2g, 3g, 4g) and `downlink` (Mbps). It also performs a manual latency test by timing a Firestore document read of `cities/hyderabad`. The hook returns `quality` ('good', 'moderate', 'poor'), `isLowBandwidth` boolean, `effectiveType`, and `downlink`. When `isLowBandwidth` is true, the Tracking page switches to Leaflet (lighter than Google Maps), shows a "Low data mode" banner, and may reduce map update frequency. The admin Dashboard also uses it to decide whether to attempt Google Maps loading.

---

### Q26: How do you prevent driver location spoofing?

**A:** Location spoofing prevention is implemented at the Firestore security rules level. The `firestore.rules` file (lines 51-59) allows bus document updates only if: (1) the user is authenticated, (2) they have a driver record in the `drivers` collection, (3) the driver's `assignedBusId` matches the bus document being updated, and (4) the update only affects allowed telemetry fields: `currentLocation`, `speed`, `heading`, `lastUpdated`, `occupancy`, `currentStopIndex`, `status`, `isOnTrip`. This prevents a driver from modifying another driver's bus or changing fleet-wide data. Additionally, the 5-meter GPS noise filter prevents excessive position jumps that could indicate spoofing.

---

### Q27: What testing approaches did you consider?

**A:** For this academic project, testing approaches include: (1) **Manual testing** across three portals — logging in as admin (`admin@citybus.in`), driver (`driver1@citybus.gov.in`), and passenger to verify role-based access. (2) **Mock mode testing** — the `isFirebaseEnabled = false` mode uses localStorage, allowing full testing without internet connectivity. (3) **GPS simulation** — the DriverDashboard's "Simulate Location (Developer Bypass)" button creates mock GPS positions for testing trip state transitions. (4) **Bus simulator** — `busSimulator.js` generates automated bus movements for testing map rendering with multiple vehicles. (5) **Seed data verification** — the admin dashboard's seeding console logs success/failure for each data type. The project uses `npm run lint` (ESLint) for code quality checks.

---

### Q28: How does the stop sequence builder work in admin?

**A:** The admin Routes page (`src/pages/admin/Routes.jsx`) includes a stop sequence builder that allows administrators to define the order of stops for each route. When creating or editing a route, the admin provides a `stopIds` array — an ordered list of stop IDs that define the route's path. The admin can select stops from the existing stops collection. The `seedData.js` helper `getStopsByRoute(routeId)` resolves these IDs to full stop objects with GPS coordinates for map rendering. The route also stores `fromStopId`, `toStopId`, `totalDistance` (calculated via Haversine between consecutive stops), and `estimatedDuration`. The stop sequence determines the order in which polylines are drawn on the map and the sequence shown in the passenger's route timeline modal.

---

### Q29: What is onSnapshot vs getDocs?

**A:** `onSnapshot` is Firestore's real-time listener — it establishes a persistent connection and receives updates whenever documents in the query change. In BusContext, `onSnapshot(query(collection(db, 'buses'), limit(100)))` keeps the bus list synchronized automatically. The listener returns an unsubscribe function for cleanup. `getDocs` is a one-time read — it fetches documents once and returns. `getDocs` is used in the ETA hook (`useETA.js` line 41) to fetch a specific route document when needed, caching the result in local state. The key difference: `onSnapshot` is for data that changes in real-time (bus positions), while `getDocs` is for relatively static data (route definitions) that doesn't need continuous updates.

---

### Q30: How does the secondary Firebase app work for driver account creation?

**A:** The `seedDriverAccounts` function in `firebase.js` uses the primary Firebase app instance with `createUserWithEmailAndPassword(auth, email, password)` to create driver accounts. The function iterates through 15 drivers (driver1@citybus.gov.in to driver15@citybus.gov.in), each with password `CityBus@2024`. After creating the Firebase Auth account, it writes a user document to `users/{uid}` with role `driver` and a driver record to `drivers/{driver.uid}`. If an account already exists (`auth/email-already-in-use`), it gracefully logs "Already Exists" instead of failing. The admin can trigger this from the dashboard "Provision Driver Accounts" button without being logged out, since `createUserWithEmailAndPassword` doesn't automatically sign in the new user.

---

### Q31: What is the difference between React Context and Redux?

**A:** React Context is a built-in React API for passing data through the component tree without prop drilling. Redux is a third-party state management library with a centralized store, actions, and reducers. I chose Context for CityBus because: (1) The state requirements are moderate — three contexts (Auth, Bus, Map) handle all global state. (2) Context integrates naturally with React hooks (`useContext`). (3) No complex state logic (like middleware or derived state) is needed. (4) It reduces bundle size (Redux adds ~11KB minified). For CityBus, the contexts work well: `AuthContext` manages login state, `BusContext` syncs Firestore data, and `MapContext` detects the map provider. If the project grew to need undo/redo, complex caching, or state machine logic, Redux would be a better choice.

---

### Q32: How does React Router handle authentication guards?

**A:** React Router v6 uses nested route elements for authentication guards. In `App.jsx`, the route structure wraps protected portals with guard components:

```jsx
<Route element={<PassengerRoute><UserLayout /></PassengerRoute>}>
  <Route path="/home" element={<Home />} />
  ...
</Route>
```

Each guard component (`PassengerRoute`, `DriverRoute`, `AdminRoute`) checks `useAuth()` for `currentUser`, `role`, and `isLoading`. If unauthenticated, it renders `<Navigate to="/login" replace />`. If authenticated but wrong role, it redirects to `/`. The `replace` prop prevents back-button navigation to protected pages. The `RoleRedirector` at `/` reads the user's role and redirects to the appropriate portal, serving as a central routing hub.

---

### Q33: What is the seed data format for Hyderabad transit?

**A:** Seed data follows a consistent format defined in `src/services/hyderabadTransitData.js`. Bus stops have: `id`, `name`, `address`, `location: {lat, lng}`, `routeIds: []`, `nearbyLandmarks`, `isActive`. Routes have: `id`, `number`, `name`, `fromStopId`, `toStopId`, `fromStopName`, `toStopName`, `stopIds: []` (ordered), `totalDistance`, `estimatedDuration`, `firstBus`, `lastBus`, `frequency`, `isActive`. Buses have: `id`, `number` (TSRTC plate format), `routeId`, `driverId`, `capacity`, `occupancy`, `status`, `currentLocation`, `type` (metro-express, city-bus, etc.), `isAC`. Drivers have: `id`, `uid`, `name`, `phone`, `licenseNumber`, `assignedBusId`, `assignedRouteId`, `status`, `rating`, `totalTrips`. The `stopRouteMapping` object provides reverse lookup from stop ID to route IDs.

---

### Q34: How does the occupancy tracking work?

**A:** Occupancy tracking is a two-part system. On the driver side, `DriverDashboard.jsx` provides +/-5 adjustment buttons (line 497-514) that update the `occupancy` state. The driver adjusts count as passengers board/alight. Each adjustment calls `gpsService.updateOccupancy(nextOcc)` which writes to Firestore: `updateDoc(doc(db, 'buses', busId), { occupancy })`. On the passenger side, the Tracking page reads `bus.occupancy` and `bus.capacity` (default 52) to display an occupancy bar. The bar is color-coded: green (<30%), amber (30-70%), red (>70%). The occupancy value is also included in the 5-second GPS position writes, ensuring passengers see real-time crowding levels. Maximum capacity is enforced at 52 seats in the driver controls.

---

### Q35: What is the service worker lifecycle?

**A:** The service worker lifecycle has three phases: (1) **Registration** — when the app loads, `registerServiceWorker` from `vite-plugin-pwa` registers the service worker script. (2) **Installation** — the service worker pre-caches static assets matching `globPatterns: '**/*.{js,css,html,png,svg,json}'`. (3) **Activation** — with `registerType: 'autoUpdate'`, the new service worker takes control immediately. During runtime, the service worker intercepts fetch requests and applies Workbox strategies (CacheFirst for tiles, NetworkFirst for Firestore). The `offline.html` fallback page is served when both network and cache are unavailable. The service worker updates automatically when a new version is deployed, without requiring user interaction.

---

### Q36: How do you handle concurrent Firestore writes?

**A:** Concurrent Firestore writes are handled through Firestore's built-in optimistic concurrency control. Each document has a version stamp — if two clients write to the same document simultaneously, the second write fails with a conflict. In CityBus, this is unlikely because: (1) Each driver writes only to their assigned bus document (enforced by security rules). (2) The 5-second GPS write interval means writes are well-spaced. (3) Admin writes (CRUD operations) are infrequent. For batch operations during data seeding, `writeBatch` is used (`firebase.js` lines 72-100) which atomically commits all writes — either all succeed or all fail. The app wraps writes in try-catch blocks and shows error toasts on failure.

---

### Q37: What is the battery impact of GPS tracking?

**A:** GPS tracking impacts battery through `navigator.geolocation.watchPosition` which continuously accesses the GPS hardware. The impact depends on: (1) **Update frequency** — CityBus writes every 5 seconds but `watchPosition` fires more frequently, providing smooth position updates. (2) **Accuracy settings** — `enableHighAccuracy: true` uses more battery but provides better precision. (3) **Screen state** — GPS continues in background if the browser allows it. To mitigate battery drain: the GPS watch is cleaned up when the component unmounts (`useEffect` cleanup), the driver can stop tracking via `stopTracking()`, and the 5-meter noise filter prevents unnecessary Firestore writes. In production, using the Background Geolocation API with wake locks would be more efficient.

---

### Q38: How does the app scale for multiple cities?

**A:** The current architecture is Hyderabad-specific but can be extended. The `hyderabadTransitData.js` file is a self-contained data module — creating a new city module (e.g., `bangaloreTransitData.js`) with similar structure would work. The `BusContext` initializes with seed data and syncs with Firestore collections that are already generic (not Hyderabad-specific). To support multiple cities: (1) Add a `cityId` field to all Firestore documents. (2) Modify security rules to scope queries by city. (3) Add a city selector in the app. (4) The `cities/hyderabad` document structure (`hyderabadCity` in the seed data) already provides a template for city configuration. The GTFS parser in `realTransitData.js` can load any city's GTFS data by changing the base URL environment variable.

---

### Q39: What is the cost model for Firebase?

**A:** Firebase Spark (free) plan includes: 1 GB Firestore storage, 50K document reads/day, 20K document writes/day, 20K document deletes/day, 10 GB Hosting storage, 360 MB/day Hosting transfer, 10K Auth phone verifications/month, unlimited Auth email/password. For CityBus, the main costs are Firestore reads — each `onSnapshot` listener counts as reads when data changes. With 15 buses writing every 5 seconds, that's ~3 writes/minute/bus = ~45 writes/minute = ~64,800 writes/day (within the 20K limit would require throttling). The free tier is sufficient for demonstration. For production, the Blaze (pay-as-you-go) plan charges $0.06/100K reads, $0.18/100K writes. The app's `limit()` clauses on queries (e.g., `limit(100)` on buses) help control read costs.

---

### Q40: How does the app handle network disconnection gracefully?

**A:** Network disconnection is handled at multiple levels: (1) **Firestore listeners** — `onSnapshot` continues running and caches pending updates; when reconnected, it syncs automatically. (2) **Error handling** — Firestore errors like `unavailable` or `failed-precondition` set `isFirebaseOffline = true` in BusContext. (3) **localStorage fallback** — the app reads pre-seeded data from localStorage, allowing passengers to browse stops and routes offline. (4) **Service Worker** — caches static assets and recent API responses for offline page loads. (5) **GPS continues** — the `useGeolocation` hook works independently of network status; position updates queue until connectivity restores. (6) **Visual indicators** — the DriverDashboard shows "GPS Protocol Alert" for HTTP, and the Tracking page shows "Bus Not Started Yet" when no live data is available.

---

### Q41: What map tiles does Leaflet use?

**A:** Leaflet uses OpenStreetMap (OSM) tiles loaded from `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. The `{s}` parameter distributes across multiple subdomains (a, b, c) for parallel loading. The `{z}/{x}/{y}` pattern follows the standard slippy map tile scheme — zoom level, column, and row. The tiles are rendered by the `L.tileLayer()` call in `mapsService.js` (line 304). The Workbox configuration caches these tiles for 30 days with CacheFirst strategy (100 entries max), since map tiles for a given area don't change frequently. This means once a user views Hyderabad on the map, subsequent visits load tiles from local cache instantly, even offline.

---

### Q42: How do you manage state across 3 portals?

**A:** State management is distributed across three React Context providers, each wrapping the entire app in `App.jsx`: (1) `AuthProvider` — wraps `BusProvider` and `MapProvider`, provides `currentUser`, `role`, `login`, `logout`, `updateProfile`. (2) `BusProvider` — provides `buses`, `routes`, `stops`, `alerts` arrays and CRUD methods (`addBus`, `updateBus`, `deleteBus`, etc.). (3) `MapProvider` — provides `provider` ('google' | 'leaflet') and `isLoaded`. Each portal accesses only the contexts it needs: the driver portal uses Auth + Bus, the passenger portal uses Auth + Bus + Map, the admin portal uses Auth + Bus + Map. Local component state (trip state, modal visibility, form inputs) stays in component-level `useState` hooks.

---

### Q43: What is the announcement/disruption system?

**A:** The announcement system allows admins to create service alerts stored in the `announcements` Firestore collection. Each announcement has: `id`, `title`, `message`, `type` (delay, info, route, maintenance), `affectedRouteId`, `affectedBusNumber`, `priority` (low, medium, high), `isActive`, `createdBy`, `createdAt`. The admin creates announcements via `AdminAnnouncements.jsx` which calls `BusContext.addAlert()`. Passengers see announcements on the `Alerts.jsx` page, filtered by `isActive`. The seed data includes 5 sample announcements: a delay alert for Route 1C, new AC bus info for Route 1D, road diversion at Secunderabad, maintenance notice for bus AP11Z6881, and monsoon scheduling updates. Firestore rules allow public read only for active announcements.

---

### Q44: How does the user profile and saved stops work?

**A:** The user profile is stored in the `users/{uid}` Firestore document with fields: `id`, `name`, `email`, `phone`, `role`, `favoriteRouteIds: []`, `createdAt`, `isActive`. The `Profile.jsx` page displays user info and allows updating favorite routes. The `updateProfile(fields)` method in `AuthContext` calls `updateDoc(doc(db, 'users', uid), fields)`. Passengers can bookmark routes from the Tracking page by clicking the star icon, which adds the route ID to `favoriteRouteIds`. In mock mode, profile updates are persisted to localStorage. The `userProfile` state is shared across all passenger components via `useAuth()`. Favorite routes could be used to show quick-access cards on the Home dashboard.

---

### Q45: What is the driver performance tracking?

**A:** Driver performance is tracked through the `drivers/{driverId}` Firestore document which includes: `rating` (4.2-4.9 scale), `totalTrips` (incremented on trip completion), `status` (on-duty/off-duty), `isOnTrip` boolean, and `assignedRouteId`. When a trip ends, `GPSService.endTrip()` increments `totalTrips` using Firestore's `increment(1)` operator and sets status to `off-duty`. The admin Dashboard shows real-time driver count via `onSnapshot(query(collection(db, 'drivers'), where('status', '==', 'on-duty')))`. The driver seed data includes join dates and cumulative trip counts (ranging from 80 to 1,540 trips). Individual driver performance metrics (on-time percentage, average delay) could be derived from the `tripLogs` collection.

---

### Q46: How does the bus stop coordinate picker work?

**A:** The admin Stops page (`src/pages/admin/Stops.jsx`) includes a coordinate picker for setting bus stop GPS coordinates. When creating or editing a stop, the admin can manually enter latitude and longitude values or use the map interface. The map is initialized using `initMap()` from `mapsService.js` with Leaflet or Google Maps. The admin clicks on the map to set coordinates, which are captured as `lat` and `lng` values and stored in the stop document as `location: {lat, lng}`. The `hyderabadTransitData.js` seed data includes pre-populated coordinates for all 48 stops sourced from real TSRTC data. The `getClosestStop()` utility in `geoUtils.js` uses these coordinates for nearest-stop calculations.

---

### Q47: What is the route distance calculation?

**A:** Route distance is calculated using the Haversine formula applied to consecutive stops along a route. The `estimateDistance()` function in `realTransitData.js` (line 112) iterates through a route's `stopIds` array, looking up each stop's GPS coordinates, and summing the Haversine distances between adjacent stops. For seed data, distances are pre-computed: Route 1C is 32.5 km, Route 1D is 12.5 km, etc. The `totalDistance` field is stored in the route document. For GTFS data, the `normalizeGtfs()` function (line 139) automatically calculates distances from the imported stop sequences. The estimated duration is derived from distance: `Math.max(10, Math.round((totalDistance / 18) * 60))` minutes, assuming 18 km/h average speed.

---

### Q48: How do you deploy to Firebase Hosting?

**A:** Deployment process: (1) Build the production bundle: `npm run build` which creates optimized static files in the `dist/` directory. (2) Configure `firebase.json` with `"public": "y"` pointing to the output directory. (3) The SPA rewrite rule `{"source": "**", "destination": "/index.html"}` ensures React Router handles all client-side routes. (4) Run `firebase deploy --only hosting` to upload files to Firebase's CDN. Firebase Hosting provides: automatic SSL certificates, global CDN distribution (files served from nearest edge location), instant rollbacks via version history, and custom domain support. The `.firebaserc` file contains the project alias (`transport-653af`) for authentication. The `public` directory contains static assets like `manifest.json`, `favicon.ico`, and PWA icons.

---

### Q49: What improvements would you make in a production version?

**A:** Several improvements for production: (1) **TypeScript migration** — add type safety for bus, route, driver, and user models to catch errors at compile time. (2) **Testing** — add unit tests with Jest/Vitest for utility functions (Haversine, ETA), integration tests for Firestore operations, and E2E tests with Playwright. (3) **Background Geolocation** — use a library like `capacitor-background-geolocation` for efficient GPS tracking when the driver app is backgrounded. (4) **Push Notifications** — integrate Firebase Cloud Messaging to notify passengers when their bus is approaching. (5) **Multi-city support** — add city selection and scope all queries by `cityId`. (6) **Performance monitoring** — add Firebase Performance Monitoring to track load times and API latency. (7) **Offline-first architecture** — implement IndexedDB for larger local data cache. (8) **Driver authentication** — replace standardized passwords with individual password reset flows.

---

### Q50: What did you learn building this project?

**A:** Building CityBus taught me full-stack web development with real-world complexity. Key learnings: (1) **Real-time data architecture** — understanding Firestore's `onSnapshot` push model vs traditional REST polling, and designing the data flow from GPS hardware to passenger map. (2) **Map integration** — the Adapter pattern for abstracting multiple map providers, and handling the complexity of coordinate systems, polylines, and marker animations. (3) **Authentication & authorization** — implementing role-based access across three portals with both client-side route guards and server-side Firestore security rules. (4) **PWA & offline support** — service worker lifecycle, Workbox caching strategies, and graceful degradation when Firebase is unavailable. (5) **GPS & geolocation** — handling browser permissions, HTTPS requirements, accuracy issues, and noise filtering. (6) **State management** — distributing state across React Context providers and managing real-time subscriptions. (7) **Data modeling** — structuring Firestore collections for efficient queries and security rule enforcement. The most challenging aspect was ensuring the real-time pipeline worked reliably across different network conditions.

---

*Document prepared for CityBus — Real-Time Public Transport Tracking System (Hyderabad)*
*React + Firebase Full-Stack Project*
