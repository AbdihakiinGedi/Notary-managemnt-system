import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { LanguageContext } from '../contexts/LanguageContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { Bell, ChevronRight, Menu, Landmark, ChevronDown, User, LogOut, Settings, Sun, Moon, Globe } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Header({ toggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { language, toggleLanguage, t } = useContext(LanguageContext);
  const { unreadCount } = useContext(NotificationContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const parts = path.split('/').filter(p => p);
    if (parts.length === 0) return [{ name: 'Dashboard', path: '/' }];
    
    const crumbs = [];
    parts.forEach((part, idx) => {
      crumbs.push({
        name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
        path: '/' + parts.slice(0, idx + 1).join('/'),
        active: idx === parts.length - 1
      });
    });
    return crumbs;
  };

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar} 
          className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        
        {/* Registry Logo */}
        <Link to="/" className="flex items-center gap-3 mr-4">
          <div className="w-8 h-8 bg-registryBlue rounded flex items-center justify-center text-white border-b-2 border-registryGold shadow-sm">
            <Landmark size={16} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-none">Notario Registry</h1>
            <p className="text-[9px] font-bold text-registryGold mt-0.5 uppercase tracking-wider">Official Ledger</p>
          </div>
        </Link>

        {/* Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
          {getBreadcrumbs().map((crumb, idx) => (
            <React.Fragment key={crumb.name}>
              {idx > 0 && <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />}
              {crumb.active ? (
                <span className="text-base font-bold text-registryBlue tracking-normal">{crumb.name}</span>
              ) : (
                <Link to={crumb.path} className="text-base font-semibold text-slate-500 dark:text-slate-400 hover:text-registryBlue transition-colors tracking-normal">
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors font-semibold text-base"
          title="Toggle Language"
        >
          <Globe size={20} />
          <span className="hidden sm:inline">{language === 'en' ? 'English' : 'Soomaali'}</span>
        </button>
        
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <Link 
          to="/notifications" 
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 relative transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white"></span>
          )}
        </Link>
        </div>
        
        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 pl-3 md:pl-5 border-l border-slate-200 dark:border-slate-800 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{user?.name || user?.full_name}</p>
              <p className="text-sm font-semibold text-registryGold mt-1 uppercase tracking-wider">{user?.role}</p>
            </div>
            <div className="w-9 h-9 bg-registryBlue rounded-lg flex items-center justify-center text-white text-base font-bold shadow-sm border border-[#152C69] overflow-hidden">
              {user?.profile_photo ? (
                <img src={`http://localhost:5001${user.profile_photo}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (user?.name || user?.full_name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-56 max-h-[calc(100vh-80px)] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-2 z-50 animate-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 sm:hidden">
                <p className="text-base font-bold text-slate-900 dark:text-white">{user?.name || user?.full_name}</p>
                <p className="text-sm font-semibold text-registryGold uppercase mt-1">{user?.role}</p>
              </div>
              <Link 
                to="/profile" 
                className="flex items-center gap-3 px-4 py-2.5 text-base font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <User size={16} /> {t('profile')}
              </Link>
              <Link 
                to={user?.role === 'admin' ? "/admin/settings" : "/settings"} 
                className="flex items-center gap-3 px-4 py-2.5 text-base font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <Settings size={16} /> {t('settings')}
              </Link>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-base font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} /> {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
