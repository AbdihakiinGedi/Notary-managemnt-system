import React, { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { 
  ShieldCheck, 
  Landmark, 
  Check, 
  X, 
  Clock, 
  AlertTriangle, 
  FileSignature, Briefcase, Download, Loader2, Globe, Activity, Eye,
  FileText, 
  ArrowRight, 
  ArrowRightLeft, 
  History, 
  Stamp,
  ShieldAlert,
  ChevronRight,
  Scale
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import DigitalSignatureModal from '../../components/DigitalSignatureModal';

export default function OfficerDashboard() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [queue, setQueue] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProp, setSelectedProp] = useState(null);
  const [tab, setTab] = useState('register'); // register | transfer | history | oversight | disputes | flags
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    pendingRegistrations: 0,
    pendingTransfers: 0,
    certificatesApproved: 0,
    lockedProperties: 0
  });

  // Signature modal state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [activeTransferId, setActiveTransferId] = useState(null);
  const [activePropertyId, setActivePropertyId] = useState(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/reviews' || path === '/land-reviews') setTab('register');
    else if (path === '/approvals' || path === '/transfers') setTab('transfer');
    else if (path === '/history') setTab('history');
    else if (path === '/disputes') setTab('disputes');
    else if (path === '/flags') setTab('flags');
  }, [location]);

  useEffect(() => {
    fetchData();
    fetchStats();

    const handleRefresh = () => {
      fetchData();
      fetchStats();
    };
    window.addEventListener('refresh_dashboard_stats', handleRefresh);

    return () => {
      window.removeEventListener('refresh_dashboard_stats', handleRefresh);
    };
  }, [tab]);

  const fetchStats = async () => {
    try {
      const [propRes, transRes, certsRes] = await Promise.all([
        api.get('/properties').catch(() => ({ data: [] })),
        api.get('/transfers').catch(() => ({ data: [] })),
        api.get('/assets/certificates').catch(() => ({ data: [] }))
      ]);
      const p = propRes.data || [];
      const t = transRes.data || [];
      const c = certsRes.data || [];
      setStats({
        pendingRegistrations: p.filter(x => x.status === 'pending_officer').length,
        pendingTransfers: t.filter(x => x.status === 'pending_officer').length,
        certificatesApproved: c.length,
        lockedProperties: p.filter(x => x.status === 'LOCKED').length
      });
    } catch (e) {}
  };

  const [loadingAction, setLoadingAction] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (tab === 'register') {
        const res = await api.get('/properties');
        setQueue(res.data.filter(p => p.status === 'pending_officer'));
      } else if (tab === 'history') {
        const res = await api.get('/transfers');
        setHistory(res.data.filter(t => t.status === 'completed'));
      } else {
        // Officer sees pending_officer transfers via /transfers (includes agreement fields)
        const res = await api.get('/transfers');
        setTransfers(res.data); // already filtered to pending_officer by the server
      }
    } catch (err) {
      toast.error('Failed to sync oversight queue');
    } finally {
      setLoading(false);
    }
  };

  const processApplication = async (id, status) => {
    try {
      if (status === 'registered') {
        setActivePropertyId(id);
        setSigModalOpen(true);
        return;
      } else {
        await api.patch(`/properties/${id}/reject`);
        toast.warn('Property registration rejected');
      }
      setSelectedProp(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registry error');
    }
  };

  const processTransfer = async (id, action) => {
    if (loadingAction) return;
    if (action === 'approved') {
      setActiveTransferId(id);
      setSigModalOpen(true);
      return;
    }
    setLoadingAction(id);
    try {
      await api.patch(`/transfers/${id}/reject`);
      toast.warn('Transfer rejected');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rejection failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSignConfirm = async (sigImg) => {
    if (activePropertyId) {
      setLoadingAction(activePropertyId);
      try {
        await api.patch(`/properties/${activePropertyId}/officer-approve`, { signatureData: sigImg });
        toast.success('Property registration approved & signed');
        setSelectedProp(null);
        await fetchData();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Process failed');
      } finally {
        setLoadingAction(null);
        setActivePropertyId(null);
      }
    } else if (activeTransferId) {
      setLoadingAction(activeTransferId);
      try {
        await api.patch(`/transfers/${activeTransferId}/officer-approve`, { signature_image: sigImg });
        toast.success('Title transfer complete and digitally signed.');
        await fetchData();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Process failed');
      } finally {
        setLoadingAction(null);
        setActiveTransferId(null);
      }
    }
  };

  const downloadDoc = async (docId, fileName) => {
    try {
      const response = await api.get(`/properties/documents/${docId}?download=true`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download document');
    }
  };

  const viewDoc = async (docId) => {
    try {
      const response = await api.get(`/properties/documents/${docId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: response.data.type }));
      window.open(url, '_blank');
    } catch (err) {
      toast.error('Failed to open document');
    }
  };

  if (loading && !queue.length && !transfers.length && !history.length) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Syncing oversight data...</p>
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
            <ShieldCheck size={14} className="text-registryGold" /> Official Registry Management
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Officer Dashboard</h1>
          <p className="text-blue-100 text-base md:text-base leading-relaxed max-w-xl">
            Review and approve property registrations and final title transfers.
          </p>
        </div>
        <div className="relative z-10 w-full md:w-auto bg-white dark:bg-slate-900/10 p-1.5 rounded-lg border border-white/20 backdrop-blur-sm">
          <div className="flex flex-row overflow-x-auto gap-1">
            {[
              { id: 'register', name: 'Registrations' },
              { id: 'transfer', name: 'Transfers' },
              { id: 'disputes', name: 'Disputes' },
              { id: 'history', name: 'History' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-2 rounded-md text-base font-semibold transition-all whitespace-nowrap ${tab === t.id ? 'bg-white dark:bg-slate-900 text-registryBlue dark:text-blue-400 shadow-sm' : 'text-blue-100 hover:bg-white dark:bg-slate-900/10 hover:text-white'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Pending Registrations', value: stats.pendingRegistrations, icon: Landmark, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Transfers', value: stats.pendingTransfers, icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Certificates Approved', value: stats.certificatesApproved, icon: Stamp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Locked Properties', value: stats.lockedProperties, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' }
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

      <div className="grid grid-cols-1 gap-8">
        {tab === 'register' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
               <h2 className="text-base font-bold text-slate-900 dark:text-white">Pending Registrations</h2>
            </div>
            <div className="space-y-4">
              {queue.length > 0 ? queue.map(p => (
                <div key={p.id} className="inst-card bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                   <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 flex-1">
                        <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-registryBlue dark:text-blue-400 border border-blue-100 shadow-sm">
                          <Landmark size={32} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{p.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{p.district}</span>
                            <span className="text-sm font-semibold text-registryBlue dark:text-blue-400 bg-blue-50 px-3 py-1 rounded-full capitalize">{p.type}</span>
                            <button 
                              onClick={() => api.get(`/properties/${p.id}`).then(res => setSelectedProp(res.data))} 
                              className="text-base font-semibold text-registryBlue dark:text-blue-400 hover:underline flex items-center gap-1.5 ml-2"
                            >
                              <FileText size={16}/> View Documents
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full lg:w-auto">
                        <button onClick={() => processApplication(p.id, 'registered')} className="btn btn-primary flex-1 lg:flex-none text-base font-semibold py-3 px-8">
                          <Check size={18} className="mr-2" /> Approve
                        </button>
                        <button onClick={() => processApplication(p.id, 'rejected')} className="btn btn-secondary flex-1 lg:flex-none text-red-600 border-red-200 hover:bg-red-50 text-base font-semibold py-3 px-8">
                          <X size={18} className="mr-2" /> Reject
                        </button>
                      </div>
                   </div>

                   {selectedProp?.id === p.id && (
                     <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-1">
                        <div className="flex items-center gap-2 mb-4">
                           <ShieldCheck size={18} className="text-registryBlue dark:text-blue-400" />
                           <label className="text-base font-bold text-slate-900 dark:text-white">Supporting Documents</label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                           {selectedProp.documents?.map(doc => (
                             <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 group hover:border-blue-300 transition-colors">
                               <div className="flex items-center gap-3 overflow-hidden">
                                 <FileText size={20} className="text-slate-400 shrink-0" />
                                 <span className="text-base font-medium text-slate-700 dark:text-slate-300 truncate">{doc.file_name}</span>
                               </div>
                               <div className="flex gap-2">
                                 <button onClick={() => viewDoc(doc.id)} className="p-2 text-registryBlue dark:text-blue-400 hover:bg-registryBlue hover:text-white rounded transition-all border border-blue-100" title="View Document">
                                   <Eye size={16} />
                                 </button>
                                 <button onClick={() => downloadDoc(doc.id, doc.file_name)} className="p-2 text-registryBlue dark:text-blue-400 hover:bg-registryBlue hover:text-white rounded transition-all border border-blue-100" title="Download Document">
                                   <Download size={16} />
                                 </button>
                               </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              )) : (
                <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800">
                  <Landmark size={56} className="text-slate-300 mb-6" />
                  <p className="text-xl font-bold text-slate-900 dark:text-white">Queue Clear</p>
                  <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">No pending registrations to review</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'transfer' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
               <h2 className="text-base font-bold text-slate-900 dark:text-white">Land Transfer Approvals</h2>
            </div>
            <div className="space-y-4">
              {transfers.length > 0 ? transfers.map(t => (
                <div key={t.id} className="inst-card bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                   <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 flex-1">
                        <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-registryBlue dark:text-blue-400 border border-blue-100 shadow-sm">
                          <ArrowRightLeft size={32} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{t.property_title || 'Untitled Property'}</h3>
                          <div className="flex items-center gap-3 mt-2 font-medium">
                            <span className="text-slate-500 dark:text-slate-400 text-base capitalize">{t.seller_name}</span>
                            <ArrowRight size={16} className="text-slate-400" />
                            <span className="text-registryBlue dark:text-blue-400 text-base capitalize">{t.buyer_name}</span>
                          </div>
                          {/* Signature Status Row */}
                          {t.agreement_id && (
                            <div className="flex items-center gap-4 mt-3">
                              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-md ${ t.seller_signed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                {t.seller_signed ? '✓' : '•'} Seller
                              </span>
                              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-md ${ t.buyer_signed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                {t.buyer_signed ? '✓' : '•'} Buyer
                              </span>
                              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-md ${ t.notary_signed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                {t.notary_signed ? '✓' : '•'} Notary
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 w-full lg:w-48">
                        {t.notary_signed ? (
                          <button 
                            onClick={() => processTransfer(t.id, 'approved')} 
                            disabled={loadingAction === t.id}
                            className="btn btn-primary w-full text-base font-semibold py-3"
                          >
                          {loadingAction === t.id ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                              <Stamp size={18} className="mr-2" /> 
                              Approve
                            </>
                          )}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50 rounded-lg border border-dashed border-amber-200 py-3 px-3">
                            <Clock size={16} /> Awaiting Notary Seal
                          </div>
                        )}
                        <button 
                          onClick={() => processTransfer(t.id, 'rejected')} 
                          disabled={loadingAction === t.id}
                          className="btn btn-secondary w-full text-red-600 border-red-200 hover:bg-red-50 text-base font-semibold py-3"
                        >
                          <X size={16} className="mr-2" /> Reject
                        </button>
                      </div>
                   </div>
                </div>
              )) : (
                <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800">
                  <ArrowRightLeft size={56} className="text-slate-300 mb-6" />
                  <p className="text-xl font-bold text-slate-900 dark:text-white">Queue Clear</p>
                  <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">No pending transfers to review</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(tab === 'disputes') && (
          <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800">
            <Scale size={56} className="text-slate-300 mb-6" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">No active disputes</p>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
               <h2 className="text-base font-bold text-slate-900 dark:text-white">History</h2>
            </div>
            <div className="inst-table-container">
               <table className="inst-table">
                  <thead>
                    <tr>
                       <th>Asset</th>
                       <th>Action</th>
                       <th>Status</th>
                       <th className="text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length > 0 ? history.map(h => (
                      <tr key={h.id}>
                        <td>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">{h.property_title}</p>
                        </td>
                        <td>
                          <span className="text-base font-medium text-slate-500 dark:text-slate-400">Transfer</span>
                        </td>
                        <td>
                          <span className="badge badge-success">Approved</span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2 text-base font-medium text-slate-500 dark:text-slate-400">
                            <Clock size={16}/> {formatDateTime(h.officer_approved_at || h.created_at)}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="py-32 text-center">
                          <p className="text-base font-medium text-slate-500 dark:text-slate-400">No history found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </div>
      <DigitalSignatureModal 
        isOpen={sigModalOpen}
        onClose={() => { setSigModalOpen(false); setActiveTransferId(null); setActivePropertyId(null); }}
        onConfirm={handleSignConfirm}
        roleLabel="Registry Approval Officer"
      />
    </div>
  );
}
