// frontend/src/pages/BloodBankAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BloodBankAdminDashboard = () => {
  const [bankData, setBankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const config = { headers: { 'x-auth-token': token } };
        const res = await axios.get('http://localhost:5000/api/blood-banks/dashboard', config);
        setBankData(res.data);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please log in again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleRegistration = async (userId, action) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.post(`http://localhost:5000/api/blood-bank-admin/registrations/${userId}/${action}`, {}, config);
      setBankData(res.data); // Refresh dashboard data with the response
    } catch (err) {
      console.error(`Failed to ${action} registration`, err);
      alert(`Could not ${action} the request.`);
    }
  };

  if (loading) return <div className="p-8 font-bold text-center">Loading Dashboard...</div>;
  if (error) return <div className="p-8 text-red-500 font-bold text-center">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold text-gray-800">Blood Bank Dashboard</h1>
            {bankData && <h2 className="text-md text-red-600 font-semibold">{bankData.name}</h2>}
        </div>
        <button onClick={handleLogout} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Logout</button>
      </header>

      <main className="p-8 space-y-8">
        {/* Pending Requests Section */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Pending Registration Requests</h3>
          <div className="space-y-4">
            {bankData?.pendingRegistrations?.length > 0 ? (
              bankData.pendingRegistrations.map(user => (
                <div key={user._id} className="p-4 border rounded-md">
                  <div className="flex flex-wrap justify-between items-center">
                    <div>
                      <p className="font-bold">{user.displayName}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      <button 
                        onClick={() => handleRegistration(user._id, 'approve')} 
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleRegistration(user._id, 'reject')} 
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <span><strong>Blood Type:</strong> {user.donorProfile?.bloodType || 'N/A'}</span>
                    <span><strong>Weight:</strong> {user.weight} kg</span>
                    <span><strong>City:</strong> {user.city}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No pending requests.</p>
            )}
          </div>
        </section>

        {/* --- MERGED: REGISTERED DONORS SECTION --- */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Registered Donors ({bankData?.registeredDonors?.length || 0})</h3>
            {bankData?.registeredDonors?.length > 0 ? (
            <div className="space-y-3">
                {bankData.registeredDonors.map(user => (
                <div key={user._id} className="p-3 border rounded-md">
                    <p className="font-bold">{user.displayName} ({user.donorProfile?.bloodType || 'N/A'})</p>
                    <p className="text-sm text-gray-600">{user.email} - {user.city}</p>
                </div>
                ))}
            </div>
            ) : (
            <p>No donors have been approved yet.</p>
            )}
        </div>

        {/* Blood Stock Management Section (Placeholder) */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Blood Stock Management</h3>
          <p className="text-gray-500">Stock management features coming soon.</p>
        </section>
      </main>
    </div>
  );
};

export default BloodBankAdminDashboard;