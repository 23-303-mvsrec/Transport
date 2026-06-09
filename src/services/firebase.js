import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { seedCity, seedStops, seedRoutes, seedBuses, seedDrivers, seedAnnouncements } from './seedData';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigValid =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_firebase_api_key_here' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id';

let app;
let auth;
let db;
let isFirebaseEnabled = false;

if (isFirebaseConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully in CityBus project.");
  } catch (error) {
    console.error("Firebase initialization failed, falling back to mock services:", error);
  }
} else {
  console.log("Firebase config missing or using placeholders. Operating in Local Mock-Storage Mode.");
}

// Auto-seed localStorage on first load (mock offline fallback mode)
if (!isFirebaseEnabled && typeof window !== 'undefined') {
  if (!localStorage.getItem('citybus_mock_seeded')) {
    localStorage.setItem('citybus_mock_city', JSON.stringify(seedCity));
    localStorage.setItem('citybus_mock_stops', JSON.stringify(seedStops));
    localStorage.setItem('citybus_mock_routes', JSON.stringify(seedRoutes));
    localStorage.setItem('citybus_mock_buses', JSON.stringify(seedBuses));
    localStorage.setItem('citybus_mock_drivers', JSON.stringify(seedDrivers));
    localStorage.setItem('citybus_mock_announcements', JSON.stringify(seedAnnouncements));
    localStorage.setItem('citybus_mock_users', JSON.stringify([
      { id: 'admin-uid', name: 'CityBus Administrator', email: 'admin@citybus.in', role: 'admin', createdAt: new Date().toISOString() }
    ]));
    localStorage.setItem('citybus_mock_seeded', 'true');
    console.log('CityBus: LocalStorage auto-seeded with Hyderabad transport data.');
  }
}

export const seedDatabase = async () => {
  if (!isFirebaseEnabled) {
    localStorage.setItem('citybus_mock_city', JSON.stringify(seedCity));
    localStorage.setItem('citybus_mock_stops', JSON.stringify(seedStops));
    localStorage.setItem('citybus_mock_routes', JSON.stringify(seedRoutes));
    localStorage.setItem('citybus_mock_buses', JSON.stringify(seedBuses));
    localStorage.setItem('citybus_mock_drivers', JSON.stringify(seedDrivers));
    localStorage.setItem('citybus_mock_announcements', JSON.stringify(seedAnnouncements));
    console.log("Mock LocalStorage seeded successfully.");
    return true;
  }

  try {
    await setDoc(doc(db, 'cities', seedCity.id), seedCity);

    const stopsBatch = writeBatch(db);
    seedStops.forEach(stop => {
      stopsBatch.set(doc(db, 'stops', stop.id), stop);
    });
    await stopsBatch.commit();

    const routesBatch = writeBatch(db);
    seedRoutes.forEach(route => {
      routesBatch.set(doc(db, 'routes', route.id), route);
    });
    await routesBatch.commit();

    const busesBatch = writeBatch(db);
    seedBuses.forEach(bus => {
      busesBatch.set(doc(db, 'buses', bus.id), bus);
    });
    await busesBatch.commit();

    const driversBatch = writeBatch(db);
    seedDrivers.forEach(driver => {
      driversBatch.set(doc(db, 'drivers', driver.uid), driver);
    });
    await driversBatch.commit();

    const announcementsBatch = writeBatch(db);
    seedAnnouncements.forEach(ann => {
      announcementsBatch.set(doc(db, 'announcements', ann.id), ann);
    });
    await announcementsBatch.commit();

    console.log("Firestore Database seeded with Hyderabad Telangana records successfully.");
    return true;
  } catch (err) {
    console.error("Error seeding Firestore database:", err);
    throw err;
  }
};

export const seedDriverAccounts = async () => {
  if (!isFirebaseEnabled) {
    console.log("Mock Auth accounts initialized for driver1@citybus.gov.in ... driver15@citybus.gov.in");
    return true;
  }

  const results = [];
  for (let i = 1; i <= 15; i++) {
    const email = `driver${i}@citybus.gov.in`;
    const password = 'CityBus@2024';
    const name = seedDrivers[i - 1]?.name || `Driver ${i}`;
    const uid = seedDrivers[i - 1]?.uid || `driver-uid-0${i}`;

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name,
        email,
        phone: seedDrivers[i - 1]?.phone || `+91 98123 450${i < 10 ? '0' + i : i}`,
        role: 'driver',
        favoriteRouteIds: [],
        createdAt: new Date().toISOString(),
        isActive: true
      });

      const driverRef = doc(db, 'drivers', uid);
      await setDoc(driverRef, {
        ...seedDrivers[i - 1],
        uid: user.uid
      });

      results.push({ email, status: 'Created Auth Account' });
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        results.push({ email, status: 'Already Exists' });
      } else {
        console.error(`Failed to seed ${email}:`, error);
        results.push({ email, status: `Failed: ${error.message}` });
      }
    }
  }
  console.log("Driver seeding output logs:", results);
  return results;
};

export const checkFirestoreAvailability = async () => {
  if (!isFirebaseEnabled || !db) return false;
  try {
    const testRef = doc(db, 'cities', 'hyderabad');
    await getDoc(testRef);
    return true;
  } catch {
    return false;
  }
};

export { app, auth, db, isFirebaseEnabled };
