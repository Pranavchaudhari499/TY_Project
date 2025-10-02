import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage'; // <-- Import the new page
import AdminDashboard from './pages/AdminDashboard'; // Import admin page
import BloodBankRegister from './pages/BloodBankRegister'; 
import BloodBankAdminDashboard from './pages/BloodBankAdminDashboard';
import BloodBankAdminRoute from './components/routing/BloodBankAdminRoute';
import AdminRoute from './components/routing/AdminRoute'; // Import admin route

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/blood-bank/register" element={<BloodBankRegister />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route path="" element={<AdminDashboard />} />
        </Route>
        <Route path="/blood-bank/dashboard" element={<BloodBankAdminRoute />}>
          <Route path="" element={<BloodBankAdminDashboard />} />
        </Route>
        {/* Optional: redirect root to login or signup */}
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;