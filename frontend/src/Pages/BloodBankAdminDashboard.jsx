import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BloodBankAdminDashboard = () => {
  const [bankData, setBankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmationStatus, setConfirmationStatus] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
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
        
        console.log('Dashboard API Response:', res.data); // Debug log
        
        // Enhanced data transformation to handle multiple structures
        const transformedData = {
          ...res.data,
          // Ensure pendingRegistrations is always an array with proper structure
          pendingRegistrations: Array.isArray(res.data.pendingRegistrations) 
            ? res.data.pendingRegistrations.map(reg => {
                // Handle different data structures - registration contains user data
                const userData = reg.user || reg;
                
                return {
                  ...reg,
                  user: userData,
                  _id: reg._id || userData._id, // Use registration ID if available
                  displayName: userData.displayName,
                  email: userData.email,
                  phone: userData.phone,
                  city: userData.city,
                  state: userData.state,
                  donorProfile: userData.donorProfile || {},
                  bloodReport: reg.bloodReport || userData.bloodReport,
                  aiAnalysis: reg.aiAnalysis || userData.aiAnalysis,
                  analyzedAt: reg.analyzedAt || userData.analyzedAt,
                  // Include file uploads if they exist
                  files: reg.files || userData.files || []
                };
              })
            : []
        };
        
        console.log('Transformed Data:', transformedData); // Debug log
        setBankData(transformedData);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please log in again.');
        console.error('Dashboard fetch error:', err);
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
    
    // Use the correct API endpoint
    const endpoint = `http://localhost:5000/api/blood-banks/blood-bank-admin/registrations/${userId}/${action}`;
    
    console.log('Making API call to:', endpoint);
    
    const res = await axios.post(endpoint, {}, config);
    
    // Minimal transformation to ensure frontend compatibility
    const transformedData = {
      ...res.data,
      pendingRegistrations: Array.isArray(res.data.pendingRegistrations) 
        ? res.data.pendingRegistrations.map(reg => ({
            ...reg,
            // Ensure we have the basic fields the frontend expects
            _id: reg._id || (reg.user?._id || reg.user),
            displayName: reg.user?.displayName || reg.displayName,
            email: reg.user?.email || reg.email,
          }))
        : []
    };
    
    setBankData(transformedData);
    alert(`Registration ${action}d successfully!`);
  } catch (err) {
    console.error(`Failed to ${action} registration:`, err);
    console.error('Error details:', err.response?.data);
    alert(`Could not ${action} the request. Check console for details.`);
  }
};


  const handleConfirmDonation = async (userId) => {
  if (!window.confirm("Are you sure you want to confirm a donation for this user?")) return;

  try {
    const token = localStorage.getItem('authToken');
    const config = { headers: { 'x-auth-token': token } };
    
    const res = await axios.post(
      'http://localhost:5000/api/blood-banks/blood-bank-admin/confirm-donation', 
      { userId }, 
      config
    );
    
    // Refresh the dashboard data to get updated user information
    const dashboardRes = await axios.get('http://localhost:5000/api/blood-banks/dashboard', config);
    setBankData(dashboardRes.data);
    
    alert('Donation confirmed successfully!');
  } catch (err) {
    console.error('Failed to confirm donation:', err);
    alert('Failed to confirm donation. Please try again.');
  }
};

  const handleAnalyzeReport = async (userId, reportUrl) => {
    if (!window.confirm("Analyze this blood report using AI? This will extract blood type and health parameters.")) return;
    
    setAnalyzing(true);
    try {
      const token = localStorage.getItem('authToken');
      const config = { headers: { 'x-auth-token': token } };
      
      const res = await axios.post(
        'http://localhost:5000/api/blood-banks/blood-bank-admin/analyze-report',
        { reportUrl, userId },
        config
      );
      
      setAnalysisResult(res.data.analysis);
      
      // Refresh dashboard data to show updated analysis results
      const dashboardRes = await axios.get('http://localhost:5000/api/blood-banks/dashboard', config);
      
      // Transform the refreshed data
      const transformedData = {
        ...dashboardRes.data,
        pendingRegistrations: Array.isArray(dashboardRes.data.pendingRegistrations) 
          ? dashboardRes.data.pendingRegistrations.map(reg => {
              const userData = reg.user || reg;
              return {
                ...reg,
                user: userData,
                _id: reg._id || userData._id,
                displayName: userData.displayName,
                email: userData.email,
                phone: userData.phone,
                city: userData.city,
                state: userData.state,
                donorProfile: userData.donorProfile || {},
                bloodReport: reg.bloodReport,
                aiAnalysis: reg.aiAnalysis,
                analyzedAt: reg.analyzedAt,
                files: reg.files || []
              };
            })
          : []
      };
      
      setBankData(transformedData);
      alert('Report analyzed successfully! Blood type and health parameters extracted.');
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Failed to analyze report. Please try again.');
    } finally {
      setAnalyzing(false);
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
        {/* Debug Section - Remove this after fixing */}
        <div className="bg-yellow-100 p-4 rounded-lg mb-4">
          <h4 className="font-bold">Debug Info:</h4>
          <p>Pending Registrations Count: {bankData?.pendingRegistrations?.length}</p>
          <p>First Registration Data: {JSON.stringify(bankData?.pendingRegistrations?.[0])}</p>
        </div>

        {/* Pending Requests Section - UPDATED */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Pending Registration Requests ({bankData?.pendingRegistrations?.length || 0})</h3>
          <div className="space-y-4">
            {bankData?.pendingRegistrations?.length > 0 ? (
              bankData.pendingRegistrations.map(registration => {
                // Handle both direct user objects and populated user objects
                const userData = registration.user || registration;
                const userId = userData._id || registration._id;
                
                return (
                  <div key={registration._id || userId} className="p-4 border rounded-md">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-lg">{userData.displayName}</p>
                        <p className="text-sm text-gray-600">{userData.email}</p>
                        <div className="mt-2 text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <span><strong>Blood Type:</strong> {userData.donorProfile?.bloodType || 'Not specified'}</span>
                          <span><strong>City:</strong> {userData.city || 'N/A'}</span>
                          <span><strong>State:</strong> {userData.state || 'N/A'}</span>
                          <span><strong>Phone:</strong> {userData.phone || 'N/A'}</span>
                        </div>
                        
                        {/* Display uploaded files */}
                        {registration.files && registration.files.length > 0 && (
                          <div className="mt-3">
                            <p className="font-semibold text-sm">Uploaded Files:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {registration.files.map((file, index) => (
                                <button
                                  key={index}
                                  onClick={() => window.open(file.url, '_blank')}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                  {file.name || `File ${index + 1}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {/* View Report Button - Only show if blood report exists */}
                        {registration.bloodReport && (
                          <button 
                            onClick={() => window.open(registration.bloodReport, '_blank')}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            View Report
                          </button>
                        )}
                        
                        {/* AI Analyze Button - Only show if blood report exists */}
                        {registration.bloodReport && (
                          <button 
                            onClick={() => handleAnalyzeReport(userId, registration.bloodReport)}
                            disabled={analyzing}
                            className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-purple-300 transition-colors"
                          >
                            {analyzing ? 'Analyzing...' : 'AI Analyze'}
                          </button>
                        )}
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleRegistration(userId, 'approve')} 
                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRegistration(userId, 'reject')} 
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Display AI Analysis Results */}
                    {registration.aiAnalysis && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="font-bold text-green-800 mb-2">AI Analysis Results:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p><strong>Blood Type:</strong> <span className={`font-bold ${registration.aiAnalysis.bloodType ? 'text-green-600' : 'text-red-600'}`}>
                              {registration.aiAnalysis.bloodType || 'Not detected'}
                            </span></p>
                            <p><strong>Eligibility:</strong> <span className={`font-bold ${registration.aiAnalysis.eligibility === 'eligible' ? 'text-green-600' : 'text-red-600'}`}>
                              {registration.aiAnalysis.eligibility?.toUpperCase() || 'Unknown'}
                            </span></p>
                            <p><strong>Hemoglobin:</strong> {registration.aiAnalysis.hemoglobin?.value} {registration.aiAnalysis.hemoglobin?.unit} 
                              <span className={`ml-2 ${registration.aiAnalysis.hemoglobin?.status === 'normal' ? 'text-green-600' : 'text-red-600'}`}>
                                ({registration.aiAnalysis.hemoglobin?.status})
                              </span>
                            </p>
                          </div>
                          <div>
                            {registration.aiAnalysis.platelets && (
                              <p><strong>Platelets:</strong> {registration.aiAnalysis.platelets.value?.toLocaleString()} {registration.aiAnalysis.platelets.unit}
                                <span className={`ml-2 ${registration.aiAnalysis.platelets.status === 'normal' ? 'text-green-600' : 'text-red-600'}`}>
                                  ({registration.aiAnalysis.platelets.status})
                                </span>
                              </p>
                            )}
                            {registration.aiAnalysis.summary && (
                              <p><strong>Summary:</strong> {registration.aiAnalysis.summary}</p>
                            )}
                            {registration.aiAnalysis.notes && (
                              <p><strong>Notes:</strong> {registration.aiAnalysis.notes}</p>
                            )}
                          </div>
                        </div>
                        {registration.analyzedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Analyzed on: {new Date(registration.analyzedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Show analysis status if no results yet but report exists */}
                    {registration.bloodReport && !registration.aiAnalysis && (
                      <div className="mt-2 text-sm text-blue-600">
                        <p>📄 Blood report available - Click "AI Analyze" to extract health parameters</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500">No pending requests.</p>
            )}
          </div>
        </section>

        {/* Registered Donors Section */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Registered Donors ({bankData?.registeredDonors?.length || 0})</h3>
          {bankData?.registeredDonors?.length > 0 ? (
            <div className="space-y-3">
              {bankData.registeredDonors.map(user => {
                // Check if user has donated recently (within the last 24 hours)
                const lastDonation = user.donorProfile?.lastDonatedOn;
                const hasDonatedRecently = lastDonation && 
                  (new Date() - new Date(lastDonation)) < 24 * 60 * 60 * 1000;
                
                // Check if user has donated at this blood bank specifically
                const hasDonationHistory = user.donorProfile?.donationHistory?.some(donation => 
                  donation.bloodBank && donation.bloodBank.toString() === bankData._id
                );

                const canDonate = !hasDonatedRecently;

                return (
                  <div key={user._id} className="p-3 border rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-bold">{user.displayName} ({user.donorProfile?.bloodType || 'N/A'})</p>
                      <p className="text-sm text-gray-600">{user.email} - {user.city}</p>
                      {user.donorProfile?.lastDonatedOn && (
                        <p className="text-xs text-gray-500">
                          Last donation: {new Date(user.donorProfile.lastDonatedOn).toLocaleDateString()}
                        </p>
                      )}
                      {user.donorProfile?.totalDonations > 0 && (
                        <p className="text-xs text-green-600 font-semibold">
                          Total donations: {user.donorProfile.totalDonations}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => handleConfirmDonation(user._id)}
                      disabled={!canDonate}
                      className={`px-3 py-1 text-sm text-white rounded transition-colors ${
                        !canDonate 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {!canDonate ? '✅ Donated Recently' : 'Confirm Donation'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No donors have been approved yet.</p>
          )}
       </section>

        {/* Blood Stock Management Section */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Blood Stock Management</h3>
          {bankData?.stock ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(bankData.stock).map(([bloodType, quantity]) => (
                <div key={bloodType} className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${
                    quantity > 5 ? 'text-green-600' : quantity > 2 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {quantity}
                  </div>
                  <div className="text-sm text-gray-600">{bloodType}</div>
                  <div className="text-xs text-gray-500">units available</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Stock management features coming soon.</p>
          )}
        </section>

        {/* AI Analysis Summary Section */}
        {analysisResult && (
          <section className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
            <h3 className="text-xl font-semibold mb-4 text-purple-700">Latest AI Analysis</h3>
            <div className="bg-purple-50 p-4 rounded-md">
              <h4 className="font-bold text-purple-800">Summary for {analysisResult.bloodType || 'Unknown'} Blood Type</h4>
              <p className="text-sm text-purple-700 mt-2">{analysisResult.summary}</p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Hemoglobin:</strong> {analysisResult.hemoglobin?.value} {analysisResult.hemoglobin?.unit}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 ${analysisResult.hemoglobin?.status === 'normal' ? 'text-green-600' : 'text-red-600'}`}>
                      {analysisResult.hemoglobin?.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p><strong>Eligibility:</strong> 
                    <span className={`ml-2 font-bold ${analysisResult.eligibility === 'eligible' ? 'text-green-600' : 'text-red-600'}`}>
                      {analysisResult.eligibility?.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default BloodBankAdminDashboard;