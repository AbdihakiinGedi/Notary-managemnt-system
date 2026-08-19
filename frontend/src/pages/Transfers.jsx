import formatAssetId from '../utils/formatAssetId';
import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  ArrowRight, 
  ArrowRightLeft, 
  FileText, 
  Download,
  Plus,
  Search,
  Landmark,
  Shield,
  Loader2,
  ChevronRight,
  PenTool,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import DigitalSignatureModal from '../components/DigitalSignatureModal';

export default function Transfers() {
  const { user } = useContext(AuthContext);
  const [transfers, setTransfers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [properties, setProperties] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [notaries, setNotaries] = useState([]);
  const [formData, setFormData] = useState({ property_id: '', to_user: '', price: '', reason: '', notary_id: '' });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('all'); // all | outgoing | incoming

  // Signature Modal state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigModalConfig, setSigModalConfig] = useState({
    onConfirm: () => {},
    signerName: '',
    signerNationalId: '',
    roleLabel: ''
  });

  useEffect(() => {
    fetchHistory();
    if (user?.role === 'citizen') {
      fetchAssets();
      fetchRecipients();
      fetchNotaries();
    }
  }, []);

  const fetchNotaries = async () => {
    try {
      const res = await api.get('/users/search?role=notary');
      setNotaries(res.data);
    } catch (err) {
      console.error('Failed to fetch notaries');
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/transfers');
      setTransfers(res.data);
    } catch (err) {
      toast.error('Failed to sync transfer history');
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await api.get('/assets/my-assets');
      setProperties(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecipients = async () => {
    const res = await api.get('/users/search');
    setRecipients(res.data);
  };

  const initiateTransfer = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (!formData.property_id) throw new Error("Please select an asset");
      if (!formData.to_user) throw new Error("Please specify the recipient");
      
      const payload = {
        property_id: formData.property_id,
        to_user: formData.to_user,
        price: parseFloat(formData.price) || 0,
        notary_request_id: formData.notary_id
      };
      
      await api.post('/transfers', payload);
      toast.success('Transfer request submitted successfully');
      setShowForm(false);
      setFormData({ property_id: '', to_user: '', price: '', reason: '', notary_id: '' });
      
      await fetchHistory();
      await fetchAssets(); 
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const acceptTransfer = async (id) => {
    try {
      await api.patch(`/transfers/${id}/accept`);
      toast.success('Transfer accepted and Agreement PDF generated.');
      await fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept transfer');
    }
  };

  const signAgreement = async (agreementId, signatureImage) => {
    try {
      await api.post(`/agreements/${agreementId}/sign`, { signature_image: signatureImage });
      toast.success('Agreement successfully signed and saved.');
      await fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signing failed');
    }
  };

  const certifyTransfer = async (id, signatureImage) => {
    try {
      await api.patch(`/transfers/${id}/notary-certify`, { signature_image: signatureImage });
      toast.success('Transfer certified & signed successfully');
      await fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to notarize transfer');
    }
  };

  const approveTransfer = async (id, signatureImage) => {
    try {
      await api.patch(`/transfers/${id}/officer-approve`, { signature_image: signatureImage });
      toast.success('Transfer approved & signed successfully');
      await fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve transfer');
    }
  };

  const downloadAgreementPDF = async (transferId, agreementNumber) => {
    try {
      const res = await api.get(`/agreements/${transferId}`);
      const agreementId = res.data?.agreement?.id;
      if (!agreementId) {
        toast.error('Agreement record not found.');
        return;
      }

      const dlRes = await api.get(`/agreements/${agreementId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([dlRes.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agreement-${agreementNumber || 'draft'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      toast.error('Failed to download agreement document.');
    }
  };

  const openCitizenSignatureModal = (agreementId, roleLabel) => {
    setSigModalConfig({
      onConfirm: (img) => signAgreement(agreementId, img),
      roleLabel: roleLabel
    });
    setSigModalOpen(true);
  };

  const openNotarySignatureModal = (transferId) => {
    setSigModalConfig({
      onConfirm: (img) => certifyTransfer(transferId, img),
      roleLabel: 'Authorized Notary Office'
    });
    setSigModalOpen(true);
  };

  const openOfficerSignatureModal = (transferId) => {
    setSigModalConfig({
      onConfirm: (img) => approveTransfer(transferId, img),
      roleLabel: 'Land Registry Approval Officer'
    });
    setSigModalOpen(true);
  };

  const statusMap = {
    initiated: { label: 'Initiated', color: 'badge-blue', icon: Clock },
    accepted: { label: 'Accepted', color: 'badge-blue', icon: Clock },
    notarized: { label: 'Notarized', color: 'badge-blue', icon: FileText },
    pending_officer: { label: 'Pending Officer', color: 'badge-warning', icon: Search },
    officer_review: { label: 'In Review', color: 'badge-warning', icon: Search },
    completing: { label: 'Completing', color: 'badge-blue', icon: Loader2 },
    completed: { label: 'Completed', color: 'badge-success', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'badge-error', icon: XCircle }
  };

  const StepProgress = ({ currentStatus, assetType }) => {
    const steps = [
      { id: 'initiated', label: 'Initiated' },
      { id: 'accepted', label: 'Accepted' },
      { id: 'notarized', label: 'Notarized' },
      ...(assetType?.toLowerCase() === 'land' || ['residential', 'commercial', 'industrial'].includes(assetType?.toLowerCase()) ? [{ id: 'pending_officer', label: 'Review' }] : []),
      { id: 'completed', label: 'Finalized' }
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStatus);
    const isCompleted = currentStatus === 'completed';
    const isRejected = currentStatus === 'rejected';

    if (isRejected) return (
      <div className="flex items-center gap-2 mt-4 text-red-600 dark:text-red-400">
        <XCircle size={14} />
        <span className="text-sm font-bold uppercase tracking-wider">Transfer Cancelled</span>
      </div>
    );

    return (
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between gap-1">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex-1 flex flex-col gap-1.5">
              <div className={`h-1 rounded-full ${currentIndex >= idx ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-800'}`} />
              <p className={`text-[10px] font-bold text-center uppercase tracking-tight ${currentIndex >= idx ? 'text-blue-600' : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Transfer Hub</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and track property ownership transfers.</p>
        </div>
        
        {user?.role === 'citizen' && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'} text-base font-semibold px-8 py-3`}
          >
            {showForm ? <XCircle size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
            {showForm ? 'Cancel' : 'Transfer Property'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="inst-card border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="p-2 bg-registryBlue text-white rounded-lg shadow-sm">
              <ArrowRightLeft size={20}/>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Transfer Property</h2>
          </div>
          
          <form onSubmit={initiateTransfer} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1.5">
              <label className="inst-label text-sm font-semibold">Select Asset</label>
              <select className="inst-input font-medium"
                value={formData.property_id} onChange={e => setFormData({...formData, property_id: e.target.value})}>
                <option value="">Choose Asset...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{formatAssetId(p.id)} - {p.title || p.property_title || 'Asset'} ({(p.asset_type || '').replace('_', ' ') || 'Asset'})</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="inst-label text-sm font-semibold">Recipient (Buyer)</label>
              <select className="inst-input font-medium"
                value={formData.to_user} onChange={e => setFormData({...formData, to_user: e.target.value})}>
                <option value="">Select Recipient...</option>
                {recipients.map(r => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="inst-label text-sm font-semibold">Notary Office</label>
              <select required className="inst-input font-medium"
                value={formData.notary_id} onChange={e => setFormData({...formData, notary_id: e.target.value})}>
                <option value="">Select Notary Office...</option>
                {notaries.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="inst-label text-sm font-semibold">Sale Price (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input type="number" className="inst-input pl-8 font-medium"
                  value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" />
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-1.5">
              <label className="inst-label text-sm font-semibold">Notes</label>
              <input type="text" className="inst-input font-medium"
                value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Reason for transfer..." />
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-4 pt-4">
              <button disabled={loading} type="submit" className="btn btn-primary px-10 py-3 text-base font-semibold shadow-md">
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Shield size={16} className="mr-2 inline-block mb-0.5" />}
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
           <div className="flex gap-8">
              {['all', 'outgoing', 'incoming'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-4 text-base font-semibold capitalize transition-all border-b-2 ${tab === t ? 'border-registryBlue text-registryBlue dark:text-blue-400 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                >
                  {t} Transfers
                </button>
              ))}
           </div>
        </div>
        
        <div className="space-y-4">
          {transfers.length > 0 ? transfers
            .filter(t => {
              if (tab === 'outgoing') return t.from_user === user?.id;
              if (tab === 'incoming') return t.to_user === user?.id;
              return true;
            })
            .map(t => {
            const status = statusMap[t.status] || statusMap.initiated;
            const Icon = status.icon;
            const isIncoming = t.to_user === user?.id;
            const isOutgoing = t.from_user === user?.id;
            const isLand = t.property_type && ['land', 'residential', 'commercial', 'industrial'].includes(t.property_type.toLowerCase());
            
            return (
              <div key={t.id} className="inst-card p-0 overflow-hidden group border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 animate-in fade-in">
                <div className="flex flex-col lg:flex-row">
                  <div className="flex-1 p-8">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-4">
                         <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-registryBlue dark:text-blue-400 border border-slate-200 dark:border-slate-800 shadow-sm">
                           <Landmark size={20} />
                         </div>
                         <div>
                           <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 capitalize">{(t.asset_type || t.property_type)?.replace('_', ' ') || 'Asset'} Transfer</p>
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t.property_title || 'Untitled Asset'}</h3>
                         </div>
                       </div>
                       <span className={`badge ${status.color} px-4 py-1.5 font-bold uppercase text-sm`}>
                         <Icon size={14} className={`mr-1.5 inline-block mb-0.5 ${t.status === 'completing' ? 'animate-spin' : ''}`} />
                         {status.label}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-500">
                           {(t.status === 'completed' ? t.buyer_photo : (t.owner_photo || t.seller_photo)) ? (
                             <img src={`http://localhost:5001${(t.status === 'completed' ? t.buyer_photo : (t.owner_photo || t.seller_photo))}`} alt="Owner" className="w-full h-full object-cover" />
                           ) : (
                             (t.status === 'completed' ? t.buyer_name : (t.owner_name || t.seller_name))?.[0]?.toUpperCase()
                           )}
                         </div>
                         <div>
                           <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">Current Owner</label>
                           <p className="text-base font-bold text-slate-900 dark:text-white capitalize">{t.status === 'completed' ? t.buyer_name : (t.owner_name || t.seller_name)}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-500">
                           {t.buyer_photo ? (
                             <img src={`http://localhost:5001${t.buyer_photo}`} alt="Buyer" className="w-full h-full object-cover" />
                           ) : (
                             t.buyer_name?.[0]?.toUpperCase()
                           )}
                         </div>
                         <div>
                           <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">Buyer</label>
                           <p className="text-base font-bold text-slate-900 dark:text-white capitalize">{t.buyer_name}</p>
                         </div>
                       </div>
                    </div>

                    {/* Digital Signatures Tracking Dashboard Panel */}
                    {t.agreement_id && (
                      <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 shadow-sm">
                        <h4 className="text-sm font-bold text-registryBlue dark:text-blue-400 uppercase tracking-wider mb-4">Legally Binding Signatures Pipeline</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="block text-sm font-semibold text-slate-500 dark:text-slate-400">Citizen Seller</span>
                            <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-1 ${t.seller_signed ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                              {t.seller_signed ? <Check size={14} /> : '•'} {t.seller_signed ? 'Signed' : 'Pending'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-sm font-semibold text-slate-500 dark:text-slate-400">Citizen Buyer</span>
                            <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-1 ${t.buyer_signed ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                              {t.buyer_signed ? <Check size={14} /> : '•'} {t.buyer_signed ? 'Signed' : 'Pending'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-sm font-semibold text-slate-500 dark:text-slate-400">Official Notary</span>
                            <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-1 ${t.notary_signed ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                              {t.notary_signed ? <Check size={14} /> : '•'} {t.notary_signed ? 'Certified' : 'Pending'}
                            </span>
                          </div>
                          {isLand && (
                            <div>
                              <span className="block text-sm font-semibold text-slate-500 dark:text-slate-400">Land Officer</span>
                              <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-1 ${t.officer_signed ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                                {t.officer_signed ? <Check size={14} /> : '•'} {t.officer_signed ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <StepProgress currentStatus={t.status} assetType={t.asset_type || t.property_type} />
                  </div>

                  <div className="lg:w-80 p-8 bg-slate-50 dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                       <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 block">Price</label>
                       <p className="text-3xl font-bold text-slate-900 dark:text-white">${parseFloat(t.price).toLocaleString()}</p>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 font-mono">ID: {formatAssetId(t.id)}</p>
                    </div>

                    <div className="mt-8 space-y-3">
                      {/* Accept Action */}
                      {t.status === 'initiated' && isIncoming && (
                        <button onClick={() => acceptTransfer(t.id)} className="btn btn-primary w-full text-base font-semibold py-3.5 shadow-sm">
                          Accept Transfer
                        </button>
                      )}

                      {/* Citizen A (Seller) Signature Trigger */}
                      {t.status === 'accepted' && isOutgoing && t.agreement_id && !t.seller_signed && (
                        <button 
                          onClick={() => openCitizenSignatureModal(t.agreement_id, 'Citizen Seller')}
                          className="btn btn-primary w-full text-base font-semibold py-3.5 shadow-sm flex items-center justify-center gap-2"
                        >
                          <PenTool size={18} /> Sign Agreement
                        </button>
                      )}

                      {/* Citizen B (Buyer) Signature Trigger */}
                      {t.status === 'accepted' && isIncoming && t.agreement_id && !t.buyer_signed && (
                        <button 
                          onClick={() => openCitizenSignatureModal(t.agreement_id, 'Citizen Buyer')}
                          className="btn btn-primary w-full text-base font-semibold py-3.5 shadow-sm flex items-center justify-center gap-2"
                        >
                          <PenTool size={18} /> Sign Agreement
                        </button>
                      )}

                      {/* Notary Digital Signature Modal Trigger */}
                      {user?.role === 'notary' && t.status === 'accepted' && t.agreement_id && (
                        t.seller_signed && t.buyer_signed ? (
                          <button 
                            onClick={() => openNotarySignatureModal(t.id)} 
                            className="btn btn-primary w-full text-base font-semibold py-3.5 shadow-sm flex items-center justify-center gap-2"
                          >
                            <Shield size={18} /> Verify & Sign
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-600 bg-amber-50 rounded-lg border border-dashed border-amber-200 py-3">
                            <Clock size={16} /> Awaiting Citizens Ink
                          </div>
                        )
                      )}

                      {/* Officer Digital Signature Modal Trigger */}
                      {user?.role === 'officer' && t.status === 'pending_officer' && t.agreement_id && (
                        t.notary_signed ? (
                          <button 
                            onClick={() => openOfficerSignatureModal(t.id)} 
                            className="btn btn-primary w-full text-base font-semibold py-3.5 shadow-sm flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={18} /> Approve & Sign
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-600 bg-amber-50 rounded-lg border border-dashed border-amber-200 py-3">
                            <Clock size={16} /> Awaiting Notary Seal
                          </div>
                        )
                      )}

                      {/* Download Agreement Action */}
                      {t.agreement_id && (
                        <button 
                          onClick={() => downloadAgreementPDF(t.id, t.agreement_number)}
                          className="btn btn-secondary w-full text-base font-semibold py-3.5 flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Download size={18} /> Download Agreement
                        </button>
                      )}

                      {/* Pending Indicators */}
                      {t.status === 'accepted' && (!t.seller_signed || !t.buyer_signed) && (
                        <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 py-3 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                           <Clock size={16} /> Pending Signatures
                        </div>
                      )}
                      
                      {t.status === 'accepted' && t.seller_signed && t.buyer_signed && user?.role === 'citizen' && (
                        <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 py-3 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                           <Clock size={16} /> Awaiting Notary Seal
                        </div>
                      )}

                      {t.status === 'pending_officer' && user?.role === 'citizen' && (
                        <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 py-3 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                           <Clock size={16} /> Awaiting Officer Seal
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
              <ArrowRightLeft size={48} className="text-slate-300 mb-4" />
              <p className="text-base font-bold text-slate-900 dark:text-white">No transfers found</p>
              <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">History is currently empty.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reusable Signature Canvas Modal Component */}
      <DigitalSignatureModal 
        isOpen={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onConfirm={sigModalConfig.onConfirm}
        roleLabel={sigModalConfig.roleLabel}
      />
    </div>
  );
}
