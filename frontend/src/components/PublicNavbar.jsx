import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, ChevronDown, QrCode, Hash, FileKey, Search, Info, Phone } from 'lucide-react';

export default function PublicNavbar() {
  const [showVerifyDropdown, setShowVerifyDropdown] = useState(false);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4">
          <div className="w-12 h-12 bg-registryBlue rounded-lg flex items-center justify-center text-white shadow-sm border-b-2 border-registryGold">
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Notario Registry</h1>
            <p className="text-sm font-semibold text-registryGold mt-1 uppercase tracking-wider">Official Ledger</p>
          </div>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-8">
          <Link to="/" className="text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-registryBlue dark:hover:text-blue-400 transition-colors">Home</Link>
          
          <div 
            className="relative"
            onMouseEnter={() => setShowVerifyDropdown(true)}
            onMouseLeave={() => setShowVerifyDropdown(false)}
          >
            <button className="flex items-center gap-1 text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-registryBlue dark:hover:text-blue-400 transition-colors py-2">
              Verify <ChevronDown size={16} className={`transition-transform ${showVerifyDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showVerifyDropdown && (
              <div className="absolute top-full -left-4 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-2 z-50">
                <Link to="/verify" className="flex items-center gap-3 px-4 py-2.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400">
                  <QrCode size={18} /> Scan QR
                </Link>
                <Link to="/verify" className="flex items-center gap-3 px-4 py-2.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400">
                  <Hash size={18} /> Certificate Number
                </Link>
                <Link to="/verify" className="flex items-center gap-3 px-4 py-2.5 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400">
                  <FileKey size={18} /> Verification Code
                </Link>
              </div>
            )}
          </div>

          <Link to="/asset-search" className="flex items-center gap-2 text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-registryBlue dark:hover:text-blue-400 transition-colors">
            <Search size={16} /> Search
          </Link>
          
          <Link to="/about" className="text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-registryBlue dark:hover:text-blue-400 transition-colors">About</Link>
          <Link to="/contact" className="text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-registryBlue dark:hover:text-blue-400 transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-registryBlue dark:hover:text-blue-400 transition-colors">Sign In</Link>
          <Link to="/register" className="bg-registryBlue text-white px-5 py-2.5 rounded-lg text-base font-bold hover:bg-[#152C69] transition-colors shadow-sm border-b-2 border-[#0F172A]/20">
            Citizen Portal
          </Link>
        </div>
      </div>
    </header>
  );
}
