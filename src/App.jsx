import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerPage from './components/CustomerPage';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Default Route: Landing Page for Table Selection */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Customer Route: /table/1, /table/2, etc. */}
        <Route path="/table/:tableId" element={<CustomerPage />} />
        
        {/* Admin Route: /admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Catch-all */}
        <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}>Halaman tidak ditemukan.</div>} />
      </Routes>
    </Router>
  );
}

export default App;
