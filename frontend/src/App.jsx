import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { useAuth0 } from '@auth0/auth0-react';
import { Loader2 } from 'lucide-react';

// Layout & Auth Pages
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel'; 

// App Pages
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage'; 
import ReportPage from './pages/ReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import Trips from './pages/Trips';
import CustomReportPage from './pages/CustomReportPage';
import MaintenancePage from './pages/MaintenancePage';
import CapacityManager from './pages/CapacityManager';

function App() {
  const { isAuthenticated, isLoading, error } = useAuth0();

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold animate-pulse tracking-wide uppercase">
          Verifying Credentials...
        </p>
      </div>
    );
  }

  // 2. The "Access Denied" or "Not Logged In" State
  // If there's an error (like wrong domain) or they haven't logged in, show the Login Page
  if (!isAuthenticated || error) {
    return <LoginPage />;
  }

  // 3. Success State: User is authenticated and authorized
  return (
    <Layout>
      <Routes>
        {/* Main Dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* admin page for authorization*/}
        <Route path="/admin" element={<AdminPanel />} />
        
        {/*other pages */}
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        
        {/* Reports */}
        <Route path="/reports" element={<ReportPage />} />
        <Route path="/monthly_reports" element={<MonthlyReportPage />} />
        <Route path="/custom_reports" element={<CustomReportPage />} />
        <Route path="/capacity_manager" element={<CapacityManager />} />

        {/* Catch-all: Send any weird URLs back to Dashboard */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;