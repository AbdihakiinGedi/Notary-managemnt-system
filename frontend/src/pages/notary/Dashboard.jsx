import React, { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { 
  Stamp, ArrowRight, Check, X, History, FileText, Search, ShieldCheck, 
  Download, AlertOctagon, FileSignature, Scale, Briefcase, Globe, Loader2, Eye,
  ChevronRight, Timer, ArrowRightLeft, Building2, Landmark, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import DigitalSignatureModal from '../../components/DigitalSignatureModal';
import formatAssetId from '../../utils/formatAssetId';
import formatDate, { formatDateTime } from '../../utils/formatDate';
import TransferDetailsModal from '../../components/TransferDetailsModal';

export default function NotaryDashboard() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [transfers, setTransfers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProp, setSelectedProp] = useState(null);
  const [tab, setTab] = useState('register'); // register | transfer | history | services
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    pendingTransfers: 0,
    approvedCases: 0,
    certificatesIssued: 0
  });

  // Signature modal state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [activeTransferId, setActiveTransferId] = useState(null);
  const [activePropertyId, setActivePropertyId] = useState(null);
  const [viewDetailsId, setViewDetailsId] = useState(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/queue' || path === '/verification-queue') setTab('register');
    else if (path === '/transfers' || path === '/transfer-certification') setTab('transfer');
    else if (path === '/history') setTab('history');
    else if (path === '/notary-services') setTab('services');
  }, [location]);

  useEffect(() => {
    fetchData();
    fetchStats();

    // Auto polling
    const interval = setInterval(() => {
      fetchData();
      fetchStats();
    }, 10000);

    const handleRefresh = () => {
      fetchData();
      fetchStats();
    };
    window.addEventListener('refresh_dashboard_stats', handleRefresh);

    return () => {
      clearInterval(interval);
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
        pendingVerifications: p.filter(x => x.status === 'pending_notary').length,
        pendingTransfers: t.filter(x => x.status === 'accepted').length,
        approvedCases: t.filter(x => ['notarized', 'pending_officer', 'completed'].includes(x.status)).length,
        certificatesIssued: c.length
      });
    } catch (e) {}
  };

  const [loadingAction, setLoadingAction] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (tab === 'transfer') {
        const res = await api.get('/transfers'); // Uses role-based query with agreement fields
        setTransfers(res.data.filter(t => t.status === 'accepted'));
      } else if (tab === 'history') {
        const res = await api.get('/transfers');
        setHistory(res.data.filter(t => ['notarized', 'pending_officer', 'completed'].includes(t.status)));
      } else if (tab === 'register') {
        const [propRes, transRes] = await Promise.all([
          api.get('/properties').catch(() => ({ data: [] })),
          api.get('/transfers').catch(() => ({ data: [] }))
        ]);
        setProperties(propRes.data.filter(p => p.status === 'pending_notary'));
        setTransfers(transRes.data.filter(t => t.status === 'accepted'));
      }
    } catch (err) {
      toast.error('Failed to sync data');
    } finally {
      setLoading(false);
    }
  };

  const processApplication = async (id, status) => {
    try {
      if (status === 'approved') {
        setActivePropertyId(id);
        setSigModalOpen(true);
        return;
      } else {
        await api.patch(`/properties/${id}/reject`);
        toast.warn('Application rejected');
      }
      setSelectedProp(null);
      await fetchData();
      await fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    }
  };

  const verifyTransfer = async (id, action) => {
    if (loadingAction) return;
    if (action === 'notary_approve') {
      setActiveTransferId(id);
      setSigModalOpen(true);
      return;
    }
    setLoadingAction(id);
    try {
      await api.patch(`/transfers/${id}/reject`);
      toast.warn('Transfer rejected');
      await fetchData();
      await fetchStats();
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
        await api.patch(`/properties/${activePropertyId}/notary-approve`, { signatureData: sigImg });
        toast.success('Registration verified & digitally signed');
        setSelectedProp(null);
        await fetchData();
        await fetchStats();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Verification failed');
      } finally {
        setLoadingAction(null);
        setActivePropertyId(null);
      }
    } else if (activeTransferId) {
      setLoadingAction(activeTransferId);
      try {
        await api.patch(`/transfers/${activeTransferId}/notary-certify`, { signature_image: sigImg });
        toast.success('Transfer verified & digitally signed');
        await fetchData();
        await fetchStats();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Certification failed');
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

  if (loading && !transfers.length && !properties.length && !history.length) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Syncing dashboard...</p>
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
            <ShieldCheck size={14} className="text-registryGold" /> Official Notary Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Notary Dashboard</h1>
          <p className="text-blue-100 text-base md:text-base leading-relaxed max-w-xl">
            Verify property records and certify title transfers as an authorized state notary.
          </p>
        </div>
        <div className="relative z-10 w-full md:w-auto bg-white dark:bg-slate-900/10 p-1.5 rounded-lg border border-white/20 backdrop-blur-sm">
          <div className="flex flex-row overflow-x-auto gap-1">
            {[
              { id: 'register', name: 'Verification' },
              { id: 'transfer', name: 'Transfers' },
              { id: 'services', name: 'Services' },
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
          { label: 'Pending Verifications', value: stats.pendingVerifications, icon: Timer, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Transfers', value: stats.pendingTransfers, icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approved Cases', value: stats.approvedCases, icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Certificates Issued', value: stats.certificatesIssued, icon: Stamp, color: 'text-registryBlue dark:text-blue-400', bg: 'bg-blue-50' }
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
        {tab === 'services' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
               <h2 className="text-base font-bold text-slate-900 dark:text-white">Services</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Legal Affidavits", icon: FileText, desc: "Sworn statements" },
                { name: "Contracts", icon: FileSignature, desc: "Agreement verification" },
                { name: "Certified Documents", icon: Globe, desc: "Official document certification" },
                { name: "Power of Attorney", icon: Scale, desc: "Legal representation" },
                { name: "Digital Notarization", icon: ShieldCheck, desc: "Digital verification" },
                { name: "Property Audit", icon: Briefcase, desc: "Ownership verification" }
              ].map(svc => (
                <div key={svc.name} className="inst-card group hover:shadow-md cursor-pointer bg-white dark:bg-slate-900 transition-all">
                  <div className="p-4 bg-blue-50 rounded-xl text-registryBlue dark:text-blue-400 mb-5 group-hover:bg-registryBlue group-hover:text-white transition-colors w-fit border border-blue-100">
                    <svc.icon size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{svc.name}</h3>
                  <p className="text-base text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">{svc.desc}</p>
                  <button className="mt-6 text-base font-semibold text-registryBlue dark:text-blue-400 flex items-center gap-1.5 hover:underline">
                    View Details <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'register' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
               <h2 className="text-base font-bold text-slate-900 dark:text-white">Pending Verification</h2>
            </div>
            <div className="space-y-4">
              {properties.length > 0 ? properties.map(p => (
                <div key={p.id} className="inst-card bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                   <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 flex-1">
                        <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-registryBlue dark:text-blue-400 border border-blue-100 shadow-sm">
                          <Stamp size={32} />
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
                              <FileText size={16} /> View Documents
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full lg:w-auto">
                        <button onClick={() => processApplication(p.id, 'approved')} className="btn btn-primary flex-1 lg:flex-none text-base font-semibold py-3 px-8">
                          <Check size={18} className="mr-2" /> Verify
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
              )) : null}

              {transfers.length > 0 && transfers.map(t => (
                 <div key={t.id} className="inst-card bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                   <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 flex-1">
                         <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-registryBlue dark:text-blue-400 border border-blue-100 shadow-sm">
                           <ArrowRightLeft size={32} />
                         </div>
                         <div className="min-w-0">
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">Transfer: {t.property_title || 'Untitled Asset'}</h3>
                           <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                             <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">From: {t.seller_name}</span>
                             <span className="text-sm font-semibold text-registryBlue dark:text-blue-400">To: {t.buyer_name}</span>
                           </div>
                         </div>
                      </div>
                      <div className="flex gap-3 w-full lg:w-auto">
                         <button onClick={() => setViewDetailsId(t.id)} className="btn btn-primary flex-1 lg:flex-none text-base font-semibold py-3 px-8">
                           <Eye size={18} className="mr-2" /> View Details
                         </button>
                      </div>
                   </div>
                 </div>
               ))}

               {properties.length === 0 && transfers.length === 0 && (
                 <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800">
                   <Stamp size={56} className="text-slate-300 mb-6" />
                   <p className="text-xl font-bold text-slate-900 dark:text-white">Queue Clear</p>
                   <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">No pending verifications at this time</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {tab === 'transfer' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
               <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Transfers</h2>
            </div>
            <div className="inst-table-container">
               <table className="inst-table">
                  <thead>
                    <tr>
                       <th>Asset</th>
                       <th>Parties</th>
                       <th>Price</th>
                       <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.length > 0 ? transfers.map(t => (
                      <tr key={t.id}>
                        <td>
                          <p className="font-semibold text-slate-900 dark:text-white">{t.property_title || 'Untitled Asset'}</p>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="text-base font-medium text-slate-700 dark:text-slate-300 capitalize">{t.seller_name}</span>
                            <ArrowRight size={16} className="text-slate-400" />
                            <span className="text-base font-medium text-registryBlue dark:text-blue-400 capitalize">{t.buyer_name}</span>
                          </div>
                        </td>
                        <td>
                          <p className="text-base font-bold text-slate-900 dark:text-white">${parseFloat(t.price).toLocaleString()}</p>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => setViewDetailsId(t.id)}
                              className="btn btn-primary text-sm font-semibold py-2 px-5"
                            >
                              <Eye size={16} className="mr-1.5" /> View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="py-32 text-center">
                          <AlertOctagon size={56} className="mx-auto text-slate-300 mb-6" />
                          <p className="text-base font-medium text-slate-500 dark:text-slate-400">No active transfers to review</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
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
                       <th>Event</th>
                       <th>Asset</th>
                       <th>Status</th>
                       <th className="text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length > 0 ? history.map(h => (
                      <tr key={h.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-registryBlue dark:text-blue-400 border border-blue-100 shadow-sm">
                              <History size={16} />
                            </div>
                            <span className="text-base font-semibold text-slate-900 dark:text-white">Verification</span>
                          </div>
                        </td>
                        <td>
                          <p className="text-base font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{h.property_title}</p>
                        </td>
                        <td>
                          <span className="badge badge-success">Verified</span>
                        </td>
                        <td className="text-right">
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{formatDateTime(h.notary_approved_at || h.created_at)}</p>
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
        roleLabel="Authorized Notary Office"
      />

      <TransferDetailsModal 
        isOpen={!!viewDetailsId}
        transferId={viewDetailsId}
        onClose={() => setViewDetailsId(null)}
        onApprove={(id) => verifyTransfer(id, 'notary_approve')}
        onReject={(id) => verifyTransfer(id, 'rejected')}
      />

    </div>
  );
}
