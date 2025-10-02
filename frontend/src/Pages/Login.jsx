import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Your backend API endpoint for login
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      // Assuming the backend sends a token and user data
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // --- MERGED CODE STARTS HERE ---
      const userRole = response.data.user.role;
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'bloodbank_admin') {
        // You'll need to create this page next
        navigate('/blood-bank/dashboard');
      } else {
        navigate('/dashboard');
      }
      // --- MERGED CODE ENDS HERE ---

    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-red-600">Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
          <input type="password" name="password" placeholder="Password" onChange={handleChange} required className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400">
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-red-600 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

