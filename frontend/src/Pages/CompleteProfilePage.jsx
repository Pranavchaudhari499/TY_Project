import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, Droplets, Phone, MapPin } from 'lucide-react';

const CompleteProfilePage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        bloodGroup: '',
        phone: '',
        city: '',
        state: '',
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // We are using the profile update route we created earlier
            const profileData = {
                bloodGroup: formData.bloodGroup,
                phone: formData.phone,
                address: {
                    city: formData.city,
                    state: formData.state,
                },
                role: 'donor', // Set a default role
            };

            await axios.put('http://localhost:5000/api/profile', profileData, config);

            // On success, redirect to the main dashboard
            navigate('/dashboard');

        } catch (err) {
            setError('Failed to update profile. Please try again.');
            console.error('Profile update failed:', err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <UserPlus className="w-12 h-12 mx-auto text-red-500" />
                    <h2 className="mt-4 text-3xl font-bold text-gray-900">
                        Just one more step...
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Please provide these additional details to complete your profile.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    
                    {/* Blood Group */}
                    <div className="relative">
                        <Droplets className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                        <select name="bloodGroup" onChange={handleChange} required className="input-style pl-10">
                            <option value="">Select Your Blood Group</option>
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

                    {/* Phone Number */}
                    <div className="relative">
                        <Phone className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                        <input type="tel" name="phone" placeholder="Phone Number" onChange={handleChange} required className="input-style pl-10" />
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                             <MapPin className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                             <input type="text" name="city" placeholder="City" onChange={handleChange} required className="input-style pl-10" />
                        </div>
                        <div className="relative">
                            <MapPin className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                             <input type="text" name="state" placeholder="State" onChange={handleChange} required className="input-style pl-10" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Complete Profile & Continue
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfilePage;