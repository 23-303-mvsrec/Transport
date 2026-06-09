import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoader } from './Loader';

export const AdminRoute = ({ children }) => {
  const { currentUser, role, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader message="Verifying administrative authority..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
