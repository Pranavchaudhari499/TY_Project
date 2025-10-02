// frontend/src/components/routing/BloodBankAdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const BloodBankAdminRoute = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('authToken');

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  // Check for the specific bloodbank_admin role
  return user.role === 'bloodbank_admin' ? <Outlet /> : <Navigate to="/dashboard" />;
};

export default BloodBankAdminRoute;