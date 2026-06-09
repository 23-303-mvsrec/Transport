import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoader } from './Loader';

export const DriverRoute = ({ children }) => {
  const { currentUser, role, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader message="Verifying driver authentication..." />;
  }

  if (!currentUser) {
    return <Navigate to="/driver/login" replace />;
  }

  if (role !== 'driver') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default DriverRoute;
