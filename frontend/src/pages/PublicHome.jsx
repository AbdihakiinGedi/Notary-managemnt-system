import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  ShieldCheck, 
  Search, 
  FileText, 
  Globe, 
  Lock, 
  Activity, 
  CheckCircle2, 
  ArrowRight,
  FileSignature,
  Landmark,
  User
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

export default function PublicHome() {
  const [certId, setCertId] = useState('');
  const navigate = useNavigate();

  const handleVerify = (e) => {
    e.preventDefault();
    if (certId.trim()) {
      navigate(`/verify/${encodeURIComponent(certId)}`);
    } else {
      navigate('/verify');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col font-sans">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-registryLight dark:bg-slate-950 pt-24 pb-32 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">

            <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Somali National <br/> Property Registry
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              The official, secure, and transparent ledger for property registration, title deeds, and asset ownership verification.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mt-12 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
              <form onSubmit={handleVerify} className="relative flex items-center">
                <Search className="absolute left-6 text-slate-400" size={24} />
                <input 
                  type="text" 
                  placeholder="Enter Certificate Number to Verify..."
                  className="w-full h-16 pl-16 pr-40 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-registryBlue/20"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                />
                <button type="submit" className="absolute right-2 h-12 bg-registryBlue hover:bg-[#152C69] text-white px-8 rounded-lg font-semibold text-base transition-colors shadow-sm flex items-center gap-2">
                  Verify Now <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </section>



        {/* Public Trust Section */}
        <section className="max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Institutional Trust & Security</h3>
            <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto text-lg">SNDNPRS employs state-of-the-art cryptographic hashing and strict role-based access to ensure property records are immutable and fully verifiable.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { title: 'Cryptographic Proof', icon: Lock, desc: 'Every title deed is sealed with a unique SHA-256 hash, mathematically preventing unauthorized alterations or tampering.' },
              { title: 'Public Verification', icon: Globe, desc: 'Anyone can instantly verify the authenticity of a property certificate using our open verification portal, increasing market trust.' },
              { title: 'Official Oversight', icon: CheckCircle2, desc: 'All property transfers require digital signatures from authorized notaries and registry officers before completion.' }
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-10 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-center hover:shadow-md transition-shadow">
                <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center text-registryBlue dark:text-blue-400 mb-6 border border-blue-100">
                  <feature.icon size={36} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h4>
                <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Landmark size={28} className="text-registryBlue dark:text-blue-400" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">Notario Registry</span>
            </div>
            <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400">The official property registry system dedicated to securing asset ownership through immutable records and cryptographic verification.</p>
          </div>
          <div>
            <h5 className="text-slate-900 dark:text-white font-bold mb-6">Services</h5>
            <ul className="space-y-4 text-base font-medium">
              <li><Link to="/verify" className="hover:text-registryBlue dark:hover:text-blue-400 dark:text-blue-400 transition-colors">Verify Certificate</Link></li>
              <li><Link to="/login" className="hover:text-registryBlue dark:hover:text-blue-400 dark:text-blue-400 transition-colors">Track Property</Link></li>
              <li><Link to="/register" className="hover:text-registryBlue dark:hover:text-blue-400 dark:text-blue-400 transition-colors">Citizen Registration</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-slate-900 dark:text-white font-bold mb-6">Legal</h5>
            <ul className="space-y-4 text-base font-medium">
              <li><Link to="/privacy-policy" className="hover:text-registryBlue dark:hover:text-blue-400 dark:text-blue-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-registryBlue dark:hover:text-blue-400 dark:text-blue-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/about" className="hover:text-registryBlue dark:hover:text-blue-400 dark:text-blue-400 transition-colors">Government Mandate</Link></li>
            </ul>
          </div>
          <div>
             <h5 className="text-slate-900 dark:text-white font-bold mb-6">Contact</h5>
             <p className="text-base font-medium mb-2">support@registry.gov.so</p>
             <p className="text-base font-medium text-slate-500 dark:text-slate-400">Mogadishu, Somalia</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-base font-medium text-center text-slate-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} Somali National Property Registry System. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
