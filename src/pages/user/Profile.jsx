import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBuses } from '../../contexts/BusContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone,
  Star, 
  LogOut, 
  Settings, 
  HelpCircle, 
  ChevronRight,
  X,
  Edit2,
  Map,
  Bell,
  Info
} from 'lucide-react';
import Badge from '../../components/shared/Badge';
import toast from 'react-hot-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseEnabled } from '../../services/firebase';

export const Profile = () => {
  const { currentUser, userProfile, updateProfile, logout } = useAuth();
  const { routes } = useBuses();
  const navigate = useNavigate();

  // Bottom Sheet States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Settings States
  const [mapPreference, setMapPreference] = useState('Google Maps');
  const [notifications, setNotifications] = useState({ push: true, sms: false });

  // Initialize editing inputs and settings
  useEffect(() => {
    if (userProfile) {
      setEditName(userProfile.name || '');
      setEditPhone(userProfile.phone || '');
      setEditEmail(userProfile.email || '');
    }
  }, [userProfile]);

  useEffect(() => {
    const savedMap = localStorage.getItem('userMapPreference');
    if (savedMap) {
      setMapPreference(savedMap === 'OSM' ? 'OpenStreetMap (Low Data)' : 'Google Maps');
    }

    const savedNotifs = localStorage.getItem('userNotificationPreferences');
    if (savedNotifs) {
      try {
        setNotifications(JSON.parse(savedNotifs));
      } catch (e) {}
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  // Google account check
  const isGoogleUser = currentUser?.providerData?.some(p => p.providerId === 'google.com') || currentUser?.uid === 'google-uid-mock';

  // Phone number 10-digit validation
  const validatePhone = (num) => {
    const cleaned = num.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  // Save Edit Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    if (editPhone && !validatePhone(editPhone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    try {
      const updatedFields = {
        name: editName.trim(),
        phone: editPhone.trim()
      };

      if (isFirebaseEnabled && currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), updatedFields);
      }
      await updateProfile(updatedFields);
      
      toast.success('Profile updated successfully!');
      setIsEditOpen(false);
    } catch (err) {
      toast.error('Failed to update profile details');
    }
  };

  // Remove Favorite Route
  const handleRemoveFavorite = async (e, routeId) => {
    e.stopPropagation();
    const favs = userProfile?.favoriteRouteIds || [];
    const updated = favs.filter(id => id !== routeId);
    
    try {
      await updateProfile({ favoriteRouteIds: updated });
      toast.success('Removed line from bookmarks');
    } catch (err) {
      toast.error('Failed to update bookmarks');
    }
  };

  // Map toggle handler
  const handleMapPreferenceToggle = () => {
    const nextPref = mapPreference === 'Google Maps' ? 'OpenStreetMap (Low Data)' : 'Google Maps';
    setMapPreference(nextPref);
    localStorage.setItem('userMapPreference', nextPref === 'OpenStreetMap (Low Data)' ? 'OSM' : 'Google');
    toast.success(`Map type set to ${nextPref}`);
  };

  // Notification toggle handler
  const handleNotificationToggle = (key) => {
    const nextNotifs = { ...notifications, [key]: !notifications[key] };
    setNotifications(nextNotifs);
    localStorage.setItem('userNotificationPreferences', JSON.stringify(nextNotifs));
    toast.success(`Notifications updated`);
  };

  // User Initials for Avatar
  const userInitials = (userProfile?.name || currentUser?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Load Bookmarked Routes
  const bookmarkedRoutes = (userProfile?.favoriteRouteIds || [])
    .map(rid => routes.find(r => r.id === rid))
    .filter(Boolean);

  return (
    <div className="p-5 space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Passenger Profile</h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage preferences, saved stations, and credentials</p>
        </div>
        <button
          onClick={() => setIsEditOpen(true)}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          title="Edit Details"
        >
          <Edit2 size={15} />
        </button>
      </div>

      {/* 1. Header Card (Blue Profile Capsule) */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        
        <div className="w-18 h-18 bg-white/20 backdrop-blur-md text-white font-black text-xl rounded-full flex items-center justify-center mx-auto border-2 border-white/30 shadow-md">
          {userInitials}
        </div>
        
        <h4 className="font-extrabold text-base mt-3 truncate">{userProfile?.name || 'Passenger Guest'}</h4>
        
        <p className="text-xs text-blue-100 font-semibold mt-1 flex items-center justify-center gap-1.5 truncate">
          <Mail size={12} />
          {userProfile?.email || 'guest@citybus.in'}
        </p>

        {userProfile?.phone && (
          <p className="text-xs text-blue-100 font-semibold mt-0.5 flex items-center justify-center gap-1.5">
            <Phone size={12} />
            +91 {userProfile.phone}
          </p>
        )}
      </div>

      {/* 2. Favourite Routes Section */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
          <Star size={14} className="text-amber-500 fill-amber-500" />
          Bookmarked Transit Lines
        </h4>

        {bookmarkedRoutes.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400 shadow-premium">
            No bookmarked routes yet. Tap the star icon on any line to add.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {bookmarkedRoutes.map(route => (
              <div 
                key={route.id}
                onClick={() => navigate(`/routes/${route.id}`)}
                className="bg-white border border-slate-100/60 rounded-2xl p-4 flex items-center justify-between shadow-premium hover:shadow-glass hover:border-primary/10 transition cursor-pointer"
              >
                <div className="text-left">
                  <span className="bg-primary-light text-primary text-[9px] font-extrabold px-2 py-0.5 rounded border border-primary/10">
                    Line {route.number}
                  </span>
                  <h5 className="font-bold text-xs text-slate-800 mt-1.5">{route.name}</h5>
                </div>
                
                <button
                  onClick={(e) => handleRemoveFavorite(e, route.id)}
                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition"
                  title="Remove bookmark"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Settings Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-3 shadow-premium space-y-1">
        {/* Map Type toggle */}
        <div 
          onClick={handleMapPreferenceToggle}
          className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl cursor-pointer transition text-left"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Map size={18} className="text-blue-500" />
            <div>
              <span className="text-xs font-bold block">Map Engine Type</span>
              <span className="text-[10px] text-slate-400 font-semibold">{mapPreference}</span>
            </div>
          </div>
          <span className="text-[10px] text-primary font-bold bg-primary-light px-2.5 py-1 rounded-lg border border-primary/10">
            CHANGE
          </span>
        </div>

        {/* Push Notification Toggle */}
        <div 
          onClick={() => handleNotificationToggle('push')}
          className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl cursor-pointer transition text-left"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Bell size={18} className="text-purple-500" />
            <div>
              <span className="text-xs font-bold block">Push Notifications</span>
              <span className="text-[10px] text-slate-400 font-semibold">Alerts on major transit delays</span>
            </div>
          </div>
          <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${notifications.push ? 'bg-primary' : 'bg-slate-200'}`}>
            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifications.push ? 'translate-x-3.5' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* SMS Notification Toggle */}
        <div 
          onClick={() => handleNotificationToggle('sms')}
          className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl cursor-pointer transition text-left"
        >
          <div className="flex items-center gap-3 text-slate-700">
            <Phone size={18} className="text-emerald-500" />
            <div>
              <span className="text-xs font-bold block">SMS Alerts</span>
              <span className="text-[10px] text-slate-400 font-semibold">Receive text on emergency route changes</span>
            </div>
          </div>
          <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${notifications.sms ? 'bg-primary' : 'bg-slate-200'}`}>
            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifications.sms ? 'translate-x-3.5' : 'translate-x-0'}`} />
          </div>
        </div>
      </div>

      {/* 4. App Details & Meta Info */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium text-left text-xs font-semibold text-slate-500 space-y-3">
        <div className="flex justify-between items-center">
          <span>Application Version</span>
          <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">v2.4.1 (Stable)</span>
        </div>
        <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
          <span>Contact Support Desk</span>
          <a href="mailto:support@citybus.in" className="text-primary hover:underline">support@citybus.in</a>
        </div>
        <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
          <span>About CityBus</span>
          <span className="text-slate-700">Punjab Transit Operations</span>
        </div>
      </div>

      {/* 5. Logout Button */}
      <button 
        onClick={handleLogout}
        className="w-full bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
      >
        <LogOut size={14} />
        <span>Sign Out of Account</span>
      </button>

      {/* EDIT PROFILE BOTTOM SHEET */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl animate-slide-up space-y-5 text-slate-800 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900">Edit Profile Details</h4>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
              {/* Name field */}
              <div className="space-y-1">
                <label className="text-slate-500">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                  placeholder="e.g. Jaspreet Singh"
                />
              </div>

              {/* Phone field */}
              <div className="space-y-1">
                <label className="text-slate-500">Mobile Phone (10 digits)</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:bg-white transition"
                  placeholder="e.g. 9812345678"
                />
              </div>

              {/* Email field (Read-only for Google Auth) */}
              <div className="space-y-1">
                <label className="text-slate-500">
                  Email Address {isGoogleUser && <span className="text-[10px] text-slate-400 font-normal">(Linked via Google OAuth)</span>}
                </label>
                <input
                  type="email"
                  value={editEmail}
                  disabled={isGoogleUser}
                  className={`w-full border rounded-xl py-3 px-4 focus:outline-none ${
                    isGoogleUser 
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-slate-50 border-slate-200 focus:border-primary focus:bg-white transition'
                  }`}
                  placeholder="e.g. user@gmail.com"
                />
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20 transition duration-300"
              >
                Save Profile Updates
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
