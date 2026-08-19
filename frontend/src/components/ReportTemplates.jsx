import React from 'react';
import formatAssetId from '../utils/formatAssetId';
import { formatDateTime } from '../utils/formatDate';
import { Landmark, ShieldCheck, Activity, Stamp, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; // We will use a mock QR if not installed, or just simple UI for it
import formatDate from '../utils/formatDate';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const buildReportSpecs = (reportId, data, rawData) => {
  let summaries = [];
  let cols = [];
  let rows = Array.isArray(data) ? data : (data?.data || []);

  switch (reportId) {
    case 'property':
      summaries = [
        { label: 'Total Properties', value: rows.length },
        { label: 'Locked Properties', value: rows.filter(r => r.status === 'LOCKED' || r.is_locked).length }
      ];
      cols = [
        { header: 'Asset ID', key: 'id', format: v => v ? formatAssetId(v) : 'Not Assigned' },
        { header: 'Property Title', key: 'title', format: v => v || 'Not Assigned' },
        { header: 'Owner Name', key: 'owner_name', format: v => v || 'Not Assigned' },
        { header: 'Property Type', key: 'type', format: v => v?.toUpperCase() || 'Not Assigned' },
        { header: 'Status', key: 'status', format: v => v || 'Not Assigned' },
        { header: 'District', key: 'district', format: v => v || 'Not Assigned' },
        { header: 'Registration Date', key: 'created_at', format: v => v ? formatDate(v) : 'Not Assigned' }
      ];
      break;
    case 'transfer':
    case 'verified_trans':
    case 'appr_trans':
      summaries = [
        { label: 'Total Transfers', value: rows.length },
        { label: 'Completed', value: rows.filter(r => r.status === 'completed').length }
      ];
      cols = [
        { header: 'Transfer ID', key: 'id', format: v => v ? formatAssetId(v) : 'Not Assigned' },
        { header: 'Property', key: 'property_title', format: v => v || 'Not Assigned' },
        { header: 'Seller', key: 'seller_name', format: v => v || 'Not Assigned' },
        { header: 'Buyer', key: 'buyer_name', format: v => v || 'Not Assigned' },
        { header: 'Notary', key: 'notary_name', format: v => v || 'Not Assigned' },
        { header: 'Officer', key: 'officer_name', format: v => v || 'Not Assigned' },
        { header: 'Status', key: 'status', format: v => v || 'Not Assigned' },
        { header: 'Transfer Date', key: 'created_at', format: v => v ? formatDate(v) : 'Not Assigned' }
      ];
      break;
    case 'history':
      summaries = [
        { label: 'Total Historical Events', value: rows.length }
      ];
      cols = [
        { header: 'Date', key: 'created_at', format: (v, r) => v ? formatDate(v) : (r?.timestamp ? formatDate(r.timestamp) : '') },
        { header: 'Action', key: 'action', format: v => v },
        { header: 'Related Property', key: 'related_property', format: v => v },
        { header: 'Description', key: 'description', format: v => v }
      ];
      break;
    case 'certificate':
      summaries = [
        { label: 'Total Certificates', value: rows.length },
        { label: 'Valid', value: rows.filter(r => r.is_active).length }
      ];
      cols = [
        { header: 'Certificate ID', key: 'certificate_id', format: (v, r) => (r?.id || v) ? formatAssetId(r?.id || v) : 'Not Assigned' },
        { header: 'Property', key: 'property_title', format: v => v || 'Not Assigned' },
        { header: 'Owner', key: 'owner_name', format: v => v || 'Not Assigned' },
        { header: 'Issue Date', key: 'issued_at', format: (v, r) => v ? formatDate(v) : (r?.created_at ? formatDate(r.created_at) : 'Not Assigned') },
        { header: 'Certificate Status', key: 'is_active', format: v => v ? 'ACTIVE' : 'REVOKED' }
      ];
      break;
    case 'verified_prop':
    case 'appr_reg':
      summaries = [
        { label: 'Verified Properties', value: rows.length }
      ];
      cols = [
        { header: 'Asset ID', key: 'id', format: v => v ? formatAssetId(v) : 'Not Assigned' },
        { header: 'Title', key: 'title', format: v => v || 'Not Assigned' },
        { header: 'Status', key: 'status', format: v => v || 'Not Assigned' }
      ];
      break;
    case 'locked_prop':
      summaries = [
        { label: 'Locked Properties', value: rows.length }
      ];
      cols = [
        { header: 'Asset ID', key: 'id', format: v => v ? formatAssetId(v) : 'Not Assigned' },
        { header: 'Title', key: 'title', format: v => v || 'Not Assigned' },
        { header: 'Owner', key: 'owner_name', format: v => v || 'Not Assigned' }
      ];
      break;
    case 'audit':
      summaries = [
        { label: 'Total Security Events', value: rows.length }
      ];
      cols = [
        { header: 'User', key: 'acting_user', format: v => v || 'Not Assigned' },
        { header: 'Action', key: 'action', format: v => v },
        { header: 'Related Property', key: 'related_property', format: v => v },
        { header: 'Description', key: 'description', format: v => v },
        { header: 'Date', key: 'created_at', format: (v, r) => v ? formatDateTime(v) : (r?.timestamp ? formatDateTime(r.timestamp) : '') },
        { header: 'IP Address', key: 'ip_address', format: v => v || 'Not Recorded' },
        { header: 'Status', key: 'status_code', format: (v, r) => {
           if (r?.action?.toLowerCase().includes('fail')) return 'FAILURE';
           return (v === undefined || v === null || v < 400) ? 'SUCCESS' : 'FAILURE';
        }}
      ];
      break;
    case 'user_act':
      summaries = [
        { label: 'Total User Events', value: rows.length }
      ];
      cols = [
        { header: 'Date', key: 'created_at', format: (v, r) => v ? formatDateTime(v) : (r?.timestamp ? formatDateTime(r.timestamp) : '') },
        { header: 'Action', key: 'action', format: v => v },
        { header: 'Related Property', key: 'related_property', format: v => v },
        { header: 'Description', key: 'description', format: v => v }
      ];
      break;
    case 'reg_summary':
      // This has a complex object data: { properties, transfers, certificates, users }
      const p = rawData?.properties || [];
      const t = rawData?.transfers || [];
      const c = rawData?.certificates || [];
      const u = rawData?.users || [];
      summaries = [
        { label: 'Total Users', value: u.length },
        { label: 'Total Properties', value: p.length },
        { label: 'Total Transfers', value: t.length },
        { label: 'Total Certificates', value: c.length }
      ];
      rows = []; // No single table for summary
      break;
    case 'monthly_act':
    case 'monthly_stats':
      const mp = rawData?.properties || [];
      const mt = rawData?.transfers || [];
      summaries = [
        { label: 'Properties Evaluated', value: mp.length },
        { label: 'Transfers Evaluated', value: mt.length }
      ];
      rows = [];
      break;
    case 'sig_report':
      summaries = [
        { label: 'Total Signatures', value: rows.length }
      ];
      cols = [
        { header: 'Date', key: 'created_at', format: (v, r) => v ? formatDateTime(v) : (r?.timestamp ? formatDateTime(r.timestamp) : '') },
        { header: 'Action', key: 'action', format: v => v },
        { header: 'Related Property', key: 'related_property', format: v => v },
        { header: 'Description', key: 'description', format: v => v }
      ];
      break;
    case 'land_reg':
      summaries = [
        { label: 'Active Land Records', value: rows.filter(r => r.status === 'ACTIVE' || r.status === 'registered').length },
        { label: 'Locked Land Records', value: rows.filter(r => r.status === 'LOCKED').length }
      ];
      cols = [
        { header: 'Asset ID', key: 'id', format: v => v ? formatAssetId(v) : 'Not Assigned' },
        { header: 'Type', key: 'type', format: v => v || 'Not Assigned' },
        { header: 'Status', key: 'status', format: v => v || 'Not Assigned' }
      ];
      break;
    default:
      cols = Object.keys(rows[0] || {}).slice(0,5).map(k => ({ header: k.toUpperCase(), key: k, format: v => v ? String(v).slice(0,40) : 'Not Assigned' }));
      break;
  }

  return { summaries, cols, rows };
};

const MonthlyStatsChart = ({ properties = [], transfers = [] }) => {
  // Aggregate data by month
  const dataMap = {};
  const processItems = (items, key) => {
    items.forEach(item => {
      const date = new Date(item.created_at || item.timestamp);
      if (isNaN(date.getTime())) return;
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!dataMap[month]) dataMap[month] = { month, properties: 0, transfers: 0, sortKey: date.getTime() };
      dataMap[month][key]++;
    });
  };
  processItems(properties, 'properties');
  processItems(transfers, 'transfers');

  const chartData = Object.values(dataMap).sort((a, b) => a.sortKey - b.sortKey);

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-80 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 mb-8">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-center">Month-over-Month Activity</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="properties" name="Properties Registered" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="transfers" name="Transfers Processed" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export function CustomPDFReport({ reportId, data, user, reportList }) {
  const reportMeta = reportList.find(r => r.id === reportId) || { name: 'Official Document' };
  
  if (!data) return null;

  const { summaries, cols, rows } = buildReportSpecs(reportId, Array.isArray(data) ? data : data?.data, data);
  const verifyCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-900 mx-auto p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-800 print:shadow-none print:border-none print:p-0">
      
      {/* Official Header */}
      <div className="flex justify-between items-start border-b-4 border-registryBlue pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-registryBlue rounded-full flex items-center justify-center border-2 border-registryGold">
            <Landmark size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-registryBlue dark:text-blue-400 tracking-widest uppercase">Somali National Registry</h1>
            <h2 className="text-base font-bold text-registryGold uppercase tracking-widest">SNDNPRS Official Record</h2>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{reportMeta.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Generated: {formatDateTime(new Date().toISOString())}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Requested By: {user?.full_name || 'Authorized User'} ({user?.role?.toUpperCase()})</p>
        </div>
      </div>

      {/* Charts Section */}
      {reportId === 'monthly_stats' && (
        <MonthlyStatsChart properties={data?.properties || []} transfers={data?.transfers || []} />
      )}

      {/* Summary Cards */}
      {summaries.length > 0 && (
        <div className={`grid gap-4 mb-8 ${summaries.length > 3 ? 'grid-cols-4' : 'grid-cols-' + summaries.length}`}>
          {summaries.map((s, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{s.label}</p>
              <p className="text-2xl font-black text-registryBlue dark:text-blue-400 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Data Table */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-800 mb-8">
          <table className="w-full text-left border-collapse bg-white dark:bg-slate-900">
            <thead className="bg-registryBlue text-white">
              <tr>
                {cols.map((c, i) => <th key={i} className="p-3 text-sm font-bold uppercase tracking-wider">{c.header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-950'}>
                  {cols.map((c, j) => (
                    <td key={j} className="p-3 text-base font-semibold text-slate-800 dark:text-slate-300">
                      {c.format ? c.format(row[c.key], row) : row[c.key] || 'Not Assigned'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-20 text-center font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-300 mb-8">
          No records found for this registry report.
        </div>
      )}

      {/* Official Footer with QR */}
      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 dark:border-slate-800 flex justify-between items-end">
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 dark:bg-slate-200 border border-slate-300 flex items-center justify-center p-2 rounded">
            {/* Fake QR code for visual representation */}
            <div className="grid grid-cols-4 grid-rows-4 gap-0.5 w-full h-full opacity-80">
              {Array.from({length: 16}).map((_, i) => <div key={i} className={Math.random() > 0.4 ? 'bg-slate-800 dark:bg-slate-200' : 'bg-transparent'} />)}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">VERIFICATION CODE</p>
            <p className="text-lg font-black text-registryBlue tracking-widest">{verifyCode}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Scan code or visit registry.snd.gov.so/verify to authenticate this official document.</p>
          </div>
        </div>
        <div className="text-right">
          <Stamp size={40} className="text-registryGold opacity-20 inline-block mb-2" />
          <p className="text-sm font-bold text-registryBlue dark:text-blue-400">MOHAMED A. - CHIEF REGISTRAR</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest">Somali National Registry</p>
        </div>
      </div>
      
    </div>
  );
}
