// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Droplet, MapPin, Heart, Users, Clock, Bell, Activity, Building } from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [requestData, setRequestData] = useState({ bloodType: '' });
  const [requestMessage, setRequestMessage] = useState('');
  const [foundDonors, setFoundDonors] = useState([]);
  const [donorData, setDonorData] = useState({ bloodType: '', isAvailable: true });
  const [donorMessage, setDonorMessage] = useState('');
  const [relevantRequests, setRelevantRequests] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [bankMessage, setBankMessage] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('authToken');

    if (!storedUser || !token) {
      navigate('/login');
      return;
    }

    setUser(storedUser);

    if (storedUser.donorProfile) {
      setDonorData({
        bloodType: storedUser.donorProfile.bloodType || '',
        isAvailable: storedUser.donorProfile.isAvailable !== false,
      });
    }

    const fetchRelevantRequests = async () => {
      if (storedUser.donorProfile && storedUser.donorProfile.bloodType) {
        try {
          const config = { headers: { 'x-auth-token': token } };
          const res = await axios.get('http://localhost:5000/api/requests/relevant', config);
          setRelevantRequests(res.data);
        } catch (err) {
          console.error('Could not fetch requests:', err);
        }
      }
    };

    const fetchBloodBanks = async () => {
      try {
        const config = { headers: { 'x-auth-token': token } };
        const res = await axios.get('http://localhost:5000/api/blood-banks', config);
        setBloodBanks(res.data);
      } catch (err) {
        console.error("Could not fetch blood banks:", err);
      }
    };

    fetchRelevantRequests();
    fetchBloodBanks();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleUpdateLocation = () => {
    setMessage('Getting location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          type: 'Point',
          coordinates: [position.coords.longitude, position.coords.latitude],
        };
        try {
          const token = localStorage.getItem('authToken');
          const config = { headers: { 'x-auth-token': token } };
          const res = await axios.patch(
            'http://localhost:5000/api/users/location',
            { location: newLocation },
            config
          );
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
          setMessage('✅ Location updated successfully!');
        } catch (err) {
          setMessage('❌ Failed to update location.');
        }
      },
      () => setMessage('❌ Could not get location.')
    );
  };

  const handleRequestChange = (e) => {
    setRequestData({ ...requestData, [e.target.name]: e.target.value });
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setFoundDonors([]);
    setRequestMessage('Searching for donors...');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const liveLocation = {
        type: 'Point',
        coordinates: [position.coords.longitude, position.coords.latitude],
      };
      try {
        const token = localStorage.getItem('authToken');
        const config = { headers: { 'x-auth-token': token } };
        const body = { bloodType: requestData.bloodType, location: liveLocation };
        const res = await axios.post('http://localhost:5000/api/requests', body, config);
        setRequestMessage(`✅ ${res.data.message}`);
        setFoundDonors(res.data.donors || []);
      } catch (err) {
        setRequestMessage('❌ Error creating request.');
      }
    });
  };

  const handleDonorChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDonorData({ ...donorData, [e.target.name]: value });
  };

  const handleDonorSubmit = async (e) => {
    e.preventDefault();
    setDonorMessage('Saving...');
    try {
      const token = localStorage.getItem('authToken');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.patch(
        'http://localhost:5000/api/users/donor-profile',
        donorData,
        config
      );
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setDonorMessage('✅ Profile saved successfully!');
    } catch (err) {
      setDonorMessage('❌ Error saving profile.');
    }
  };

  const handleRegisterWithBank = async (bankId) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.post(`http://localhost:5000/api/blood-banks/${bankId}/register-request`, {}, config);
      
      // Optimistically update the user state to reflect the pending request
      const updatedUser = { ...user, pendingBankRequest: bankId };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setBankMessage({ id: bankId, msg: `✅ ${res.data.msg}` });
    } catch (err) {
      setBankMessage({ id: bankId, msg: `❌ ${err.response.data.msg}` });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
        <div className="animate-pulse">
          <Droplet className="w-16 h-16 text-red-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* 3D Navbar */}
      <nav className="relative backdrop-blur-xl bg-white/80 shadow-2xl border-b border-red-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 transform hover:scale-105 transition-transform duration-300">
              <div className="relative">
                <Droplet className="w-8 h-8 text-red-600 animate-pulse" />
                <div className="absolute inset-0 bg-red-500 blur-lg opacity-30 rounded-full"></div>
              </div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                BloodBridge
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="group relative px-6 py-3 font-bold text-red-600 overflow-hidden rounded-xl border-2 border-red-600 transition-all duration-300 hover:text-white"
            >
              <span className="absolute inset-0 bg-red-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
              <span className="relative">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Welcome Card with 3D Effect */}
        <div className="mb-8 transform hover:scale-[1.02] transition-all duration-500">
          <div className="relative bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl p-8 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-2">
                <Heart className="w-12 h-12 text-white animate-pulse" />
                <h2 className="text-4xl font-black text-white">Welcome back!</h2>
              </div>
              <p className="text-xl text-white/90 font-medium">{user.displayName}</p>
              <p className="text-white/70 mt-2">Making a difference, one donation at a time</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Profile Stats Cards */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-red-100 transform hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Blood Type</p>
                <p className="text-2xl font-black text-gray-900">
                  {user.donorProfile?.bloodType || 'Not Set'}
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-red-100 transform hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Location</p>
                <p className="text-lg font-bold text-gray-900">{user.city}</p>
              </div>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-red-100 transform hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Status</p>
                <p className="text-lg font-bold text-gray-900">
                  {donorData.isAvailable ? 'Available' : 'Unavailable'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donor Profile Section */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-red-100 transform hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Donor Profile</h3>
            </div>

            <form onSubmit={handleDonorSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Blood Type
                </label>
                {user.donorProfile && user.donorProfile.bloodType ? (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-gradient-to-br from-red-50 to-pink-50 px-6 py-4 rounded-xl border-2 border-red-200">
                      <p className="text-3xl font-black text-red-600 text-center">
                        {user.donorProfile.bloodType} 🔒
                      </p>
                    </div>
                  </div>
                ) : (
                  <select
                    name="bloodType"
                    value={donorData.bloodType}
                    onChange={handleDonorChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-200 transition-all duration-300 font-semibold"
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                )}
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <input
                  type="checkbox"
                  id="isAvailable"
                  name="isAvailable"
                  checked={donorData.isAvailable}
                  onChange={handleDonorChange}
                  className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="isAvailable" className="text-sm font-bold text-gray-900">
                  I'm available to donate
                </label>
              </div>

              <button
                type="submit"
                className="group relative w-full px-6 py-4 font-black text-white overflow-hidden rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative">Save Profile</span>
              </button>
              {donorMessage && (
                <p className="text-center text-sm font-semibold animate-pulse">{donorMessage}</p>
              )}
            </form>

            <button
              onClick={handleUpdateLocation}
              className="w-full mt-6 px-6 py-4 font-black text-white bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <MapPin className="inline w-5 h-5 mr-2" />
              Update Live Location
            </button>
            {message && (
              <p className="mt-3 text-center text-sm font-semibold animate-pulse">{message}</p>
            )}
          </div>

          {/* Blood Request Section */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-red-100 transform hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg animate-pulse">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Request Blood</h3>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Required Blood Type
                </label>
                <select
                  name="bloodType"
                  onChange={handleRequestChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-200 transition-all duration-300 font-semibold"
                >
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <button
                type="submit"
                className="group relative w-full px-6 py-4 font-black text-white overflow-hidden rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-700 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative">Submit Urgent Request</span>
              </button>
              {requestMessage && (
                <p className="text-center text-sm font-semibold animate-pulse">{requestMessage}</p>
              )}
            </form>

            {foundDonors.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-black text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-green-600" />
                  Donors Found
                </h4>
                {foundDonors.map(donor => (
                  <div key={donor.id} className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 transform hover:scale-105 transition-all duration-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{donor.displayName}</p>
                        <p className="text-sm text-gray-600">{donor.city}, {donor.state}</p>
                      </div>
                      <a href={`tel:${donor.phone}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-300">
                        📞 {donor.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nearby Requests Section */}
        {relevantRequests.length > 0 && (
          <div className="mt-6 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-blue-100 transform hover:scale-[1.01] transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Nearby Blood Requests</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relevantRequests.map((req) => (
                <div
                  key={req._id}
                  className="group relative p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 transform hover:scale-105 hover:shadow-xl transition-all duration-300"
                >
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 text-xs font-black text-white bg-red-500 rounded-full">
                      URGENT
                    </span>
                  </div>
                  <p className="text-3xl font-black text-red-600 mb-2">{req.bloodType}</p>
                  <p className="font-bold text-gray-900">{req.recipient.displayName}</p>
                  <p className="text-sm text-gray-600">{req.recipient.city}, {req.recipient.state}</p>
                  <p className="text-xs text-gray-500 mt-3">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blood Banks Section */}
        <div className="mt-6 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-200 transform hover:scale-[1.01] transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Register with a Blood Bank</h3>
            </div>
            
            <div className="mt-4 space-y-4">
              {bloodBanks.length > 0 ? bloodBanks.map(bank => {
                // Determine the user's status with this specific bank
                const isRegistered = user.bloodBank === bank._id;
                const isPending = user.pendingBankRequest === bank._id;
                const hasOtherCommitment = user.bloodBank || user.pendingBankRequest;

                return (
                  <div key={bank._id} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 flex justify-between items-center transform hover:scale-105 transition-transform duration-300">
                    <div>
                      <p className="font-bold text-lg text-gray-800">{bank.name}</p>
                      <p className="text-sm text-gray-600">{bank.city}, {bank.state}</p>
                    </div>
                    <div className="text-right">
                      {isRegistered ? (
                        <span className="px-5 py-2 text-sm font-bold text-white bg-green-500 rounded-lg shadow-md">✅ Registered</span>
                      ) : isPending ? (
                        <span className="px-5 py-2 text-sm font-bold text-white bg-yellow-500 rounded-lg shadow-md">Pending</span>
                      ) : (
                        <button
                          onClick={() => handleRegisterWithBank(bank._id)}
                          className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          disabled={hasOtherCommitment || bankMessage.id === bank._id}
                        >
                          Register
                        </button>
                      )}
                      {bankMessage.id === bank._id && <p className="text-xs text-center mt-1 font-semibold">{bankMessage.msg}</p>}
                    </div>
                  </div>
                );
              }) : <p className="text-center text-gray-500">No registered blood banks found nearby.</p>}
            </div>

          </div>

      </main>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;