import formatAssetId from '../../utils/formatAssetId';
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import { ShieldCheck, Lock, Unlock, Eye, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function PropertyControl() {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState(''); // 'lock' or 'unlock'
  
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/properties');
      setProperties(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const filtered = properties.filter(p => 
    String(p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(p.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const s = status?.toUpperCase();
    if (s === 'ACTIVE' || s === 'REGISTERED') return <div className="p-1 px-2 bg-green-50 rounded-md text-green-700 font-bold text-sm border border-green-200">ACTIVE</div>;
    if (s === 'LOCKED') return <div className="p-1 px-2 bg-red-50 rounded-md text-red-700 font-bold text-sm border border-red-200">LOCKED</div>;
    return <div className="p-1 px-2 bg-slate-50 dark:bg-slate-900 rounded-md text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-200 dark:border-slate-800">{s || 'INACTIVE'}</div>;
  };

  const openModal = (property, type) => {
    setSelectedProperty(property);
    setActionType(type);
    setReason('');
    setModalOpen(true);
  };

  const handleAction = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    
    try {
      if (actionType === 'lock') {
        await api.patch(`/properties/${selectedProperty.id}/lock`, { reason });
        toast.success('Property locked successfully');
      } else {
        await api.patch(`/properties/${selectedProperty.id}/unlock`, { reason });
        toast.success('Property unlocked successfully');
      }
      setModalOpen(false);
      fetchProperties();
      window.dispatchEvent(new Event('refresh_dashboard_stats'));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to perform action');
    }
  };

  const downloadReport = async (id) => {
    try {
      const res = await api.get(`/properties/${id}/report`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Property-Report-${formatAssetId(id).replace('AST-', '')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      toast.error('Failed to download report');
    }
  };

  if (loading && properties.length === 0) return <div className="p-12 text-center text-slate-500">Loading properties...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="text-registryBlue dark:text-blue-400" size={28} />
          Property Control Center
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Manage, lock, or unlock properties across the entire registry.</p>
      </div>

      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 rounded-xl">
        <Search className="text-slate-400 ml-2" size={18} />
        <input 
          type="text" 
          placeholder="Search by ID, owner, or status..." 
          className="flex-1 bg-transparent py-2 px-2 text-base outline-none dark:text-white"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Property Details</th>
                <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Owner</th>
                <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4">
                    <p className="font-bold text-slate-900 dark:text-white text-base">{p.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">{formatAssetId(p.id)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[200px]">{p.district}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{p.owner_name}</p>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(p.status)}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => navigate(`/properties/${p.id}`)}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-registryBlue dark:text-blue-400 transition-colors border border-slate-200 dark:border-slate-700"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => downloadReport(p.id)}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-registryBlue dark:text-blue-400 transition-colors border border-slate-200 dark:border-slate-700"
                      title="View Report"
                    >
                      <FileText size={16} />
                    </button>
                    
                    {p.status === 'LOCKED' ? (
                      <button 
                        onClick={() => openModal(p, 'unlock')}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-slate-700 hover:text-green-600 transition-colors border border-slate-200 dark:border-slate-700"
                        title="Unlock Property"
                      >
                        <Unlock size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => openModal(p, 'lock')}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-slate-700 hover:text-red-600 transition-colors border border-slate-200 dark:border-slate-700"
                        title="Lock Property"
                      >
                        <Lock size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500 dark:text-slate-400 text-base font-medium">
                    No properties found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lock/Unlock Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {actionType === 'lock' ? 'Lock Property' : 'Unlock Property'}
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400 mb-6">
                Please provide a reason for this administrative action. This will be recorded in the audit logs.
              </p>
              
              <textarea
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base outline-none focus:border-registryBlue resize-none mb-6 dark:text-white"
                rows="4"
                placeholder="Enter justification..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              ></textarea>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-base text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAction}
                  className={`px-6 py-2 font-semibold text-base text-white rounded-lg transition-colors ${
                    actionType === 'lock' ? 'bg-red-600 hover:bg-red-700' : 'bg-registryBlue hover:bg-blue-700'
                  }`}
                >
                  Confirm {actionType === 'lock' ? 'Lock' : 'Unlock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
