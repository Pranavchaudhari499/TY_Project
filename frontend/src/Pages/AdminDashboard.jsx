// frontend/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const config = { headers: { 'x-auth-token': token } };
        const res = await axios.get('http://localhost:5000/api/admin/users', config);
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <p>Loading users...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Name</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Email</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">City</th>
            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Role</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {users.map(user => (
            <tr key={user._id} className="border-b">
              <td className="text-left py-3 px-4">{user.displayName}</td>
              <td className="text-left py-3 px-4">{user.email}</td>
              <td className="text-left py-3 px-4">{user.city}</td>
              <td className="text-left py-3 px-4">
                <span className={`py-1 px-3 rounded-full text-xs ${
                    user.role === 'admin' ? 'bg-green-200 text-green-800' :
                    user.role === 'bloodbank_admin' ? 'bg-blue-200 text-blue-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                  {user.role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Super Admin Dashboard</h1>
        <button onClick={handleLogout} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
      </header>
      <main className="p-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <UserList />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;