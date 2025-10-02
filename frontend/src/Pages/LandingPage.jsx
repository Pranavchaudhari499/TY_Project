import React from 'react';
import { Link } from 'react-router-dom';

// It's a good practice to use an icon library like react-icons
// To install: npm install react-icons
// Then you can import icons like: import { FaHeartbeat, FaSearchLocation } from 'react-icons/fa';

const LandingPage = () => {
  const features = [
    {
      icon: '📍', // Replace with <FaSearchLocation />
      title: 'Geolocation Matching',
      description: 'Our smart algorithm instantly connects recipients with the nearest eligible donors and blood banks.',
    },
    {
      icon: '📊', // Replace with <FaHeartbeat />
      title: 'Real-Time Stock Info',
      description: 'Blood banks can manage and display their real-time blood stock levels, ensuring up-to-date information.',
    },
    {
      icon: '👤',
      title: 'Role-Based Dashboards',
      description: 'Dedicated dashboards for donors, recipients, and blood bank admins for a clean and focused experience.',
    },
  ];

  const futureScopes = [
    {
      icon: '📈',
      title: 'Admin Analytics',
      description: 'A powerful dashboard for hospital admins to view donation trends, manage users, and export reports.',
    },
    {
      icon: '🔔',
      title: 'Push Notifications',
      description: 'Donors will receive instant, real-time notifications for urgent blood requests in their vicinity.',
    },
    {
      icon: '🤖',
      title: 'AI Chatbot Assistant',
      description: 'An intelligent chatbot to answer FAQs about blood donation, eligibility, and using the app.',
    },
  ];

  return (
    <div className="bg-white text-gray-800">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white bg-opacity-90 shadow-md z-50">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-600">BloodBridge</h1>
          {/* --- MERGED CODE STARTS HERE --- */}
          <div className="space-x-4">
            <Link to="/blood-bank/register" className="text-gray-700 hover:text-red-600">
              For Blood Banks
            </Link>
            <Link to="/login" className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50">
              Log In
            </Link>
            <Link to="/signup" className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">
              Sign Up
            </Link>
          </div>
          {/* --- MERGED CODE ENDS HERE --- */}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=2070&auto=format&fit=crop')" }}>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="text-center z-10 text-white p-4">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-4">Connecting Donors, Saving Lives</h2>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">BloodBridge is a unified platform to streamline blood donation across India, making it faster and easier to find help in emergencies.</p>
          <Link to="/signup" className="px-8 py-3 text-lg font-bold text-white bg-red-600 rounded-full hover:bg-red-700">
            Join Now
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">Our Core Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg text-center">
                <div className="text-4xl text-red-500 mb-4">{feature.icon}</div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future Scope Section */}
      <section id="future-scope" className="py-20">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">What's Coming Next</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {futureScopes.map((scope, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg text-center border-t-4 border-red-500">
                <div className="text-4xl text-red-500 mb-4">{scope.icon}</div>
                <h4 className="text-xl font-semibold mb-2">{scope.title}</h4>
                <p className="text-gray-600">{scope.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2025 BloodBridge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
