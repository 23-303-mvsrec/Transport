import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoader } from './Loader';

export const PassengerRoute = ({ children }) => {
  const { currentUser, role, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader message="Verifying security credentials..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'user') {
    // If authenticated but not passenger (e.g. driver or admin), redirect to root redirector
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PassengerRoute;
