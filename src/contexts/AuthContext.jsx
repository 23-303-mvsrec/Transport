import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseEnabled } from '../services/firebase';
import { seedDrivers } from '../services/seedData';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light');

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('app_theme', next);
      return next;
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#020617';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '';
    }
  }, [theme]);

  // Helper flags
  const isAdmin = role === 'admin';
  const isDriver = role === 'driver';
  const isPassenger = role === 'user';

  // Redirect Logic
  const handleRedirect = (userRole) => {
    if (userRole === 'admin') {
      navigate('/admin/dashboard');
    } else if (userRole === 'driver') {
      navigate('/driver/dashboard');
    } else {
      navigate('/home');
    }
  };

  // Monitor Auth State Changes
  useEffect(() => {
    if (isFirebaseEnabled) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setIsLoading(true);
        if (user) {
          setCurrentUser(user);
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const userEmail = user.email?.toLowerCase().trim();
            const isAdminEmail = userEmail === 'admin@citybus.in';
            const isDriverEmail = userEmail?.match(/^driver\d{1,2}@citybus\.gov\.in$/);
            
            if (userDoc.exists()) {
              const profile = userDoc.data();
              let profileRole = profile.role || 'user';
              if (isAdminEmail) {
                profileRole = 'admin';
              } else if (isDriverEmail) {
                profileRole = 'driver';
              }

              // Update Firestore if the stored role doesn't match the enforced role
              if (profile.role !== profileRole) {
                try {
                  await updateDoc(userDocRef, { role: profileRole });
                  profile.role = profileRole;
                } catch (updateErr) {
                  console.warn('Firestore role update failed:', updateErr.message);
                }
              }

              setUserProfile(profile);
              setRole(profileRole);
            } else {
              let initialRole = 'user';
              if (isAdminEmail) {
                initialRole = 'admin';
              } else if (isDriverEmail) {
                initialRole = 'driver';
              }

              const newProfile = {
                id: user.uid,
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                phone: user.phoneNumber || '',
                role: initialRole,
                favoriteRouteIds: [],
                createdAt: new Date().toISOString(),
                isActive: true
              };
              try {
                await setDoc(userDocRef, newProfile);
              } catch (writeErr) {
                console.warn('Firestore write failed, storing locally:', writeErr.message);
                localStorage.setItem('citybus_mock_user', JSON.stringify({ uid: user.uid, ...newProfile }));
              }
              setUserProfile(newProfile);
              setRole(initialRole);
            }
          } catch (error) {
            console.warn("Firestore read failed, using local fallback:", error.message);
            const storedUser = localStorage.getItem('citybus_mock_user');
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              setUserProfile(parsed);
              setRole(parsed.role);
            } else {
              const fallbackProfile = { name: user.email.split('@')[0], role: 'user' };
              setUserProfile(fallbackProfile);
              setRole('user');
            }
          }
        } else {
          setCurrentUser(null);
          setUserProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      });
      return unsubscribe;
    } else {
      // Mock mode Local Auth Check
      const storedUser = localStorage.getItem('citybus_mock_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        setUserProfile(parsed);
        setRole(parsed.role);
      }
      setIsLoading(false);
    }
  }, []);

  // Standard Login
  const login = async (email, password) => {
    setIsLoading(true);
    const lowercaseEmail = email.toLowerCase().trim();

    if (isFirebaseEnabled) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let userRole = 'user';
        if (lowercaseEmail === 'admin@citybus.in') {
          userRole = 'admin';
        } else if (lowercaseEmail.match(/^driver\d{1,2}@citybus\.gov\.in$/)) {
          userRole = 'driver';
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            userRole = userDoc.exists() ? (userDoc.data().role || 'user') : 'user';
          } catch (fsError) {
            console.warn('Firestore read failed during login, detecting role from email:', fsError.message);
          }
        }
        
        toast.success('Sign in successful!');
        handleRedirect(userRole);
        return user;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Mock Login Logic
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let matchedUser = null;

          if (lowercaseEmail === 'admin@citybus.in' && password === 'admin123') {
            matchedUser = {
              uid: 'admin-uid',
              name: 'CityBus Administrator',
              email: 'admin@citybus.in',
              role: 'admin',
              favoriteRouteIds: []
            };
          } else if (lowercaseEmail.match(/^driver\d{1,2}@citybus\.gov\.in$/)) {
            const numMatch = lowercaseEmail.match(/driver(\d{1,2})/);
            const idx = parseInt(numMatch[1]) - 1;
            if (password === 'CityBus@2024' && idx >= 0 && idx < 15) {
              const d = seedDrivers[idx];
              matchedUser = {
                uid: d.uid,
                name: d.name,
                email: lowercaseEmail,
                role: 'driver',
                assignedBusId: d.assignedBusId,
                assignedRouteId: d.assignedRouteId
              };
            }
          } else if (password === 'user123') {
            matchedUser = {
              uid: 'passenger-uid-mock',
              name: 'Aarav Sharma',
              email: lowercaseEmail,
              role: 'user',
              favoriteRouteIds: ['R-01', 'R-02']
            };
          }

          if (matchedUser) {
            localStorage.setItem('citybus_mock_user', JSON.stringify(matchedUser));
            setCurrentUser(matchedUser);
            setUserProfile(matchedUser);
            setRole(matchedUser.role);
            toast.success(`Welcome back, ${matchedUser.name}!`);
            handleRedirect(matchedUser.role);
            resolve(matchedUser);
          } else {
            reject({ code: 'auth/user-not-found' });
          }
          setIsLoading(false);
        }, 800);
      });
    }
  };

  // Google OAuth Popup Login
  const signInWithGoogle = async () => {
    setIsLoading(true);
    if (!isFirebaseEnabled) {
      // Mock Google Popup Login
      return new Promise((resolve) => {
        setTimeout(() => {
          const matchedUser = {
            uid: 'google-uid-mock',
            name: 'Google User',
            email: 'google.user@gmail.com',
            role: 'user',
            favoriteRouteIds: []
          };
          localStorage.setItem('citybus_mock_user', JSON.stringify(matchedUser));
          setCurrentUser(matchedUser);
          setUserProfile(matchedUser);
          setRole(matchedUser.role);
          toast.success('Signed in with Google (Mock)!');
          handleRedirect('user');
          resolve(matchedUser);
          setIsLoading(false);
        }, 800);
      });
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      let userRole = 'user';
      const userEmail = user.email?.toLowerCase().trim();
      const isAdminEmail = userEmail === 'admin@citybus.in';

      if (isAdminEmail) {
        userRole = 'admin';
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          const newProfile = {
            id: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            phone: '',
            role: userRole,
            favoriteRouteIds: [],
            createdAt: new Date().toISOString(),
            isActive: true
          };
          try {
            await setDoc(userDocRef, newProfile);
          } catch (writeErr) {
            console.warn('Firestore write failed for Google user:', writeErr.message);
          }
          setUserProfile(newProfile);
        } else {
          const profile = userDoc.data();
          let profileRole = profile.role || 'user';
          if (isAdminEmail) {
            profileRole = 'admin';
          }
          
          if (profile.role !== profileRole) {
            try {
              await updateDoc(userDocRef, { role: profileRole });
              profile.role = profileRole;
            } catch (uErr) {
              console.warn('Firestore role update failed for Google user:', uErr.message);
            }
          }
          
          setUserProfile(profile);
          userRole = profileRole;
        }
      } catch (fsError) {
        console.warn('Firestore read failed for Google user:', fsError.message);
        if (isAdminEmail) {
          userRole = 'admin';
        }
      }

      toast.success('Signed in with Google!');
      handleRedirect(userRole);
      return user;
    } catch (error) {
      toast.error(error.message || 'Google Auth failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Signup
  const signup = async (email, password, name, phone = '') => {
    setIsLoading(true);
    if (isFirebaseEnabled) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const lowercaseEmail = email.toLowerCase().trim();
        const initialRole = lowercaseEmail === 'admin@citybus.in' ? 'admin' : 'user';

        const newProfile = {
          id: user.uid,
          name,
          email,
          phone,
          role: initialRole,
          favoriteRouteIds: [],
          createdAt: new Date().toISOString(),
          isActive: true
        };
        
        try {
          await setDoc(doc(db, 'users', user.uid), newProfile);
        } catch (fsError) {
          console.warn('Firestore write failed (rules?), storing profile locally:', fsError.message);
          localStorage.setItem('citybus_mock_user', JSON.stringify({ uid: user.uid, ...newProfile }));
        }

        setCurrentUser(user);
        setUserProfile(newProfile);
        setRole(initialRole);
        
        toast.success('Account created successfully!');
        handleRedirect(initialRole);
        return user;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Mock Signup
      return new Promise((resolve) => {
        setTimeout(() => {
          const matchedUser = {
            uid: `usr-${Date.now()}`,
            name,
            email: email.toLowerCase().trim(),
            phone,
            role: 'user',
            favoriteRouteIds: []
          };
          localStorage.setItem('citybus_mock_user', JSON.stringify(matchedUser));
          setCurrentUser(matchedUser);
          setUserProfile(matchedUser);
          setRole('user');
          toast.success('Account created (Mock)!');
          handleRedirect('user');
          resolve(matchedUser);
          setIsLoading(false);
        }, 800);
      });
    }
  };

  // Sign out
  const logout = async () => {
    setIsLoading(true);
    const prevRole = role;

    if (isFirebaseEnabled) {
      try {
        await signOut(auth);
        toast.success('Logged out successfully');
      } catch (error) {
        toast.error('Logout failed');
      }
    } else {
      localStorage.removeItem('citybus_mock_user');
      setCurrentUser(null);
      setUserProfile(null);
      setRole(null);
      toast.success('Logged out (Mock)');
    }
    
    setIsLoading(false);
    
    // Redirect based on previous role (driver -> /driver/login, others -> /login)
    if (prevRole === 'driver') {
      navigate('/driver/login');
    } else {
      navigate('/login');
    }
  };

  // Update profile attributes (e.g. Favorite Routes)
  const updateProfile = async (fields) => {
    if (isFirebaseEnabled && currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), fields);
        setUserProfile(prev => ({ ...prev, ...fields }));
      } catch (err) {
        console.error('Failed to update user profile in Firestore:', err);
      }
    } else {
      // Mock Update
      const prev = userProfile || {};
      const updated = { ...prev, ...fields };
      setUserProfile(updated);
      localStorage.setItem('citybus_mock_user', JSON.stringify(updated));
    }
  };

  const value = {
    currentUser,
    userProfile,
    role,
    isAdmin,
    isDriver,
    isPassenger,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
    signInWithGoogle,
    isMock: !isFirebaseEnabled,
    theme,
    toggleTheme
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
