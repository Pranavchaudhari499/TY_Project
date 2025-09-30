// client/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');

  // Blood request states
  const [requestData, setRequestData] = useState({ bloodType: '' });
  const [requestMessage, setRequestMessage] = useState('');
  const [foundDonors, setFoundDonors] = useState([]); // NEW (list of donors after request)

  // Donor profile states
  const [donorData, setDonorData] = useState({ bloodType: '', isAvailable: true });
  const [donorMessage, setDonorMessage] = useState('');

  // Requests relevant to donor
  const [relevantRequests, setRelevantRequests] = useState([]); // NEW
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

    // Fetch relevant requests if user is a donor
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

    fetchRelevantRequests();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  // --- LOCATION UPDATE ---
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

  // --- BLOOD REQUEST ---
  const handleRequestChange = (e) => {
    setRequestData({ ...requestData, [e.target.name]: e.target.value });
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setFoundDonors([]); // clear old results
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
        setFoundDonors(res.data.donors || []); // save donors
      } catch (err) {
        setRequestMessage('❌ Error creating request.');
      }
    });
  };

  // --- DONOR PROFILE FORM ---
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-4 bg-white shadow-md">
        <h1 className="text-xl font-bold text-red-600">BloodBridge Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 font-semibold text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white"
        >
          Logout
        </button>
      </nav>

      {/* Main Content */}
      <main className="p-8">
        <div className="max-w-4xl p-6 mx-auto bg-white rounded-lg shadow space-y-8">
          <h2 className="text-2xl font-bold">Welcome, {user.displayName}!</h2>
          <p className="mt-2 text-gray-600">
            Here is the information from your profile.
          </p>

          {/* Profile Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold">Email</h3>
              <p>{user.email}</p>
            </div>
            <div>
              <h3 className="font-semibold">Gender</h3>
              <p>{user.gender}</p>
            </div>
            <div>
              <h3 className="font-semibold">City</h3>
              <p>{user.city}</p>
            </div>
            <div>
              <h3 className="font-semibold">State</h3>
              <p>{user.state}</p>
            </div>
            <div>
              <h3 className="font-semibold">Weight</h3>
              <p>{user.weight} kg</p>
            </div>
            <div>
              <h3 className="font-semibold">Registered Coordinates</h3>
              <p className="text-sm">
                Lon: {user.location.coordinates[0]}, Lat:{' '}
                {user.location.coordinates[1]}
              </p>
            </div>
          </div>

          {/* Donor Profile Form */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-bold text-red-600">My Donor Profile</h3>
            <p className="text-sm text-gray-500 mb-4">
              Set your blood type to become a searchable donor.
            </p>
            <form onSubmit={handleDonorSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bloodType" className="block font-semibold">
                    Your Blood Type
                  </label>
                  <select
                    name="bloodType"
                    value={donorData.bloodType}
                    onChange={handleDonorChange}
                    required
                    className="w-full mt-1 px-4 py-2 border rounded-md"
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
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    name="isAvailable"
                    checked={donorData.isAvailable}
                    onChange={handleDonorChange}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isAvailable"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Available to Donate
                  </label>
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Save Donor Info
              </button>
              {donorMessage && <p className="text-sm">{donorMessage}</p>}
            </form>
          </div>

          {/* Nearby Requests for Donors */}
          {relevantRequests.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-blue-600">Nearby Blood Requests</h3>
              <div className="mt-4 space-y-4">
                {relevantRequests.map((req) => (
                  <div key={req._id} className="p-4 bg-blue-50 rounded-lg">
                    <p className="font-bold text-lg">
                      <span className="text-red-600">{req.bloodType}</span> Blood Needed
                    </p>
                    <p className="text-sm text-gray-700">
                      Requested by: {req.recipient.displayName} in {req.recipient.city}, {req.recipient.state}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Posted on: {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Update */}
          <div className="mt-6 border-t pt-4">
            <button
              onClick={handleUpdateLocation}
              className="px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Update Live Location
            </button>
            {message && <p className="mt-2 text-sm">{message}</p>}
          </div>

          {/* Urgent Blood Request Form */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-xl font-bold text-red-600">Request Blood Urgently</h3>
            <form onSubmit={handleRequestSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="bloodType" className="block font-semibold">
                  Required Blood Type
                </label>
                <select
                  name="bloodType"
                  id="bloodType"
                  onChange={handleRequestChange}
                  required
                  className="w-full mt-1 px-4 py-2 border rounded-md"
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
                className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Submit Urgent Request
              </button>
              {requestMessage && (
                <p className="mt-2 text-sm text-center">{requestMessage}</p>
              )}
            </form>

            {/* Found Donors List */}
            {foundDonors.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold">Potential Donors Found Nearby:</h4>
                <ul className="mt-2 space-y-3">
                  {foundDonors.map((donor) => (
                    <li key={donor.id} className="p-3 bg-gray-100 rounded-md">
                      <p className="font-bold">{donor.displayName}</p>
                      <p className="text-sm text-gray-600">
                        {donor.city}, {donor.state}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
