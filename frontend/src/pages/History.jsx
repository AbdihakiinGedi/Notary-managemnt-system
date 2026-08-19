import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { 
  History as HistoryIcon, Shield, ArrowRightLeft, FileText, Stamp,
  ShieldCheck, ShieldAlert, Filter, Clock, Layers, Activity, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import formatDate from '../utils/formatDate';


const TYPE_ICON = {
  audit:       <Shield size={16} className="text-registryBlue dark:text-blue-400" />,
  transfer:    <ArrowRightLeft size={16} className="text-registryBlue dark:text-blue-400" />,
  asset:       <FileText size={16} className="text-registryBlue dark:text-blue-400" />,
  certificate: <Stamp size={16} className="text-registryBlue dark:text-blue-400" />,
  ledger:      <Activity size={16} className="text-slate-900 dark:text-white" />,
};

const ACTION_BADGE = (action = '', status = '') => {
  const str = (action + status).toUpperCase();
  if (str.includes('REJECT') || str.includes('DENY') || str.includes('FAIL'))
    return 'badge-error';
  if (str.includes('COMPLETE') || str.includes('REGISTER') || str.includes('APPROVE') || str.includes('VERIFIED'))
    return 'badge-success';
  return 'badge-blue';
};

export default function History() {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('merged');
  const [integrity, setIntegrity] = useState(null);
  const [filters, setFilters] = useState({ assetType: '', role: '', action: '', status: '', direction: '' });

  const filteredHistory = history.filter(item => {
    if (filters.assetType && item.asset_type && item.asset_type !== filters.assetType) return false;
    if (filters.role && item.role && item.role !== filters.role) return false;
    if (filters.action && item.action && !item.action.toUpperCase().includes(filters.action.toUpperCase())) return false;
    if (filters.status && item.status && item.status !== filters.status) return false;
    if (filters.direction && item.direction && item.direction !== filters.direction) return false;
    return true;
  });

  useEffect(() => { fetchHistory(); }, [mode]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/history${mode === 'ledger' ? '?mode=ledger' : ''}`);
      setHistory(res.data.history || []);
      if (mode === 'ledger') setIntegrity(res.data.integrity);
    } catch (err) {
      toast.error('Failed to sync history log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">History</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {mode === 'ledger' ? 'System event logs and registry updates.' : 'Historical record of interactions and property transfers.'}
          </p>
        </div>
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
          <button
            onClick={() => setMode('merged')}
            className={`px-6 py-2 rounded-md text-base font-semibold transition-all ${
              mode === 'merged'
                ? 'bg-white dark:bg-slate-900 text-registryBlue dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setMode('ledger')}
            className={`px-6 py-2 rounded-md text-base font-semibold transition-all ${
              mode === 'ledger'
                ? 'bg-white dark:bg-slate-900 text-registryBlue dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            System Logs
          </button>
        </div>
      </div>

      {/* Integrity Banner */}
      {mode === 'ledger' && integrity && (
        <div className={`p-6 rounded-xl border-l-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm ${
          integrity.valid
            ? 'bg-green-50/50 border-green-500 text-green-800'
            : 'bg-red-50/50 border-red-500 text-red-800'
        }`}>
          <div className="flex items-center gap-6">
            <div className={`p-3 rounded-lg shadow-sm border ${integrity.valid ? 'bg-white dark:bg-slate-900 border-green-200 text-green-600' : 'bg-white dark:bg-slate-900 border-red-200 text-red-600'}`}>
              {integrity.valid ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">System Integrity</p>
              <h4 className="font-bold text-lg tracking-tight mt-1">
                {integrity.valid ? 'System Secure' : 'System integrity verification failed. Please contact administrator.'}
              </h4>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full font-bold text-sm uppercase tracking-widest border ${integrity.valid ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
             Status: {integrity.valid ? 'Verified' : 'Review Required'}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="inst-card p-6 flex flex-wrap items-center gap-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3 mr-4">
          <Filter size={18} className="text-registryBlue dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Filters</span>
        </div>
        <div className="flex flex-wrap gap-4 flex-1">
          {[
            { key: 'assetType', options: [['', 'Type: All'], ['land', 'Land'], ['car', 'Vehicle'], ['business_share', 'Shares'], ['digital_asset', 'Digital']] },
            { key: 'direction', options: [['', 'Direction: All'], ['SENT', 'Sent'], ['RECEIVED', 'Received']] },
            { key: 'status', options: [['', 'Status: All'], ['completed', 'Completed'], ['accepted', 'Accepted'], ['initiated', 'Initiated'], ['notarized', 'Notarized']] },
          ].map(f => (
            <select
              key={f.key}
              className="inst-input w-auto min-w-[180px] py-2 px-4 text-base font-semibold capitalize outline-none focus:ring-2 focus:ring-registryBlue/10 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              value={filters[f.key]}
              onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
            >
              {f.options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-8 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-8 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{mode === 'ledger' ? 'Action' : 'Status'}</th>
              <th className="px-8 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-8 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="4" className="py-32 text-center">
                  <div className="w-8 h-8 border-2 border-registryBlue/20 border-t-registryBlue rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-base font-semibold text-slate-500 dark:text-slate-400">Loading records...</p>
                </td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-32 text-center">
                  <Activity size={48} className="mx-auto text-slate-300 mb-6" />
                  <p className="text-base font-semibold text-slate-500 dark:text-slate-400">No matching records found.</p>
                </td>
              </tr>
            ) : filteredHistory.map((record, i) => (
              <tr key={record.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                      {TYPE_ICON[mode === 'ledger' ? 'ledger' : record.type] || TYPE_ICON.ledger}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-base">
                      {mode === 'ledger' ? record.event_type : (record.type?.toUpperCase() || 'LOG')}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  {mode === 'ledger' ? (
                    <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-md">
                      BY:{record.actor_id?.slice(0, 8).toUpperCase() || 'SYSTEM'}
                    </span>
                  ) : (
                    <span className={`badge px-4 py-1.5 text-sm font-bold tracking-widest ${ACTION_BADGE(record.action, record.status)}`}>
                      {record.action?.toUpperCase() || record.status?.toUpperCase() || 'RECORDED'}
                    </span>
                  )}
                </td>
                <td className="px-8 py-6 max-w-[320px]">
                  <p className="truncate text-slate-600 dark:text-slate-400 font-medium text-base">
                    {mode === 'ledger' 
                      ? (record.current_hash ? `ID: ${record.current_hash.slice(0, 32)}...` : 'System Update')
                      : (record.description || record.title || 'Record Entry')}
                  </p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-slate-900 dark:text-white font-bold text-base">{formatDate(record.created_at)}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Loader2(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
