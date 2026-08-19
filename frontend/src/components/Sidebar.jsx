import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { LanguageContext } from '../contexts/LanguageContext';
import { 
  LayoutDashboard, Landmark, ArrowRightLeft, Bell, User, ShieldCheck, 
  History, Users, LogOut, Stamp, FileText,
  Settings, X
} from 'lucide-react';
import api from '../services/api';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);
  const { t } = useContext(LanguageContext);

  const getMenuGroups = () => {
    const role = user?.role?.toLowerCase();

    if (role === 'citizen') {
      return [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Properties', path: '/properties', icon: Landmark },
        { name: 'Transfers', path: '/transfers', icon: ArrowRightLeft },
        { name: 'Certificates', path: '/certificates', icon: Stamp },
        { name: 'Reports', path: '/reports', icon: FileText },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
        { name: 'Profile', path: '/profile', icon: User }
      ];
    } 
    
    if (role === 'notary') {
      return [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Verifications', path: '/verification-queue', icon: ShieldCheck },
        { name: 'Certificates', path: '/certificates', icon: Stamp },
        { name: 'Reports', path: '/reports', icon: FileText },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
        { name: 'Profile', path: '/profile', icon: User }
      ];
    } 
    
    if (role === 'officer') {
      return [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'All Properties', path: '/properties', icon: Landmark },
        { name: 'Property Control', path: '/property-control', icon: ShieldCheck },
        { name: 'Transfers Review', path: '/transfers', icon: ArrowRightLeft },
        { name: 'Reports', path: '/reports', icon: FileText },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
      ];
    } 
    
    if (role === 'admin') {
      return [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Users', path: '/user-management', icon: Users },
        { name: 'Registry', path: '/properties', icon: Landmark },
        { name: 'Audit Logs', path: '/admin/audit', icon: History },
        { name: 'Reports', path: '/reports', icon: FileText },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
        { name: 'Profile', path: '/profile', icon: User }
      ];
    }

    return [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Profile', path: '/profile', icon: User }
    ];
  };

  const menuItems = [...new Map(getMenuGroups().map(i => [i.name, i])).values()];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 
        w-[280px] h-[100vh] overflow-hidden bg-white dark:bg-slate-900 border-r border-[#E2E8F0] dark:border-slate-800 flex flex-col
        shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950 shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <Landmark size={24} className="text-registryGold" />
            <h2 className="text-xl font-black text-registryBlue dark:text-blue-400 tracking-widest uppercase">SNDNPRS</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content container */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 flex flex-col justify-start py-6 px-3 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-3 rounded-lg text-base font-semibold transition-all group ${
                  isActive
                    ? 'bg-registryBlue text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span className="truncate whitespace-nowrap flex-1">{t(item.name.toLowerCase().replace(' ', '_'))}</span>
                  
                  {/* Badge */}
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-red-500 text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
          </nav>

          {/* User Footer */}
          <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-3 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="w-10 h-10 min-w-10 bg-registryBlue rounded-full flex items-center justify-center text-white font-bold border-2 border-registryGold shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-base font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-base font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:border-red-200 transition-colors"
          >
            <LogOut size={16} /> {t('logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
