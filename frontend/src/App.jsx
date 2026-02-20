import React from 'react';
import { Routes, Route } from 'react-router-dom'; 
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage'; 
import ReportPage from './pages/ReportPage';
import Trips from './pages/Trips';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/reports" element={<ReportPage />} />
        <Route path="/trips" element={<Trips />} />
      </Routes>
    </Layout>
  );
}

export default App;