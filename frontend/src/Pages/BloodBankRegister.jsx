// frontend/src/pages/BloodBankRegister.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const BloodBankRegister = () => {
  const [formData, setFormData] = useState({
    bankName: '',
    city: '',
    state: '',
    adminName: '',
    email: '',
    password: '',
    location: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          location: {
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude],
          },
        });
        alert('Location captured successfully!');
      },
      (err) => setError('Could not get location. Please enable location services.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location) {
      setError('Please provide your blood bank\'s location.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:5000/api/blood-banks/register', formData);
      alert('Registration successful! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-red-600">Register Your Blood Bank</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="border p-4 rounded-md">
            <legend className="text-lg font-semibold">Blood Bank Details</legend>
            <input type="text" name="bankName" placeholder="Blood Bank Name" onChange={handleChange} required className="w-full mt-2 px-4 py-2 border rounded-md" />
            <div className="flex space-x-4 mt-4">
              <input type="text" name="city" placeholder="City" onChange={handleChange} required className="w-full px-4 py-2 border rounded-md" />
              <input type="text" name="state" placeholder="State" onChange={handleChange} required className="w-full px-4 py-2 border rounded-md" />
            </div>
          </fieldset>
          <fieldset className="border p-4 rounded-md">
            <legend className="text-lg font-semibold">Administrator Details</legend>
            <input type="text" name="adminName" placeholder="Administrator's Full Name" onChange={handleChange} required className="w-full mt-2 px-4 py-2 border rounded-md" />
            <input type="email" name="email" placeholder="Administrator's Email" onChange={handleChange} required className="w-full mt-4 px-4 py-2 border rounded-md" />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} required className="w-full mt-4 px-4 py-2 border rounded-md" />
          </fieldset>
          <div className="flex items-center space-x-4">
            <button type="button" onClick={handleGetLocation} className="w-full px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
              Get Bank Location
            </button>
            {formData.location && <span className="text-green-500">✅</span>}
          </div>
          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700">
            {loading ? 'Registering...' : 'Register Blood Bank'}
          </button>
        </form>
         <p className="text-sm text-center text-gray-600">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-red-600 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default BloodBankRegister;