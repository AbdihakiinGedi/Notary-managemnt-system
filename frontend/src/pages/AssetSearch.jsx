import React, { useState, useEffect } from 'react';
import formatAssetId from '../utils/formatAssetId';
import api from '../services/api';
import { 
  Search, Filter, Landmark, Globe, CreditCard, FileText,
  ChevronLeft, ChevronRight, ShieldCheck, Activity, Briefcase, Coins, Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { AuthContext } from '../contexts/AuthContext';
import PublicNavbar from '../components/PublicNavbar';

const ASSET_ICON = {
  land:          <Landmark size={20} />,
  car:           <CreditCard size={20} />,
  motorcycle:    <CreditCard size={20} />,
  business_share:<Briefcase size={20} />,
  digital_asset: <Coins size={20} />,
};

const META_LABELS = {
  vin: 'VIN', plate_number: 'Plate', wallet_address: 'Wallet',
  company_name: 'Company', deed_number: 'Deed', engine_number: 'Engine', chassis_number: 'Chassis'
};

export default function AssetSearch() {
  const { user } = React.useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAssets = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/public/search?query=${query}&type=${type}&page=${p}`);
      setResults(res.data.assets);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch (err) {
      toast.error('Failed to query the registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    const timer = setTimeout(() => fetchAssets(1), 300);
    return () => clearTimeout(timer);
  }, [query, type]);

  const getStatusBadge = (status) => {
    const s = status?.toUpperCase();
    if (s === 'ACTIVE' || s === 'REGISTERED') return <div className="p-1.5 px-3 bg-green-50 rounded-full text-green-700 font-bold text-sm border border-green-200 shadow-sm">ACTIVE</div>;
    if (s === 'LOCKED') return <div className="p-1.5 px-3 bg-red-50 rounded-full text-red-700 font-bold text-sm border border-red-200 shadow-sm">LOCKED</div>;
    if (s === 'UNDER_TRANSFER') return <div className="p-1.5 px-3 bg-blue-50 rounded-full text-blue-700 font-bold text-sm border border-blue-200 shadow-sm">UNDER TRANSFER</div>;
    if (s === 'DISPUTED') return <div className="p-1.5 px-3 bg-orange-50 rounded-full text-orange-700 font-bold text-sm border border-orange-200 shadow-sm">DISPUTED</div>;
    return <div className="p-1.5 px-3 bg-slate-50 dark:bg-slate-950 rounded-full text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-200 dark:border-slate-800 shadow-sm">{s || 'INACTIVE'}</div>;
  };

  return (
    <>
      {!user && <PublicNavbar />}
      <div className="max-w-6xl mx-auto space-y-8 fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Property Search</h1>
            <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Search the official property registry by ID or title.</p>
          </div>
        </div>

        {/* Search Console */}
        <div className="inst-card p-10 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <form onSubmit={(e) => { e.preventDefault(); fetchAssets(1); }} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by ID or title..."
                className="inst-input pl-12 h-14 text-base font-semibold"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="inst-input md:w-56 h-14 text-base font-semibold cursor-pointer bg-white dark:bg-slate-900"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="land">Land / Real Estate</option>
              <option value="car">Vehicles</option>
              <option value="business_share">Business Shares</option>
              <option value="digital_asset">Digital Assets</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-10 h-14 text-base font-semibold shadow-md flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
             <div className="flex flex-col items-center gap-4">
               <div className="w-10 h-10 border-2 border-registryBlue/20 border-t-registryBlue rounded-full animate-spin"></div>
               <p className="text-base font-semibold text-slate-500 dark:text-slate-400">Searching registry...</p>
             </div>
          </div>
        ) : results.length === 0 ? (
          <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800">
            <Search size={48} className="text-slate-300 mb-4" />
            <p className="text-base font-bold text-slate-900 dark:text-white">No matching records found</p>
            <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 bg-registryBlue rounded-full"></div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{results.length} Records Found</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {results.map((asset) => (
                <div
                  key={asset.id}
                  className="inst-card flex flex-col group border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 text-registryBlue dark:text-blue-400 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                      {ASSET_ICON[asset.type] || <FileText size={20} />}
                    </div>
                    <span className="badge badge-blue dark:bg-blue-950/40 dark:text-blue-300 text-sm font-bold uppercase tracking-widest">
                      {asset.type?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate mb-2">
                      {asset.title || 'Untitled Asset'}
                    </h3>
                    <div className="flex items-center gap-2 mb-6 text-slate-500 dark:text-slate-400">
                      <Globe size={16} className="text-registryBlue dark:text-blue-400" />
                      <p className="text-base font-medium capitalize">
                        {asset.district || 'Location Unknown'}
                      </p>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Asset ID</label>
                        <span className="text-base font-bold text-slate-900 dark:text-white capitalize">{formatAssetId(asset.id)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Owner</label>
                        <span className="text-base font-bold text-slate-900 dark:text-white capitalize">{asset.owner_name}</span>
                      </div>
                      {Object.entries(asset.metadata || {}).map(([key, val]) =>
                        ['vin', 'plate_number', 'wallet_address', 'company_name', 'deed_number'].includes(key) && (
                          <div key={key} className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">{META_LABELS[key] || key}</label>
                            <span className="text-sm font-semibold font-mono text-registryBlue dark:text-blue-400 truncate max-w-[140px] uppercase">{val}</span>
                          </div>
                        )
                      )}
                      {asset.certificate_id && (
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Certificate No.</label>
                          <span className="text-sm font-semibold font-mono text-registryBlue dark:text-blue-400 truncate max-w-[140px] uppercase">{formatAssetId(asset.certificate_id)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-end">
                      {getStatusBadge(asset.status)}
                    </div>
                    {asset.certificate_id && (
                      <a href={`/verify/${asset.certificate_id}`} className="block w-full text-center py-2.5 bg-registryBlue hover:bg-blue-900 text-white text-base font-bold rounded-lg transition-colors shadow-sm">
                        View Details
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-12">
            <button
              disabled={page === 1}
              onClick={() => fetchAssets(page - 1)}
              className="btn btn-secondary p-3 disabled:opacity-20 shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
              <span className="text-base font-semibold text-slate-900 dark:text-white">
                Page {page} of {totalPages}
              </span>
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => fetchAssets(page + 1)}
              className="btn btn-secondary p-3 disabled:opacity-20 shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
