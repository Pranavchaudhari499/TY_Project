import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chatbot from '../components/Chatbot';
import { io } from "socket.io-client";
import { toast } from 'react-toastify';
import { Droplet, MapPin, Heart, Users, Clock, Bell, Activity, Building, MessageSquare, X, Send, Bot, Upload, FileText } from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [requestData, setRequestData] = useState({ bloodType: '' });
  const [requestMessage, setRequestMessage] = useState('');
  const [foundDonors, setFoundDonors] = useState([]);
  const [foundBloodBanks, setFoundBloodBanks] = useState([]); // State for blood banks
  const [donorData, setDonorData] = useState({ bloodType: '', isAvailable: true });
  const [donorMessage, setDonorMessage] = useState('');
  const [relevantRequests, setRelevantRequests] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [bankMessage, setBankMessage] = useState({});
  const [reportFile, setReportFile] = useState(null); // NEW: For blood report upload
  const [targetBank, setTargetBank] = useState(null); // NEW: To know which bank we're registering with
  const [uploadProgress, setUploadProgress] = useState(0); // NEW: Upload progress
  const [isUploading, setIsUploading] = useState(false); // NEW: Upload state
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const socket = useRef();
  const fileInputRef = useRef(null); // NEW: File input reference

  useEffect(() => {
    // Establish socket connection
    socket.current = io("http://localhost:5000");

    // Listen for incoming notifications
    socket.current.on("acceptance-notification", (data) => {
      toast.success(`✅ ${data.donorName} accepted your request! Contact: ${data.donorPhone}`);
    });

    socket.current.on("getNotification", (data) => {
      toast.info(`🔔 ${data.message}`);
    });

    const storedUser = JSON.parse(localStorage.getItem('user'));
    const storedToken = localStorage.getItem('authToken');

    if (!storedUser || !storedToken) {
      navigate('/login');
      return;
    }
    
    setToken(storedToken);
    setUser(storedUser);

    // Identify this user to the socket server
    socket.current.emit("addUser", storedUser._id);

    if (storedUser.donorProfile) {
      setDonorData({
        bloodType: storedUser.donorProfile.bloodType || '',
        isAvailable: storedUser.donorProfile.isAvailable !== false,
      });
    }

    const fetchRelevantRequests = async () => {
      if (storedUser.donorProfile && storedUser.donorProfile.bloodType) {
        try {
          const config = { headers: { 'x-auth-token': storedToken } };
          const res = await axios.get('http://localhost:5000/api/requests/relevant', config);
          setRelevantRequests(res.data);
        } catch (err) {
          console.error('Could not fetch requests:', err);
        }
      }
    };

    const fetchBloodBanks = async () => {
      try {
        const config = { headers: { 'x-auth-token': storedToken } };
        const res = await axios.get('http://localhost:5000/api/blood-banks', config);
        setBloodBanks(res.data);
      } catch (err) {
        console.error("Could not fetch blood banks:", err);
      }
    };

    fetchRelevantRequests();
    fetchBloodBanks();

    // Cleanup on component unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [navigate]);

  const handleLogout = () => {
    if (socket.current) {
      socket.current.disconnect();
    }
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
          const authToken = localStorage.getItem('authToken');
          const config = { headers: { 'x-auth-token': authToken } };
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
    setFoundBloodBanks([]); // Clear previous blood bank results
    setRequestMessage('Searching for donors and blood banks...');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const liveLocation = {
        type: 'Point',
        coordinates: [position.coords.longitude, position.coords.latitude],
      };
      try {
        const authToken = localStorage.getItem('authToken');
        const config = { headers: { 'x-auth-token': authToken } };
        const body = { bloodType: requestData.bloodType, location: liveLocation };
        const res = await axios.post('http://localhost:5000/api/requests', body, config);
        setRequestMessage(`✅ ${res.data.message}`);
        setFoundDonors(res.data.donors || []);
        setFoundBloodBanks(res.data.bloodBanks || []); // Set the blood bank state
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
      const authToken = localStorage.getItem('authToken');
      const config = { headers: { 'x-auth-token': authToken } };
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

  // UPDATED: Enhanced file upload handler
  const handleRegisterWithBank = async (e) => {
    e.preventDefault();
    if (!reportFile) {
        toast.error("Please upload a blood report.");
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(reportFile.type)) {
        toast.error("Please upload a valid file (JPEG, PNG, or PDF).");
        return;
    }

    // Validate file size (5MB limit)
    if (reportFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB.");
        return;
    }

    const formData = new FormData();
    formData.append('bloodReport', reportFile);

    setIsUploading(true);
    setUploadProgress(0);
    setBankMessage({ id: targetBank, msg: 'Uploading blood report...' });
    
    try {
      const token = localStorage.getItem('authToken');
      const config = { 
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      };
      
      // const res = await axios.post(
      //   `http://localhost:5000/api/blood-banks/${targetBank}/register-request`, 
      //   formData, 
      //   config
      // );
      const res = await axios.post(
            `http://localhost:5000/api/blood-banks/${targetBank}/register-request`, 
            formData, 
            config
      );
      
      // Update user state with pending request
      const updatedUser = { ...user, pendingBankRequest: targetBank };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success("Registration request submitted with blood report!");
      setBankMessage({ id: targetBank, msg: `✅ ${res.data.msg}` });
      
      // Close modal after success
      setTimeout(() => {
        setTargetBank(null);
        setReportFile(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.msg || 'Error submitting request. Please try again.';
      setBankMessage({ id: targetBank, msg: `❌ ${errorMsg}` });
      toast.error("Failed to submit registration request.");
      setIsUploading(false);
    }
  };

  // NEW: Handle file selection with better UX
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReportFile(file);
    }
  };

  // NEW: Clear file selection
  const handleClearFile = () => {
    setReportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // NEW: Get file icon based on type
  const getFileIcon = (file) => {
    if (file.type.includes('image')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (file.type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  // --- Handler for responding to requests ---
  const handleRequestResponse = async (requestId, responseStatus) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = { headers: { 'x-auth-token': token } };
      await axios.post(`http://localhost:5000/api/requests/${requestId}/respond`, { status: responseStatus }, config);

      // Remove the request from the list after responding
      setRelevantRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));
      toast.success("Your response has been sent.");

    } catch (err) {
      console.error("Failed to respond to request:", err);
      toast.error("Could not send your response.");
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

            {/* Display Found Donors with ML Scores */}
            {foundDonors.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-black text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-green-600" />
                  Potential Donors Found (Ranked by Availability)
                </h4>
                {foundDonors
                  .filter(donor => donor)
                  .map(donor => (
                    <div key={donor.id} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 transform hover:scale-105 transition-all duration-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{donor.displayName}</p>
                          <p className="text-sm text-gray-600">{donor.city}, {donor.state}</p>
                        </div>
                        <a href={`tel:${donor.phone}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-300">
                          📞 {donor.phone}
                        </a>
                      </div>
                      {/* ML Availability Score Badge */}
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs font-bold text-green-800 bg-green-100 px-3 py-1 rounded-full">
                          {Math.round(donor.availability_score * 100)}% Match
                        </span>
                        <span className="text-xs text-gray-500">
                          {donor.availability_score > 0.8 ? '🔥 Highly Likely' : 
                           donor.availability_score > 0.6 ? '✅ Likely' : 
                           '⚡ Available'}
                        </span>
                      </div>
                    </div>
                ))}
              </div>
            )}

            {/* Display Found Blood Banks */}
            {foundBloodBanks.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-black text-gray-900 flex items-center">
                  <Building className="w-5 h-5 mr-2 text-blue-600" />
                  Nearby Blood Banks with Stock
                </h4>
                {foundBloodBanks.map(bank => (
                  <div key={bank.id} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 transform hover:scale-105 transition-all duration-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{bank.name}</p>
                        <p className="text-sm text-gray-600">{bank.city}, {bank.state}</p>
                      </div>
                      {bank.contactPhone && (
                        <a href={`tel:${bank.contactPhone}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-300">
                          📞 {bank.contactPhone}
                        </a>
                      )}
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
              {relevantRequests
                .filter(req => req && req.recipient)
                .map((req) => (
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
                    {/* NEW: Response Buttons */}
                    <div className="mt-4 space-x-2">
                      <button
                        onClick={() => handleRequestResponse(req._id, 'accepted')}
                        className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-300"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleRequestResponse(req._id, 'unavailable')}
                        className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-300"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {/* Blood Banks Registration Section */}
        <div className="mt-6 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-200 transform hover:scale-[1.01] transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl shadow-lg">
                    <Building className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Register with a Blood Bank</h3>
            </div>
            
            <div className="mt-4 space-y-4">
                {bloodBanks.length > 0 ? bloodBanks.map(bank => {
                    const isRegistered = user.bloodBank === bank._id;
                    const isPending = user.pendingBankRequest === bank._id;
                    const hasOtherCommitment = user.bloodBank || user.pendingBankRequest;

                    return (
                        <div key={bank._id} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 flex justify-between items-center transform hover:scale-105 transition-transform duration-300">
                            <div>
                                <p className="font-bold text-lg text-gray-800">{bank.name}</p>
                                <p className="text-sm text-gray-600">{bank.city}, {bank.state}</p>
                                <p className="text-xs text-gray-500 mt-1">Contact: {bank.contactPhone}</p>
                            </div>
                            <div className="text-right">
                                {isRegistered ? (
                                    <span className="px-5 py-2 text-sm font-bold text-white bg-green-500 rounded-lg shadow-md">✅ Registered</span>
                                ) : isPending ? (
                                    <span className="px-5 py-2 text-sm font-bold text-white bg-yellow-500 rounded-lg shadow-md">Pending Review</span>
                                ) : (
                                    <button
                                        onClick={() => setTargetBank(bank._id)}
                                        className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                                        disabled={hasOtherCommitment || bankMessage.id === bank._id}
                                    >
                                        <Upload className="w-4 h-4" />
                                        Register to Donate
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

      {/* Enhanced Blood Report Upload Modal */}
      {targetBank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-gray-900">Register as Donor</h3>
                    <button 
                        onClick={() => {
                            setTargetBank(null);
                            setReportFile(null);
                            setUploadProgress(0);
                            setIsUploading(false);
                        }}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        disabled={isUploading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleRegisterWithBank} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Upload Blood Report *
                        </label>
                        
                        {!reportFile ? (
                            <div 
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Click to upload blood report</p>
                                <p className="text-xs text-gray-500 mt-1">Supports: JPG, PNG, PDF (Max 5MB)</p>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    onChange={handleFileSelect}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden"
                                    required
                                />
                            </div>
                        ) : (
                            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {getFileIcon(reportFile)}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                                {reportFile.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(reportFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearFile}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        disabled={isUploading}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Upload Progress Bar */}
                    {isUploading && (
                        <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-600 text-center">
                                Uploading... {uploadProgress}%
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => {
                                setTargetBank(null);
                                setReportFile(null);
                                setUploadProgress(0);
                                setIsUploading(false);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={!reportFile || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Submit Request
                                </>
                            )}
                        </button>
                    </div>
                    
                    {bankMessage.id === targetBank && (
                        <p className={`text-sm text-center mt-2 font-medium ${
                            bankMessage.msg.includes('✅') ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {bankMessage.msg}
                        </p>
                    )}
                </form>
            </div>
        </div>
      )}

      {/* RENDER CHATBOT and pass token */}
      {token && <Chatbot token={token} />}

      <style>{`
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
        @keyframes pop-in {
            0% {
                transform: scale(0.5);
                opacity: 0;
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        .animate-pop-in {
            animation: pop-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;