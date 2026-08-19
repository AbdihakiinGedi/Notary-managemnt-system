import React, { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { 
  Landmark, 
  Car, 
  Briefcase, 
  Coins, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  History,
  Stamp,
  FileCheck,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Bell
} from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import formatDate from '../../utils/formatDate';


export default function CitizenDashboard() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [stats, setStats] = useState({
    totalAssets: 0,
    land: 0,
    vehicles: 0,
    shares: 0,
    digital: 0,
    pendingTransfers: 0,
    certificates: 0
  });
  const [recentAssets, setRecentAssets] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();

    // Auto polling
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);

    const handleRefresh = () => {
      fetchDashboardData();
    };
    window.addEventListener('refresh_dashboard_stats', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh_dashboard_stats', handleRefresh);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [assetsRes, transfersRes, certsRes, historyRes] = await Promise.all([
        api.get('/assets/my-assets').catch(() => ({ data: [] })),
        api.get('/assets/transfers').catch(() => ({ data: [] })),
        api.get('/assets/certificates').catch(() => ({ data: [] })),
        api.get('/history').catch(() => ({ data: [] }))
      ]);

      const assets = Array.isArray(assetsRes.data) ? assetsRes.data : [];
      const transfers = Array.isArray(transfersRes.data) ? transfersRes.data : [];
      const certs = Array.isArray(certsRes.data) ? certsRes.data : [];
      const historyData = Array.isArray(historyRes.data) ? historyRes.data : [];

      setStats({
        totalAssets: assets.length,
        land: assets.filter(a => a.type === 'land').length,
        vehicles: assets.filter(a => a.type === 'car' || a.type === 'motorcycle').length,
        shares: assets.filter(a => a.type === 'business_share').length,
        digital: assets.filter(a => a.type === 'digital_asset').length,
        pendingTransfers: transfers.filter(t => t.status !== 'completed' && t.status !== 'rejected').length,
        certificates: certs.length
      });

      setRecentAssets(assets.slice(0, 4));
      setRecentHistory(historyData.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Hero Section */}
      <div className="bg-registryBlue rounded-2xl p-8 md:p-10 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white dark:bg-slate-900 opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800/50 rounded-full text-sm font-semibold border border-blue-700">
            <ShieldCheck size={14} className="text-registryGold" /> Official Citizen Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-blue-100 text-base md:text-base leading-relaxed max-w-xl">
            Manage your registered assets, track transfers, and verify official ownership certificates through the national registry.
          </p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button onClick={() => navigate('/register-asset')} className="bg-white dark:bg-slate-900 text-registryBlue dark:text-blue-400 hover:bg-slate-50 dark:bg-slate-950 px-6 py-3 rounded-lg text-base font-semibold shadow-sm transition-colors flex items-center justify-center gap-2">
            <Plus size={18} /> Register Asset
          </button>
          <button onClick={() => navigate('/transfers')} className="bg-blue-800 text-white hover:bg-blue-700 border border-blue-700 px-6 py-3 rounded-lg text-base font-semibold shadow-sm transition-colors flex items-center justify-center gap-2">
            <ArrowRight size={18} /> Transfer Asset
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Properties Owned', value: stats.totalAssets, icon: Landmark, color: 'text-registryBlue dark:text-blue-400', bg: 'bg-blue-50' },
          { label: 'Active Transfers', value: stats.pendingTransfers, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Certificates', value: stats.certificates, icon: Stamp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Notifications', value: 'Recent', icon: Bell, color: 'text-registryBlue dark:text-blue-400', bg: 'bg-blue-50' }
        ].map((item, i) => (
          <div key={i} className="inst-card flex items-center gap-5">
            <div className={`p-4 rounded-xl ${item.bg} ${item.color}`}>
              <item.icon size={24} />
            </div>
            <div>
              <p className="text-base font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="text-2xl font-bold text-black dark:text-white mt-1">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Assets Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <Landmark size={18} className="text-registryBlue dark:text-blue-400" /> Recent Assets
            </h3>
            <button onClick={() => navigate('/properties')} className="text-base font-semibold text-registryBlue dark:text-blue-400 hover:underline">View All</button>
          </div>

          {recentAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentAssets.map(asset => (
                <div key={asset.id} onClick={() => navigate(`/properties/${asset.id}`)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-4 hover:border-registryBlue/50 cursor-pointer transition-colors group">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Landmark size={24} className="text-registryBlue dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{asset.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{asset.district}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-green-200 dark:border-green-800/50">
                       <ShieldCheck size={16} className="text-green-600" />
                       <span className="text-sm font-semibold text-green-700 dark:text-green-300">{asset.status === 'registered' ? 'Verified' : 'Pending'}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-registryBlue dark:text-blue-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="inst-card border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center py-20 text-center bg-slate-50 dark:bg-slate-950">
              <Landmark size={40} className="text-slate-300 mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white">No assets found</p>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-2 max-w-[240px]">You do not have any assets registered in the system yet.</p>
              <button onClick={() => navigate('/register-asset')} className="mt-6 btn btn-primary">Register Asset</button>
            </div>
          )}
        </div>

        {/* Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
             <History size={18} className="text-registryBlue dark:text-blue-400" />
             <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="inst-card p-0 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
            <div className="divide-y divide-slate-100">
              {recentHistory.length > 0 ? recentHistory.map((h, i) => (
                <div key={i} className="p-5 hover:bg-slate-50 dark:bg-slate-950 transition-colors">
                  <div className="flex gap-4">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      h.action.includes('REJECT') || h.action.includes('ERROR') ? 'bg-red-500' : 'bg-registryBlue'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-slate-900 dark:text-white leading-tight capitalize">
                        {h.description || h.action.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {formatDate(h.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-16 text-center text-slate-500 dark:text-slate-400 text-base font-medium">
                  No activity found
                </div>
              )}
            </div>
            {recentHistory.length > 0 && (
              <button 
                onClick={() => navigate('/history')} 
                className="w-full py-3.5 bg-slate-50 dark:bg-slate-950 text-base font-semibold text-registryBlue dark:text-blue-400 hover:bg-registryBlue hover:text-white transition-all border-t border-slate-100"
              >
                View All History
                {t('view_all_history')}
              </button>
            )}
          </div>

          {/* Quick Support Card */}
          <div className="inst-card bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center">
            <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-registryBlue dark:text-blue-400 mx-auto mb-4 shadow-sm border border-slate-200 dark:border-slate-800">
               <ShieldCheck size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('support')}</h4>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {t('support_desc')}
            </p>
            <button onClick={() => navigate('/help')} className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-base hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 dark:text-blue-400 transition-colors shadow-sm">
              {t('contact_support')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
