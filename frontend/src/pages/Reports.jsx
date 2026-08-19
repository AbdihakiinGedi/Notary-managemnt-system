import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  FileText, Landmark, ArrowRightLeft, Stamp, History, Activity, 
  Users, BarChart3, Download, ArrowLeft, Printer, ShieldCheck
} from 'lucide-react';
import { CustomPDFReport } from '../components/ReportTemplates';
import { toast } from 'react-toastify';
import formatDate from '../utils/formatDate';

export default function Reports() {
  const { user } = useContext(AuthContext);
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleRefresh = () => {
      if (activeReport) {
        loadReport(activeReport);
      }
    };
    window.addEventListener('refresh_dashboard_stats', handleRefresh);
    return () => window.removeEventListener('refresh_dashboard_stats', handleRefresh);
  }, [activeReport]);

  // Role-based report definitions
  const getReportsList = () => {
    switch (user?.role?.toLowerCase()) {
      case 'citizen':
        return [
          { id: 'property', name: 'Property Report PDF', icon: Landmark, desc: 'Detailed snapshot of your registered properties.' },
          { id: 'transfer', name: 'Transfer Report PDF', icon: ArrowRightLeft, desc: 'Log of your sent and received transfers.' },
          { id: 'history', name: 'Ownership History Report', icon: History, desc: 'Historical timeline of assets you own.' },
          { id: 'certificate', name: 'Certificate Report', icon: Stamp, desc: 'Status of your official ownership certificates.' },
          { id: 'user_act', name: 'User Activity Report', icon: Users, desc: 'Your personal activity log.' }
        ];
      case 'notary':
        return [
          { id: 'verified_prop', name: 'Verification Report', icon: ShieldCheck, desc: 'List of properties you verified.' },
          { id: 'sig_report', name: 'Signature Activity Report', icon: FileText, desc: 'Audit of your digital signatures.' },
          { id: 'monthly_act', name: 'Monthly Verification Report', icon: BarChart3, desc: 'Volume of work processed this month.' },
          { id: 'user_act', name: 'User Activity Report', icon: Users, desc: 'Your personal activity log.' }
        ];
      case 'officer':
        return [
          { id: 'appr_reg', name: 'Approval Report', icon: Landmark, desc: 'Properties you approved for registry.' },
          { id: 'land_reg', name: 'Land Registry Report', icon: FileText, desc: 'Broad overview of land registry status.' },
          { id: 'locked_prop', name: 'Locked Property Report', icon: Activity, desc: 'Log of currently locked properties.' },
          { id: 'user_act', name: 'User Activity Report', icon: Users, desc: 'Your personal activity log.' }
        ];
      case 'admin':
        return [
          { id: 'reg_summary', name: 'Registry Summary Report', icon: Landmark, desc: 'Global statistics on the registry.' },
          { id: 'property', name: 'Property Report', icon: Landmark, desc: 'Detailed global property records.' },
          { id: 'transfer', name: 'Transfer Report', icon: ArrowRightLeft, desc: 'Global transfer volume and status.' },
          { id: 'certificate', name: 'Certificate Report', icon: Stamp, desc: 'Global certificate tracking.' },
          { id: 'audit', name: 'Audit Report', icon: History, desc: 'Immutable action log of system events.' },
          { id: 'user_act', name: 'User Activity Report', icon: Users, desc: 'Activity tracking across all users.' },
          { id: 'monthly_stats', name: 'Monthly Statistics Report', icon: BarChart3, desc: 'Month-over-month platform growth.' }
        ];
      default:
        return [];
    }
  };

  const loadReport = async (reportId) => {
    setActiveReport(reportId);
    setLoading(true);
    setReportData(null);
    try {
      let data = [];
      const role = user?.role?.toLowerCase();

      if (role === 'citizen') {
        if (reportId === 'property') data = (await api.get('/assets/my-assets')).data;
        else if (reportId === 'transfer') data = (await api.get('/assets/transfers')).data;
        else if (reportId === 'certificate') data = (await api.get('/assets/certificates')).data;
        else if (reportId === 'history' || reportId === 'user_act') data = (await api.get('/history')).data.history || (await api.get('/history')).data;
      }
      else if (role === 'notary') {
        if (reportId === 'verified_prop') data = (await api.get('/properties')).data;
        else if (reportId === 'verified_trans') data = (await api.get('/transfers')).data;
        else if (reportId === 'sig_report' || reportId === 'user_act') data = (await api.get('/history')).data.history || (await api.get('/history')).data;
        else if (reportId === 'monthly_act') {
           const [p, t] = await Promise.all([
             api.get('/properties').catch(() => ({ data: [] })),
             api.get('/transfers').catch(() => ({ data: [] }))
           ]);
           data = { properties: p.data, transfers: t.data };
        }
      }
      else if (role === 'officer') {
        if (reportId === 'appr_reg' || reportId === 'land_reg' || reportId === 'locked_prop') {
          const res = await api.get('/properties');
          if (reportId === 'locked_prop') data = res.data.filter(p => p.status === 'LOCKED');
          else data = res.data;
        }
        else if (reportId === 'appr_trans') data = (await api.get('/transfers')).data;
        else if (reportId === 'user_act') data = (await api.get('/history')).data.history || (await api.get('/history')).data;
      }
      else if (role === 'admin') {
        if (reportId === 'property') data = (await api.get('/properties')).data;
        else if (reportId === 'transfer') data = (await api.get('/transfers')).data;
        else if (reportId === 'certificate') data = (await api.get('/assets/certificates')).data;
        else if (reportId === 'audit' || reportId === 'user_act') {
          const res = await api.get('/admin/logs');
          data = res.data.data || res.data;
        }
        else if (reportId === 'reg_summary' || reportId === 'monthly_stats') {
          const [p, t, c, u] = await Promise.all([
            api.get('/properties').catch(() => ({ data: [] })),
            api.get('/transfers').catch(() => ({ data: [] })),
            api.get('/admin/metrics').catch(() => ({ data: {} })),
            api.get('/admin/users').catch(() => ({ data: [] }))
          ]);
          data = { properties: p.data, transfers: t.data, certificates: new Array(c.data?.activeAssets || 0), users: u.data };
        }
      }

      setReportData(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report data.');
    } finally {
      setLoading(false);
    }
  };

  const reports = getReportsList();

  return (
    <div className="space-y-8 fade-in pb-12 max-w-7xl mx-auto">
      {/* Header */}
      {!activeReport && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Official Reports Directory</h1>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Generate and export certified registry documents.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {reports.map((r) => (
              <div 
                key={r.id}
                onClick={() => loadReport(r.id)}
                className="inst-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-registryBlue/40 transition-all cursor-pointer group flex flex-col h-full"
              >
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-registryBlue dark:text-blue-400 rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm">
                  <r.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{r.name}</h3>
                <p className="text-base font-medium text-slate-500 dark:text-slate-400 flex-1">{r.desc}</p>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-base font-bold text-registryBlue dark:text-blue-400 group-hover:text-[#152C69] dark:group-hover:text-blue-300">
                  Generate <ArrowRightLeft size={16} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Report View */}
      {activeReport && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <button 
              onClick={() => setActiveReport(null)}
              className="flex items-center gap-2 text-base font-semibold text-slate-600 dark:text-slate-400 hover:text-registryBlue dark:hover:text-blue-400 dark:text-blue-400 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Reports
            </button>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="btn btn-primary flex items-center gap-2 text-base py-2 px-4 shadow-sm bg-registryBlue text-white rounded-lg hover:bg-[#152C69] transition-colors">
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>

          {/* Document Content */}
          <div className="p-8 md:p-12 print:p-0 min-h-[600px] bg-white dark:bg-slate-900">
            <div className="border-b-2 border-registryBlue pb-6 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {reports.find(r => r.id === activeReport)?.name}
                </h1>
                <p className="text-base font-semibold text-registryGold mt-2 tracking-widest uppercase">
                  Somali National Property Registry System
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-slate-500 dark:text-slate-400">Date Generated</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">{formatDate()}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">Generated by: {user?.name}</p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-8 h-8 border-2 border-registryBlue/20 border-t-registryBlue rounded-full animate-spin mb-4"></div>
                <p className="text-base font-semibold">Compiling official records...</p>
              </div>
            ) : (
              <CustomPDFReport reportId={activeReport} data={reportData} user={user} reportList={reports} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
