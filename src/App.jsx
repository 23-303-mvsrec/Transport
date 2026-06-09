import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BusProvider } from './contexts/BusContext';
import { MapProvider } from './contexts/MapContext';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { FullPageLoader } from './components/shared/Loader';
import { StopListSkeleton } from './components/shared/Skeletons';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Route Guards
import PassengerRoute from './components/shared/PassengerRoute';
import DriverRoute from './components/shared/DriverRoute';
import AdminRoute from './components/shared/AdminRoute';

// Layout Wrappers
import UserLayout from './components/user/UserLayout';
import { DriverLayout } from './components/shared/Layouts';
import AdminLayout from './components/admin/AdminLayout';

// Public pages (lazy-loaded)
const Login = React.lazy(() => import('./pages/user/Login'));
const ForgotPassword = React.lazy(() => import('./pages/user/ForgotPassword'));
const DriverLogin = React.lazy(() => import('./pages/driver/DriverLogin'));

// Passenger pages (lazy-loaded)
const Home = React.lazy(() => import('./pages/user/Home'));
const RoutesPage = React.lazy(() => import('./pages/user/Routes'));
const RouteBuses = React.lazy(() => import('./pages/user/RouteBuses'));
const Tracking = React.lazy(() => import('./pages/user/Tracking'));
const Alerts = React.lazy(() => import('./pages/user/Alerts'));
const Profile = React.lazy(() => import('./pages/user/Profile'));

// Driver pages (lazy-loaded)
const DriverDashboard = React.lazy(() => import('./pages/driver/DriverDashboard'));

// Admin pages (lazy-loaded)
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminBuses = React.lazy(() => import('./pages/admin/Buses'));
const AdminRoutes = React.lazy(() => import('./pages/admin/Routes'));
const AdminStops = React.lazy(() => import('./pages/admin/Stops'));
const AdminDrivers = React.lazy(() => import('./pages/admin/Drivers'));
const AdminUsers = React.lazy(() => import('./pages/admin/Users'));
const AdminAnnouncements = React.lazy(() => import('./pages/admin/Announcements'));

const SuspenseLoader = () => (
  <div className="p-6 max-w-[430px] mx-auto min-h-screen bg-slate-50">
    <StopListSkeleton />
  </div>
);

/**
 * Centered redirect element checking authentication states
 */
const RoleRedirector = () => {
  const { currentUser, role, isLoading } = useAuth();
  
  if (isLoading) {
    return <FullPageLoader message="Authenticating credentials..." />;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  if (role === 'driver') {
    return <Navigate to="/driver/dashboard" replace />;
  }
  
  return <Navigate to="/home" replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusProvider>
          <MapProvider>
            
            {/* Custom Tap-Dismissible Toasts config */}
            <Toaster
              toastOptions={{
                success: {
                  duration: 3000,
                  position: 'bottom-center'
                },
                error: {
                  duration: 5000,
                  position: 'top-right'
                },
                blank: {
                  duration: 3000,
                  position: 'bottom-center'
                }
              }}
            >
              {(t) => (
                <ToastBar 
                  toast={t}
                  style={{
                    background: t.type === 'success' 
                      ? '#059669' 
                      : t.type === 'error' 
                        ? '#dc2626' 
                        : '#2563eb',
                    color: '#ffffff',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    border: 'none'
                  }}
                >
                  {({ icon, message }) => (
                    <div 
                      onClick={() => toast.dismiss(t.id)} 
                      className="flex items-center gap-2"
                    >
                      {icon}
                      {message}
                    </div>
                  )}
                </ToastBar>
              )}
            </Toaster>

            <ErrorBoundary>
              <Suspense fallback={<SuspenseLoader />}>
                <Routes>
                  {/* Role Check redirect at root */}
                  <Route path="/" element={<RoleRedirector />} />

                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/driver/login" element={<DriverLogin />} />

                  {/* 1. PASSENGER (USER) PORTAL (Protected) */}
                  <Route element={<PassengerRoute><UserLayout /></PassengerRoute>}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/routes" element={<RoutesPage />} />
                    <Route path="/routes/:id" element={<RouteBuses />} />
                    <Route path="/tracking/:busId" element={<Tracking />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>

                  {/* 2. DRIVER SYSTEM PORTAL (Protected) */}
                  <Route element={<DriverRoute><DriverLayout /></DriverRoute>}>
                    <Route path="/driver/dashboard" element={<DriverDashboard />} />
                  </Route>

                  {/* 3. ADMINISTRATION SYSTEM PORTAL (Protected) */}
                  <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/buses" element={<AdminBuses />} />
                    <Route path="/admin/routes" element={<AdminRoutes />} />
                    <Route path="/admin/stops" element={<AdminStops />} />
                    <Route path="/admin/drivers" element={<AdminDrivers />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                  </Route>

                  {/* Not Found fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>

          </MapProvider>
        </BusProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
