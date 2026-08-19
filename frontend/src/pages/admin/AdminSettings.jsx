import React, { useState, useEffect } from 'react';
import { Shield, Settings, Server, FileText, Bell, Monitor, AlertTriangle, Key } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        setSettings(res.data);
      } catch (err) {
        toast.error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success('Appearance updated successfully.');
  };

  const handleReset = async () => {
    if (window.confirm('CRITICAL WARNING: This will reset all transfers and audit logs to their initial deterministic state. Are you absolutely sure?')) {
      try {
        await api.post('/admin/reset');
        toast.success('System has been reset to deterministic state.');
      } catch (err) {
        toast.error('Failed to reset system.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Admin Settings</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">System configuration and security parameters.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* System Settings */}
        <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Server className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">System Name</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.systemName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">System Status</label>
              <p className="text-base font-medium text-green-600 dark:text-green-400">{settings?.systemStatus}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Maintenance Mode</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.maintenanceMode ? 'ON' : 'OFF'}</p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Shield className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security & Auditing</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Session Timeout</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.sessionTimeout}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Max Login Attempts</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.maxLoginAttempts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Audit Logging</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.auditLogging ? 'ON' : 'OFF'}</p>
            </div>
          </div>
        </div>

        {/* User & Verification Settings */}
        <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Key className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">User & Verification</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">National ID Required</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.nationalIdRequired ? 'ON' : 'OFF'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Citizen Verification Required</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.citizenVerification ? 'ON' : 'OFF'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Transfer Profile Photo</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.transferProfilePhoto ? 'ON' : 'OFF'}</p>
            </div>
          </div>
        </div>

        {/* Document Settings */}
        <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <FileText className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document Processing</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Maximum Upload Size</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.maxUploadSize}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Allowed Formats</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.allowedFormats}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">PDF Generation</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.pdfGeneration ? 'ON' : 'OFF'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">QR Verification</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.qrVerification ? 'ON' : 'OFF'}</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Bell className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Real-time WebSockets</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.realTimeNotifications ? 'ON' : 'OFF'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Registration Events</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.registrationNotifications ? 'ON' : 'OFF'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Transfer Events</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.transferNotifications ? 'ON' : 'OFF'}</p>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Monitor className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Appearance</h2>
          </div>
          <div className="p-6">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 block">Theme Mode</label>
            <div className="flex gap-4">
              <button 
                onClick={() => handleThemeChange('light')} 
                className={`px-4 py-2 rounded-lg font-semibold border ${theme === 'light' ? 'bg-registryBlue text-white border-registryBlue' : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
              >
                Light
              </button>
              <button 
                onClick={() => handleThemeChange('dark')} 
                className={`px-4 py-2 rounded-lg font-semibold border ${theme === 'dark' ? 'bg-registryBlue text-white border-registryBlue' : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
              >
                Dark
              </button>
              <button 
                onClick={() => handleThemeChange('system')} 
                className={`px-4 py-2 rounded-lg font-semibold border ${theme === 'system' ? 'bg-registryBlue text-white border-registryBlue' : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
              >
                System
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Appearance settings are saved locally to this browser.</p>
          </div>
        </div>

        {/* System Information */}
        <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Settings className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Application</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.appVersion}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Engine</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">Node.js {settings?.nodeVersion}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Database</label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{settings?.pgVersion}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Backend Status</label>
              <p className="text-base font-medium text-green-600 dark:text-green-400">Connected</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="inst-card p-0 overflow-hidden border border-red-200 dark:border-red-900 shadow-sm bg-white dark:bg-slate-900 mt-12">
          <div className="bg-red-50 dark:bg-red-900/20 p-5 border-b border-red-200 dark:border-red-900/50 flex items-center gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sovereign System Reset</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                This action is irreversible. It will reset all transfers and audit logs back to their initial deterministic state for the Sovereign Demo.
              </p>
            </div>
            <button 
              onClick={handleReset}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              System Reset
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
