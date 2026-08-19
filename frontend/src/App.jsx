import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenDashboard from './pages/citizen/Dashboard';
import OfficerDashboard from './pages/officer/Dashboard';
import PropertyControl from './pages/officer/PropertyControl';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSettings from './pages/admin/AdminSettings';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import AddProperty from './pages/AddProperty';
import Transfers from './pages/Transfers';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import PendingApproval from './pages/citizen/PendingApproval';

import NotaryDashboard from './pages/notary/Dashboard';
import History from './pages/History';
import Reports from './pages/Reports';

import PublicHome from './pages/PublicHome';
import Certificates from './pages/Certificates';
import VerifyCertificate from './pages/public/VerifyCertificate';
import AssetSearch from './pages/AssetSearch';
import OwnershipTimeline from './pages/OwnershipTimeline';
import CitizenFeatureView from './pages/citizen/FeatureView';

import About from './pages/public/About';
import Contact from './pages/public/Contact';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import Terms from './pages/public/Terms';

function AppRoutes() {
  const { user } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const renderDashboard = () => {
    switch (user?.role) {
      case 'citizen': return <CitizenDashboard />;
      case 'officer': return <OfficerDashboard />;
      case 'notary': return <NotaryDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return <Navigate to="/login" />;
    }
  };

  if (user?.role === 'citizen' && ['pending', 'rejected'].includes(user?.account_status)) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900 flex-col">
        <Header />
        <PendingApproval />
        <ToastContainer position="bottom-right" theme="colored" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      {user && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen}
        />
      )}
      <main className={`flex-1 flex flex-col min-w-0 ${user ? 'md:ml-[280px]' : ''}`}>
        {user && (
          <Header 
            toggleSidebar={() => setIsSidebarOpen(true)} 
          />
        )}
        <Routes>
          <Route path="/" element={user ? (
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
              {renderDashboard()}
            </div>
          ) : <PublicHome />} />
          
          {/* Public Full-Width Routes */}
          <Route path="/home" element={<PublicHome />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
          <Route path="/asset-search" element={<AssetSearch />} />
          
          <Route path="/*" element={
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
                <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
                <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
                
                {/* Common Routes */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/history" element={<History />} />
                <Route path="/reports" element={<Reports />} />
                
                {/* Citizen Routes */}
                <Route path="/properties" element={<Properties />} />
                <Route path="/properties/:id" element={<PropertyDetail />} />
                <Route path="/register-asset" element={<AddProperty />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/certificates" element={<Certificates />} />
                
                {/* Role-Specific Dashboard Sub-Routes (Mapped to Dashboards for Tab Handling) */}
                <Route path="/queue" element={<NotaryDashboard />} />
                <Route path="/verification-queue" element={<NotaryDashboard />} />
                <Route path="/transfer-certification" element={<NotaryDashboard />} />
                
                <Route path="/reviews" element={<OfficerDashboard />} />
                <Route path="/land-reviews" element={<OfficerDashboard />} />
                <Route path="/property-control" element={<PropertyControl />} />
                <Route path="/oversight" element={<OfficerDashboard />} />
                <Route path="/flags" element={<OfficerDashboard />} />
                <Route path="/disputes" element={<OfficerDashboard />} />
                
                <Route path="/user-management" element={<AdminDashboard />} />
                <Route path="/admin/health" element={<AdminDashboard />} />
                <Route path="/admin/audit" element={<AdminDashboard />} />
                <Route path="/admin/metrics" element={<AdminDashboard />} />
                <Route path="/system-logs" element={<AdminDashboard />} />
                <Route path="/infrastructure" element={<AdminDashboard />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                
                <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </div>
          } />
        </Routes>
        <ToastContainer position="bottom-right" theme="colored" />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  );
}
