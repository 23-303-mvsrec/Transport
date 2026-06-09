import { 
  doc, 
  updateDoc, 
  setDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDoc,
  increment
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase';
import { haversineDistance } from '../utils/geoUtils';

export class GPSService {
  constructor(busId, driverId) {
    this.busId = busId;
    this.driverId = driverId;
    this.writeInterval = null;
    this.lastPosition = null;
    this.tripLogId = null;
    this.currentOccupancy = 12; // Default passenger start count
    this.routeStops = [];
    this.route = null;
    this.driverRecord = null;
    
    // Load local driver name if possible
    this.driverName = 'Active Operator';
    this.busNumber = 'PB-11-K-1001';
  }

  async startTrip(routeId, startStopId, stopsList, routeObj, driverProfile) {
    this.routeStops = stopsList || [];
    this.route = routeObj;
    this.driverRecord = driverProfile;
    
    if (driverProfile) {
      this.driverName = driverProfile.name;
    }

    const startStopObj = this.routeStops.find(s => s.id === startStopId);
    const startStopName = startStopObj ? startStopObj.name : 'Origin Terminus';

    const tripLogData = {
      busId: this.busId,
      driverId: this.driverId,
      driverName: this.driverName,
      routeId: routeId,
      routeName: routeObj ? routeObj.name : 'Transit Line',
      startTime: isFirebaseEnabled ? serverTimestamp() : new Date().toISOString(),
      endTime: null,
      startStopName: startStopName,
      endStopName: null,
      distanceCovered: 0,
      maxOccupancy: this.currentOccupancy,
      delayMinutes: 0,
      date: new Date().toISOString().slice(0, 10)
    };

    if (isFirebaseEnabled) {
      try {
        // Create trip log doc
        const logRef = await addDoc(collection(db, 'tripLogs'), tripLogData);
        this.tripLogId = logRef.id;

        // Update bus doc
        await updateDoc(doc(db, 'buses', this.busId), {
          status: 'active',
          isOnTrip: true,
          driverId: this.driverId,
          driverName: this.driverName,
          routeName: routeObj ? routeObj.name : 'Transit Line',
          routeId: routeId,
          lastUpdated: serverTimestamp()
        });

        // Update driver doc
        await updateDoc(doc(db, 'drivers', this.driverId), {
          status: 'on-duty',
          isOnTrip: true,
          assignedRouteId: routeId
        });
      } catch (err) {
        console.error('Error starting live trip on Firestore:', err);
      }
    } else {
      // Mock Local Storage setup
      this.tripLogId = `triplog-${Date.now()}`;
      
      const logs = JSON.parse(localStorage.getItem('citybus_mock_triplogs') || '[]');
      logs.push({ id: this.tripLogId, ...tripLogData });
      localStorage.setItem('citybus_mock_triplogs', JSON.stringify(logs));

      // Update Local Bus
      const busesStr = localStorage.getItem('citybus_mock_buses');
      if (busesStr) {
        const mockBuses = JSON.parse(busesStr);
        const updated = mockBuses.map(b => {
          if (b.id === this.busId) {
            this.busNumber = b.number;
            return {
              ...b,
              status: 'active',
              isOnTrip: true,
              driverId: this.driverId,
              driverName: this.driverName,
              routeId: routeId,
              routeName: routeObj ? routeObj.name : b.routeName,
              lastUpdated: new Date().toISOString()
            };
          }
          return b;
        });
        localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
      }

      // Update Local Driver
      const driversStr = localStorage.getItem('citybus_mock_drivers');
      if (driversStr) {
        const mockDrivers = JSON.parse(driversStr);
        const updated = mockDrivers.map(d => {
          if (d.uid === this.driverId || d.id === this.driverId) {
            return {
              ...d,
              status: 'on-duty',
              isOnTrip: true,
              assignedRouteId: routeId
            };
          }
          return d;
        });
        localStorage.setItem('citybus_mock_drivers', JSON.stringify(updated));
      }
    }

    // Set write interval every 5 seconds
    this.writeInterval = setInterval(() => {
      if (this.lastTriggeredPosition) {
        this.writeLocation(this.lastTriggeredPosition);
      }
    }, 5000);

    console.log(`Trip ${this.tripLogId} started for Bus ${this.busId}.`);
  }

  updateLivePositionReference(position) {
    // Keep reference of active geolocation stream to log periodically
    this.lastTriggeredPosition = position;
  }

  async writeLocation(position) {
    if (!position || !position.lat || !position.lng) return;

    // Filter minor noise (if moved distance is under 5 meters)
    if (this.lastPosition) {
      const dist = haversineDistance(
        this.lastPosition.lat,
        this.lastPosition.lng,
        position.lat,
        position.lng
      ) * 1000; // convert km to meters
      
      if (dist < 5) {
        return; // Skip write
      }
    }

    // Calculate currentStopIndex: smallest distance that matches bus sequence
    let currentStopIndex = 0;
    if (this.routeStops.length > 0) {
      let minDistance = Infinity;
      this.routeStops.forEach((stop, index) => {
        const stopLat = stop.location?.lat || stop.lat;
        const stopLng = stop.location?.lng || stop.lng;
        
        if (stopLat !== undefined && stopLng !== undefined) {
          const dist = haversineDistance(position.lat, position.lng, stopLat, stopLng);
          if (dist < minDistance) {
            minDistance = dist;
            currentStopIndex = index;
          }
        }
      });
    }

    const busUpdate = {
      currentLocation: { lat: position.lat, lng: position.lng },
      speed: position.speed !== null && position.speed !== undefined ? position.speed : 0,
      heading: position.heading !== null && position.heading !== undefined ? position.heading : 0,
      accuracy: position.accuracy || 10,
      currentStopIndex,
      lastUpdated: isFirebaseEnabled ? serverTimestamp() : new Date().toISOString(),
      occupancy: this.currentOccupancy
    };

    if (isFirebaseEnabled) {
      try {
        await updateDoc(doc(db, 'buses', this.busId), busUpdate);
      } catch (err) {
        console.error('Error logging position to Firestore:', err);
      }
    } else {
      // Local Storage mock updates
      const busesStr = localStorage.getItem('citybus_mock_buses');
      if (busesStr) {
        const mockBuses = JSON.parse(busesStr);
        const updated = mockBuses.map(b => {
          if (b.id === this.busId) {
            return {
              ...b,
              ...busUpdate,
              lastUpdated: new Date().toISOString()
            };
          }
          return b;
        });
        localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
      }
    }

    this.lastPosition = position;
  }

  async updateOccupancy(count) {
    this.currentOccupancy = Math.max(0, count);
    
    if (isFirebaseEnabled) {
      try {
        await updateDoc(doc(db, 'buses', this.busId), {
          occupancy: this.currentOccupancy
        });
      } catch (err) {
        console.error('Error updating occupancy on Firestore:', err);
      }
    } else {
      const busesStr = localStorage.getItem('citybus_mock_buses');
      if (busesStr) {
        const mockBuses = JSON.parse(busesStr);
        const updated = mockBuses.map(b => {
          if (b.id === this.busId) {
            return {
              ...b,
              occupancy: this.currentOccupancy
            };
          }
          return b;
        });
        localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
      }
    }
  }

  async endTrip(endStopId) {
    if (this.writeInterval) {
      clearInterval(this.writeInterval);
      this.writeInterval = null;
    }

    const endStopObj = this.routeStops.find(s => s.id === endStopId);
    const endStopName = endStopObj ? endStopObj.name : 'Terminus Stop';

    if (isFirebaseEnabled) {
      try {
        // Reset bus state
        await updateDoc(doc(db, 'buses', this.busId), {
          status: 'idle',
          isOnTrip: false,
          currentLocation: null,
          lastUpdated: serverTimestamp()
        });

        // Reset driver duty status
        await updateDoc(doc(db, 'drivers', this.driverId), {
          status: 'off-duty',
          isOnTrip: false,
          totalTrips: increment(1)
        });

        // Close out trip log
        if (this.tripLogId) {
          await updateDoc(doc(db, 'tripLogs', this.tripLogId), {
            endTime: serverTimestamp(),
            endStopName
          });
        }
      } catch (err) {
        console.error('Error closing live trip on Firestore:', err);
      }
    } else {
      // Mock Local Storage close out
      const busesStr = localStorage.getItem('citybus_mock_buses');
      if (busesStr) {
        const mockBuses = JSON.parse(busesStr);
        const updated = mockBuses.map(b => {
          if (b.id === this.busId) {
            return {
              ...b,
              status: 'idle',
              isOnTrip: false,
              currentLocation: null,
              lastUpdated: new Date().toISOString()
            };
          }
          return b;
        });
        localStorage.setItem('citybus_mock_buses', JSON.stringify(updated));
      }

      const driversStr = localStorage.getItem('citybus_mock_drivers');
      if (driversStr) {
        const mockDrivers = JSON.parse(driversStr);
        const updated = mockDrivers.map(d => {
          if (d.uid === this.driverId || d.id === this.driverId) {
            return {
              ...d,
              status: 'off-duty',
              isOnTrip: false,
              totalTrips: (d.totalTrips || 0) + 1
            };
          }
          return d;
        });
        localStorage.setItem('citybus_mock_drivers', JSON.stringify(updated));
      }

      if (this.tripLogId) {
        const logs = JSON.parse(localStorage.getItem('citybus_mock_triplogs') || '[]');
        const updated = logs.map(l => {
          if (l.id === this.tripLogId) {
            return {
              ...l,
              endTime: new Date().toISOString(),
              endStopName
            };
          }
          return l;
        });
        localStorage.setItem('citybus_mock_triplogs', JSON.stringify(updated));
      }
    }

    console.log(`Trip ${this.tripLogId} closed.`);
  }

  destroy() {
    if (this.writeInterval) {
      clearInterval(this.writeInterval);
      this.writeInterval = null;
    }
  }
}
