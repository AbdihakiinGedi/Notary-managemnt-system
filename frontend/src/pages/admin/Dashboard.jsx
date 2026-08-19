import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { 
  Users, 
  ShieldCheck, 
  Activity, 
  Database, 
  Cpu, 
  AlertTriangle, 
  BarChart3, 
  History, 
  Lock, 
  TrendingUp,
  Fingerprint,
  ShieldAlert,
  Server,
  Settings,
  Terminal,
  Search,
  LayoutGrid,
  Loader2,
  ChevronRight,
  Landmark,
  ArrowRightLeft,
  Stamp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { toast } from 'react-toastify';

import { useLocation } from 'react-router-dom';

export default function AdminDashboard() {
  const location = useLocation();
  const [stats, setStats] = useState({
    activeUsers: 0,
    activeAssets: 0,
    transferVolume24h: 0,
    failedTransactions24h: 0,
    databaseLatency: '0ms',
    systemStatus: 'Operational',
    registryIntegrity: 'Secure',
    totalProperties: 0,
    activeTransfers: 0,
    certificates: 0,
    auditEvents: 0,
    trafficData: []
  });
  const [users, setUsers] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [tab, setTab] = useState('analytics'); // analytics | users | logs | infrastructure
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role_name: 'officer', national_id: '', phone: '' });
  const [creating, setCreating] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditCategory, setAuditCategory] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (u.full_name && u.full_name.toLowerCase().includes(term)) ||
           (u.email && u.email.toLowerCase().includes(term)) ||
           (u.national_id && u.national_id.toLowerCase().includes(term)) ||
           (u.id && u.id.toLowerCase().includes(term));
  });

  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin/health') setTab('infrastructure');
    else if (path === '/admin/audit') setTab('logs');
    else if (path === '/admin/metrics') setTab('analytics');
    else if (path === '/user-management') setTab('users');
    else setTab('analytics');
  }, [location]);

  useEffect(() => {
    fetchAnalytics();

    // Auto polling
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 10000);

    const handleRefresh = () => {
      fetchAnalytics();
    };
    window.addEventListener('refresh_dashboard_stats', handleRefresh);

  return () => {
      clearInterval(interval);
      window.removeEventListener('refresh_dashboard_stats', handleRefresh);
    };
  }, [tab]);

  useEffect(() => {
    fetchAuditLogs();
    if (tab === 'infrastructure' && !healthData) {
      fetchHealth();
    }
  }, [auditCategory, tab]);

  const fetchHealth = async () => {
    try {
      const res = await api.get('/admin/health');
      setHealthData(res.data);
    } catch (err) {
      toast.error('Failed to load infrastructure data');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await api.get(`/admin/audit`, { params: { action: auditCategory, limit: 100 } });
      setAuditLogs(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, integrityRes, transRes, certRes, auditRes] = await Promise.all([
        api.get('/admin/metrics').catch(() => ({ data: {} })), 
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/admin/ledger/verify').catch(() => ({ data: { valid: true } })),
        api.get('/transfers').catch(() => ({ data: [] })),
        api.get('/admin/metrics').catch(() => ({ data: {} })), // Placeholder if certs/audit not easily fetched
        api.get('/admin/audit').catch(() => ({ data: [] }))
      ]);
      
      const metrics = statsRes.data || {};
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setStats({
        activeUsers: metrics.activeUsers || 0,
        activeAssets: metrics.activeAssets || 0,
        transferVolume24h: metrics.transferVolume24h || 0,
        failedTransactions24h: metrics.failedTransactions24h || 0,
        databaseLatency: metrics.databaseLatency || '0ms',
        systemStatus: metrics.systemStatus || 'Operational',
        registryIntegrity: metrics.registryIntegrity || 'Secure',
        totalUsers: Array.isArray(usersRes.data) ? usersRes.data.length : (metrics.activeUsers || 0),
        totalProperties: metrics.activeAssets || 0,
        activeTransfers: Array.isArray(transRes.data) ? transRes.data.filter(t => t.status !== 'completed' && t.status !== 'rejected').length : 0,
        certificates: metrics.activeCertificates || metrics.activeAssets || 0,
        auditEvents: auditRes.data?.total || 0,
        trafficData: metrics.trafficData || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserActivation = async (userId, currentState) => {
    if (window.confirm(`Are you sure you want to ${currentState ? 'deactivate' : 'activate'} this user?`)) {
      try {
        await api.patch(`/admin/users/${userId}/activation`, { is_active: !currentState });
        toast.success(`User ${currentState ? 'deactivated' : 'activated'} successfully`);
        fetchAnalytics();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to update user');
      }
    }
  };

  const handleVerification = async (userId, status) => {
    let rejection_reason = '';
    if (status === 'rejected') {
      rejection_reason = window.prompt("Enter reason for rejection (required):");
      if (!rejection_reason) return;
    } else {
      if (!window.confirm(`Are you sure you want to mark this user as ${status}?`)) return;
    }
    
    try {
      await api.patch(`/admin/users/${userId}/verify`, { status, rejection_reason });
      toast.success(`User verification updated to ${status}`);
      fetchAnalytics();
    } catch (err) {
      toast.error('Failed to update verification status');
    }
  };

  if (loading && !users.length) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading system state...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Hero Section */}
      <div className="bg-registryBlue rounded-2xl p-8 md:p-10 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white dark:bg-slate-900 opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 space-y-3 max-w-2xl">

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-blue-100 text-base md:text-base leading-relaxed max-w-xl">
            System management, analytics overview, and comprehensive registry control.
          </p>
        </div>
        <div className="relative z-10 w-full md:w-auto bg-white dark:bg-slate-900/10 p-1.5 rounded-lg border border-white/20 backdrop-blur-sm">
          <div className="flex flex-row overflow-x-auto gap-1">
            {[
              { id: 'analytics', name: 'Overview' },
              { id: 'users', name: 'Users' },
              { id: 'logs', name: 'Logs' },
              { id: 'infrastructure', name: 'Infrastructure' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-2 rounded-md text-base font-semibold transition-all whitespace-nowrap ${tab === t.id ? 'bg-white dark:bg-slate-900 text-registryBlue shadow-sm' : 'text-blue-100 hover:bg-white/20 hover:text-white'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'analytics' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: Users, colorClasses: 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-800' },
              { label: 'Total Properties', value: stats.totalProperties, icon: Landmark, colorClasses: 'bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-300 border-green-100 dark:border-green-800' },
              { label: 'Active Transfers', value: stats.activeTransfers, icon: ArrowRightLeft, colorClasses: 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-800' },
              { label: 'Certificates', value: stats.certificates, icon: Stamp, colorClasses: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800' },
              { label: 'Audit Events', value: stats.auditEvents, icon: History, colorClasses: 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-800' }
            ].map((item, i) => (
              <div key={i} className="inst-card group shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-5">
                   <div className={`p-3 rounded-xl transition-all border ${item.colorClasses}`}>
                     <item.icon size={24} />
                   </div>
                </div>
                <label className="text-base font-semibold text-slate-500 dark:text-slate-400">{item.label}</label>
                <p className="text-2xl font-bold text-black dark:text-white mt-1 tracking-tight">{item.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* System Health */}
            <div className="lg:col-span-2 inst-card p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
               <div className="flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">System Status</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Live Monitoring</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                     <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                     <span className="text-sm font-semibold text-green-700">Operational</span>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'API Layer', status: stats.systemStatus?.toUpperCase(), load: `${stats.databaseLatency} Latency` },
                    { label: 'Registry Database', status: 'ACTIVE', load: 'Optimized' },
                    { label: 'Audit Engine', status: 'ACTIVE', load: 'Synchronized' }
                  ].map((s, i) => (
                    <div key={i} className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                       <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{s.label}</p>
                       <p className="text-base font-bold text-slate-900 dark:text-white uppercase">{s.status}</p>
                       <p className="text-sm font-semibold text-registryBlue dark:text-blue-400 mt-2">{s.load}</p>
                    </div>
                  ))}
               </div>
               <div className="mt-8 h-64 w-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex justify-between items-center mb-4">
                     <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity size={18} className="text-registryBlue" /> Traffic Monitor (7 Days)</p>
                  </div>
                  {stats.trafficData && stats.trafficData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                      <AreaChart data={stats.trafficData}>
                        <defs>
                          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="requests" name="Total Activity" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRequests)" />
                        <Area type="monotone" dataKey="security" name="Security Events" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSecurity)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="animate-spin mb-2" size={24} />
                      <span className="text-sm">Loading telemetry...</span>
                    </div>
                  )}
               </div>
            </div>

            {/* System Activity */}
            <div className="inst-card p-0 overflow-hidden shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
               <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-4">
                  <div className="p-2.5 bg-registryBlue text-white rounded-lg shadow-sm"><Terminal size={20}/></div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Registry Activity</h2>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Real-time Stream</p>
                  </div>
               </div>
               <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto" style={{ maxHeight: '350px' }}>
                  {auditLogs.slice(0, 5).map((log, i) => (
                    <div key={log.id || i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors flex justify-between items-center">
                       <div className="min-w-0 flex-1 mr-4">
                         <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={log.action || log.description}>
                            {log.action || log.description}
                         </p>
                         <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                            {log.user_name || 'System'} • {new Date(log.created_at).toLocaleTimeString()}
                         </p>
                       </div>
                       <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md uppercase whitespace-nowrap ${
                          (log.status_code >= 400 || log.action?.toLowerCase().includes('fail')) 
                             ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                             : 'text-registryBlue bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                       }`}>
                          {log.status_code >= 400 ? 'FAILED' : 'SUCCESS'}
                       </span>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                     <div className="p-8 text-center text-sm font-medium text-slate-500">No recent activity</div>
                  )}
               </div>
               <button onClick={() => setTab('logs')} className="w-full py-4 bg-slate-50 dark:bg-slate-950 text-base font-semibold text-registryBlue hover:bg-registryBlue hover:text-white transition-all border-t border-slate-200 dark:border-slate-800">
                 Open Full Audit Log
               </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="inst-card p-0 overflow-hidden shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
           <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-950">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <Users size={18} className="text-registryBlue" /> Users
                </h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">User management</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg text-base font-medium outline-none w-full sm:w-64 focus:border-registryBlue transition-colors shadow-sm" />
                </div>
                <button onClick={() => setShowAddUser(true)} className="btn btn-primary text-base font-semibold py-2.5 px-5">
                  Add User
                </button>
              </div>
           </div>
            <div className="inst-table-container">
               <table className="inst-table">
                  <thead>
                     <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                        <tr key={u.id}>
                           <td>
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-blue-50 text-registryBlue rounded-lg flex items-center justify-center font-bold text-base border border-blue-100 shadow-sm overflow-hidden">
                                    {u.profile_photo ? (
                                      <img src={`http://localhost:5001${u.profile_photo}`} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                      u.full_name?.charAt(0).toUpperCase()
                                    )}
                                 </div>
                                  <div>
                                     <p className="text-base font-bold text-slate-900 dark:text-white">{u.full_name}</p>
                                     <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{u.email}</p>
                                     {u.national_id && (
                                       <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">ID: {u.national_id}</p>
                                     )}
                                  </div>
                              </div>
                           </td>
                           <td>
                              <span className="badge badge-blue dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                                 {u.role?.toUpperCase()}
                              </span>
                           </td>
                           <td>
                              <div className="flex flex-col gap-1">
                                {u.verification_status === 'verified' && (
                                  <span className="badge badge-success dark:bg-green-950/50 dark:text-green-300 dark:border-green-800 text-sm w-fit">VERIFIED</span>
                                )}
                                {u.verification_status === 'pending' && (
                                  <span className="badge badge-warning dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 text-sm w-fit">PENDING VERIFICATION</span>
                                )}
                                {u.verification_status === 'rejected' && (
                                  <span className="badge badge-danger dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 text-sm w-fit">REJECTED</span>
                                )}
                                {(!u.verification_status || u.verification_status === 'not_submitted') && (
                                  <span className="badge badge-secondary dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-sm w-fit">NOT SUBMITTED</span>
                                )}
                                {u.is_active ? (
                                  <div className="flex items-center gap-2 text-green-600 mt-1">
                                     <ShieldCheck size={16} />
                                     <span className="text-sm font-semibold uppercase tracking-wider">Active</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-400 mt-1">
                                     <Lock size={16} />
                                     <span className="text-sm font-semibold uppercase tracking-wider">Deactivated</span>
                                  </div>
                                )}
                              </div>
                           </td>
                           <td>
                             <div className="flex items-center gap-2 flex-wrap">
                               {u.role !== 'admin' && (
                                 <button 
                                   onClick={() => toggleUserActivation(u.id, u.is_active)}
                                   className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'}`}
                                 >
                                   {u.is_active ? 'Deactivate' : 'Activate'}
                                 </button>
                               )}
                               {u.verification_status === 'pending' && (
                                  <>
                                   <button 
                                      onClick={() => handleVerification(u.id, 'verified')}
                                      className="px-3 py-1.5 rounded-md text-sm font-semibold bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                                   >
                                     Verify
                                   </button>
                                   <button 
                                      onClick={() => handleVerification(u.id, 'rejected')}
                                      className="px-3 py-1.5 rounded-md text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                                   >
                                     Reject
                                   </button>
                                 </>
                               )}
                             </div>
                           </td>
                        </tr>
                     )) : (
                        <tr>
                           <td colSpan="4" className="text-center py-8 text-slate-500">No users found</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
       )}

       {tab === 'infrastructure' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="inst-card p-6 shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
               <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                     <Server size={24} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${healthData?.status === 'healthy' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                     {healthData?.status || 'Unknown'}
                  </span>
               </div>
               <h3 className="text-base font-bold text-slate-900 dark:text-white">API Server</h3>
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 mb-4">Node.js Engine</p>
               
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 dark:text-slate-400">Uptime</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{healthData ? `${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m` : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 dark:text-slate-400">Memory (RSS)</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{healthData?.memory?.rss || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 dark:text-slate-400">Heap Used</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{healthData?.memory?.heapUsed || '-'}</span>
                  </div>
               </div>
            </div>

            <div className="inst-card p-6 shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
               <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                     <Database size={24} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${healthData?.database?.status === 'connected' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                     {healthData?.database?.status || 'Unknown'}
                  </span>
               </div>
               <h3 className="text-base font-bold text-slate-900 dark:text-white">Database</h3>
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 mb-4">{healthData?.database?.version || 'PostgreSQL'}</p>
               
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 dark:text-slate-400">Current Size</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{healthData?.database?.size || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 dark:text-slate-400">Latency</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{stats.databaseLatency}</span>
                  </div>
               </div>
            </div>

         </div>
       )}

       {tab === 'logs' && (
        <div className="inst-card p-0 overflow-hidden shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-950">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <History size={18} className="text-registryBlue dark:text-blue-400" /> Audit Logs
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">System-wide activity ledger</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="relative flex-1 sm:w-64">
                 <History size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <select 
                    value={auditCategory}
                    onChange={(e) => setAuditCategory(e.target.value)}
                    className="inst-input pl-10 py-2 text-sm bg-white dark:bg-slate-900"
                 >
                    <option value="">All logs</option>
                    <option value="login">Login/authentication logs</option>
                    <option value="user">User activity</option>
                    <option value="property">Property activity</option>
                    <option value="transfer">Transfer activity</option>
                    <option value="certificate">Document/certificate activity</option>
                 </select>
               </div>
            </div>
          </div>
          <div className="inst-table-container">
             <table className="inst-table">
                <thead>
                   <tr>
                      <th>Date / Time</th>
                      <th>Actor</th>
                      <th>Action / Event</th>
                      <th>Related Context</th>
                   </tr>
                </thead>
                <tbody>
                   {auditLoading ? (
                      <tr>
                         <td colSpan="4" className="text-center py-8">
                            <Loader2 className="animate-spin mx-auto text-registryBlue dark:text-blue-400" size={24} />
                         </td>
                      </tr>
                   ) : auditLogs.length > 0 ? auditLogs.map((log) => (
                      <tr key={log.id}>
                         <td className="whitespace-nowrap">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {new Date(log.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </p>
                         </td>
                         <td>
                            <div className="flex flex-col gap-1">
                               <p className="text-sm font-bold text-slate-900 dark:text-white">{log.user_name || 'System'}</p>
                               {log.role_name && (
                                 <span className="badge badge-blue dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 text-[10px] px-2 py-0.5 w-fit uppercase">{log.role_name}</span>
                               )}
                               <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{log.ip_address || 'Internal'}</p>
                            </div>
                         </td>
                         <td>
                            <div className="flex flex-col gap-2">
                               <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                 {log.description || log.action}
                               </span>
                               <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md uppercase w-fit tracking-wider ${
                                  (log.status_code >= 400 || log.action?.toLowerCase().includes('fail')) 
                                     ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
                                     : 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800'
                               }`}>
                                  {log.status_code >= 400 ? 'FAILURE' : 'SUCCESS'}
                               </span>
                            </div>
                         </td>
                         <td>
                            <div className="flex flex-col gap-1">
                               {log.related_property && (
                                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                     <span className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Property:</span> {log.related_property}
                                  </p>
                               )}
                               {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <details className="text-xs text-slate-500 dark:text-slate-400 mt-1 cursor-pointer">
                                     <summary className="font-semibold text-registryBlue dark:text-blue-400 hover:underline">View Details</summary>
                                     <pre className="mt-2 p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto">
                                        {JSON.stringify(log.metadata, null, 2)}
                                     </pre>
                                  </details>
                               )}
                            </div>
                         </td>
                      </tr>
                   )) : (
                      <tr>
                         <td colSpan="4" className="text-center py-8 text-slate-500">No logs found</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>
       )}

         {showAddUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldAlert size={20} className="text-registryBlue" /> Add User
                   </h3>
                   <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-1.5">Create a new system account</p>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setCreating(true);
                  try {
                    await api.post('/admin/users', newUser);
                    toast.success('User added successfully');
                    setShowAddUser(false);
                    fetchAnalytics();
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to add user');
                  } finally {
                    setCreating(false);
                  }
                }} className="p-8 space-y-6">
                   <div>
                      <label className="inst-label">Full Name</label>
                      <input required className="inst-input" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} placeholder="Full name..." />
                   </div>
                   <div>
                      <label className="inst-label">Email Address</label>
                      <input required type="email" className="inst-input" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="email@example.com" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="inst-label">National ID <span className="text-red-500">*</span></label>
                        <input required className="inst-input" value={newUser.national_id} onChange={e => setNewUser({...newUser, national_id: e.target.value})} placeholder="National ID..." />
                     </div>
                     <div>
                        <label className="inst-label">Phone Number</label>
                        <input className="inst-input" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="+252..." />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="inst-label">Password</label>
                        <input required type="password" minLength="6" className="inst-input" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="••••••" />
                     </div>
                     <div>
                        <label className="inst-label">Role</label>
                        <select className="inst-input bg-white dark:bg-slate-900" value={newUser.role_name} onChange={e => setNewUser({...newUser, role_name: e.target.value})}>
                           <option value="officer">OFFICER</option>
                           <option value="notary">NOTARY</option>
                           <option value="admin">ADMIN</option>
                           <option value="citizen">CITIZEN</option>
                        </select>
                     </div>
                   </div>
                    <div className="pt-6 flex gap-3">
                      <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 btn btn-secondary py-3 text-base font-semibold">Cancel</button>
                      <button type="submit" disabled={creating} className="flex-[2] btn btn-primary py-3 text-base font-semibold">
                         {creating ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Create User'}
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}
    </div>
  );
}
