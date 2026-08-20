import formatAssetId from '../utils/formatAssetId';
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  Landmark, 
  MapPin, 
  Search, 
  Plus, 
  Filter, 
  History, 
  X, 
  ShieldCheck, 
  FileCheck, 
  Calendar,
  Layers,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import formatDate from '../utils/formatDate';

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await api.get('/properties/my-properties');
        setProperties(res.data);
      } catch (err) {
        console.error('Failed to fetch properties', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const filtered = properties.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (p.title?.toLowerCase().includes(term) || 
            p.property_title?.toLowerCase().includes(term) || 
            p.district?.toLowerCase().includes(term) || 
            p.id?.toLowerCase().includes(term));
  });

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return <span className="badge badge-green">Active</span>;
      case 'pending': return <span className="badge badge-yellow">Pending</span>;
      case 'locked': return <span className="badge badge-red">Locked</span>;
      default: return <span className="badge badge-gray">{status || 'Unknown'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Assets</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and track your registered assets.</p>
        </div>
        <button 
          onClick={() => navigate('/register-asset')}
          className="btn btn-primary text-base font-semibold py-3 px-8"
        >
          <Plus size={18} className="mr-2" /> Register Asset
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by title, district or ID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-base font-semibold outline-none focus:border-registryBlue transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary text-base font-semibold h-full py-2.5 px-8 whitespace-nowrap">
          <Filter size={16} className="mr-2" /> Filters
        </button>
      </div>
      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(p => (
          <div key={p.id} className="inst-card p-0 overflow-hidden group flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <div className="h-48 bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative border-b border-slate-200 dark:border-slate-800">
               {p.image_url ? (
                 <img 
                   src={`${api.defaults.baseURL}${p.image_url}`} 
                   alt={p.title} 
                   className="w-full h-full object-cover" 
                   onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} 
                 />
               ) : null}
               <Landmark size={48} className="text-slate-300" style={{ display: p.image_url ? 'none' : 'block' }} />
               <div className="absolute top-4 left-4">
                 <span className="badge badge-blue">{p.type?.replace('_', ' ')}</span>
               </div>
               <div className="absolute top-4 right-4">
                 {getStatusBadge(p.status)}
               </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-registryBlue dark:text-blue-400 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {p.title || p.property_title}
                </h3>
                <div className="flex items-center gap-2 text-base font-medium text-slate-500 dark:text-slate-400 mt-2">
                   <MapPin size={16} className="text-registryBlue dark:text-blue-400" /> {p.district || 'Location Unknown'}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Asset ID</label>
                    <p className="text-base font-bold text-slate-900 dark:text-white truncate">{formatAssetId(p.id)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Date Registered</label>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{formatDate(p.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Owner</label>
                    <p className="text-base font-bold text-slate-900 dark:text-white truncate" title={p.owner_name}>{p.owner_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Visibility</label>
                    <p className="text-base font-bold text-slate-900 dark:text-white capitalize">{p.visibility || 'Private'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-2">
                <button 
                  onClick={() => navigate(`/properties/${p.id}`)}
                  className="flex-1 btn btn-secondary text-base font-semibold py-3"
                >
                  <FileCheck size={16} className="mr-2" /> Details
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('/transfers'); }}
                  className="btn btn-primary px-4 py-3"
                  title="Transfer"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-32 inst-card border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 shadow-sm">
            <Search size={48} className="text-slate-300 mb-4" />
            <p className="text-base font-bold text-slate-900 dark:text-white">No matching records</p>
            <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* History Modal removed */}
    </div>
  );
}
