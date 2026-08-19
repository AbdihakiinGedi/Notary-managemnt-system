import formatAssetId from '../utils/formatAssetId';
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import formatDate from '../utils/formatDate';
import { 
  ArrowLeft, Lock, Unlock, History, Image, MapPin, 
  Download, ShieldCheck, Landmark, FileText,
  AlertTriangle, X, ChevronLeft, ChevronRight, Globe
} from 'lucide-react';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [property, setProperty] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [ownershipHistory, setOwnershipHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // For Photo Gallery Modal
  const [showGallery, setShowGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // For Lock/Unlock Modal
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [lockCustomReason, setLockCustomReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propRes, timeRes, ownRes] = await Promise.all([
        api.get(`/properties/${id}`),
        api.get(`/properties/${id}/history`),
        api.get(`/properties/${id}/ownership-history`)
      ]);

      setProperty(propRes.data);
      setTimeline(timeRes.data);
      setOwnershipHistory(ownRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async () => {
    try {
      const newVis = property.visibility === 'public' ? 'private' : 'public';
      const res = await api.patch(`/properties/${id}/visibility`, { visibility: newVis });
      setProperty({ ...property, visibility: res.data.visibility });
      toast.success('Property visibility updated.');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update visibility');
    }
  };

  const openLockModal = () => {
    setLockReason('');
    setLockCustomReason('');
    setShowLockModal(true);
  };

  const confirmLockToggle = async () => {
    const finalReason = lockReason === 'Other' ? lockCustomReason : lockReason;
    if (!finalReason.trim()) {
      toast.error('Please provide a valid reason.');
      return;
    }

    const isLocked = property.status === 'LOCKED';
    const action = isLocked ? 'unlock' : 'lock';

    try {
      await api.patch(`/properties/${id}/${action}`, { reason: finalReason });
      toast.success(`Property ${action}ed successfully`);
      setShowLockModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action} property`);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await api.get(`/properties/${id}/report`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Property-Report-${formatAssetId(id).replace('AST-', '')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download report');
    }
  };

  const getStatusBadge = (status) => {
    const s = status?.toUpperCase();
    if (s === 'ACTIVE' || s === 'REGISTERED') return <span className="badge bg-green-50 text-green-700 border-green-200">ACTIVE</span>;
    if (s === 'LOCKED') return <span className="badge bg-red-50 text-red-700 border-red-200">LOCKED</span>;
    if (s === 'UNDER_TRANSFER') return <span className="badge bg-blue-50 text-blue-700 border-blue-200">UNDER TRANSFER</span>;
    if (s === 'DISPUTED') return <span className="badge bg-orange-50 text-orange-700 border-orange-200">DISPUTED</span>;
    return <span className="badge bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">{s || 'INACTIVE'}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-2 border-registryBlue/20 border-t-registryBlue rounded-full animate-spin"></div>
    </div>
  );

  if (!property) return <div className="text-center py-32">Property not found</div>;

  const metadata = typeof property.metadata === 'string' ? JSON.parse(property.metadata) : property.metadata;
  const photos = metadata?.photos || (property.image_url ? [`http://localhost:5001${property.image_url}`] : []);

  return (
    <div className="space-y-8 fade-in pb-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{property.title}</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 font-medium">Asset ID: {formatAssetId(property.id)}</p>
        </div>
        <div className="ml-auto flex gap-3">
          {getStatusBadge(property.status)}
          
          {/* Action buttons hidden outside Property Control */}

          <button onClick={downloadReport} className="btn btn-primary px-4 py-2 text-base font-semibold flex items-center gap-2">
            <Download size={16} /> Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details & Photos */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="inst-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex gap-6">
             <div className="w-1/3 aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative group cursor-pointer" onClick={() => { if(photos.length > 0) { setCurrentPhotoIndex(0); setShowGallery(true); } }}>
               {photos.length > 0 ? (
                 <img src={photos[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center"><Landmark size={32} className="text-slate-300"/></div>
               )}
               {photos.length > 1 && (
                 <div className="absolute bottom-2 right-2 bg-black/60 text-white text-sm font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                   +{photos.length - 1}
                 </div>
               )}
             </div>
             <div className="flex-1 space-y-4">
               <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Details</h3>
                 <div className="flex items-center gap-2 text-base font-medium text-slate-500 dark:text-slate-400 mt-1">
                   <MapPin size={16} className="text-registryBlue dark:text-blue-400" /> {property.district} - {property.address}
                 </div>
               </div>
               <p className="text-base text-slate-600 dark:text-slate-400">{property.description || 'No description provided.'}</p>
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                 <div>
                   <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">Type</label>
                   <p className="text-base font-bold text-slate-900 dark:text-white capitalize">{property.type?.replace('_', ' ')}</p>
                 </div>
                 <div>
                   <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">Current Owner</label>
                   <p className="text-base font-bold text-slate-900 dark:text-white">{property.owner_name}</p>
                 </div>
               </div>
             </div>
          </div>

          {/* Timeline */}
          <div className="inst-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <History size={18} className="text-registryBlue dark:text-blue-400" /> Event Timeline
            </h3>
            
            {timeline.length === 0 ? (
              <p className="text-base text-slate-500 dark:text-slate-400 italic">No events recorded.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((event, i) => (
                  <div key={i} className="relative group">
                    <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-registryBlue border-2 border-white z-10" />
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{event.description || event.action}</h4>
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{formatDate(event.timestamp)}</span>
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                        Actor: {event.actor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ownership History */}
        <div className="space-y-8">
          <div className="inst-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <ShieldCheck size={18} className="text-registryBlue dark:text-blue-400" /> Ownership Chain
            </h3>
            
            <div className="space-y-4">
              {ownershipHistory.map((oh, i) => (
                <div key={oh.id || i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${oh.active || oh.end_date === null ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>
                      {i + 1}
                    </div>
                    {i !== ownershipHistory.length - 1 && <div className="w-0.5 h-full bg-slate-200 my-1"></div>}
                  </div>
                  <div className="pb-4">
                    <p className={`text-base font-bold ${oh.active || oh.end_date === null ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{oh.owner_name}</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                      {formatDate(oh.start_date)} - {oh.end_date ? formatDate(oh.end_date) : 'Present'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visibility Controls */}
          {user?.id === property.owner_id && (
            <div className="inst-card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                {property.visibility === 'public' ? <Globe size={18} className="text-registryBlue dark:text-blue-400" /> : <Lock size={18} className="text-registryBlue dark:text-blue-400" />}
                Visibility Settings
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg">
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {property.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {property.visibility === 'public' 
                      ? 'Visible in public searches and verifications.' 
                      : 'Hidden from public searches. Only authorized users can view.'}
                  </p>
                </div>
                <button 
                  onClick={toggleVisibility}
                  className={`px-4 py-2 text-base font-semibold rounded-lg shadow-sm transition-colors border ${property.visibility === 'public' ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-registryBlue border-registryBlue text-white hover:bg-blue-700'}`}
                >
                  {property.visibility === 'public' ? 'Make Private' : 'Make Public'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <button onClick={() => setShowGallery(false)} className="absolute top-6 right-6 text-white hover:text-slate-300">
            <X size={32} />
          </button>
          
          <div className="relative w-full max-w-5xl flex items-center justify-center group">
             {photos.length > 1 && (
               <button 
                 onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                 className="absolute left-4 p-3 bg-white dark:bg-slate-900/10 hover:bg-white dark:bg-slate-900/20 text-white rounded-full transition-colors backdrop-blur-sm"
               >
                 <ChevronLeft size={32} />
               </button>
             )}
             
             <img src={photos[currentPhotoIndex]} className="max-h-[80vh] w-auto max-w-full rounded-lg shadow-2xl transition-all" />
             
             {photos.length > 1 && (
               <button 
                 onClick={() => setCurrentPhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                 className="absolute right-4 p-3 bg-white dark:bg-slate-900/10 hover:bg-white dark:bg-slate-900/20 text-white rounded-full transition-colors backdrop-blur-sm"
               >
                 <ChevronRight size={32} />
               </button>
             )}
          </div>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-medium text-base bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm">
            {currentPhotoIndex + 1} / {photos.length}
          </div>
        </div>
      )}
      {/* Lock/Unlock Reason Modal */}
      {showLockModal && property && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                {property.status === 'LOCKED' ? <Unlock className="text-registryBlue dark:text-blue-400" size={20} /> : <Lock className="text-red-600" size={20} />}
                {property.status === 'LOCKED' ? 'Reason for Unlock' : 'Reason for Lock'}
              </h3>
              <button onClick={() => setShowLockModal(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 p-1 rounded-full hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
                Please select the official reason for this registry modification:
              </p>
              
              <div className="space-y-2">
                {(property.status === 'LOCKED' 
                  ? ['Investigation Complete', 'Court Order Released', 'Registry Correction', 'Other']
                  : ['Ownership Dispute', 'Fraud Investigation', 'Court Order', 'Registry Review', 'Duplicate Claim', 'Other']
                ).map(r => (
                  <label key={r} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${lockReason === r ? 'border-registryBlue bg-blue-50 dark:bg-blue-950/50 dark:border-blue-700' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-950'}`}>
                    <input 
                      type="radio" 
                      name="lockReason" 
                      value={r} 
                      checked={lockReason === r} 
                      onChange={(e) => setLockReason(e.target.value)}
                      className="accent-registryBlue w-4 h-4"
                    />
                    <span className="text-base font-semibold text-slate-800 dark:text-slate-300">{r}</span>
                  </label>
                ))}
              </div>

              {lockReason === 'Other' && (
                <div className="mt-4 fade-in">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Reason</label>
                  <textarea 
                    value={lockCustomReason}
                    onChange={(e) => setLockCustomReason(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-base focus:border-registryBlue focus:ring-1 focus:ring-registryBlue outline-none"
                    placeholder="Enter explicit reason for audit log..."
                    rows={3}
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
              <button onClick={() => setShowLockModal(false)} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button 
                onClick={confirmLockToggle}
                disabled={!lockReason || (lockReason === 'Other' && !lockCustomReason.trim())}
                className={`px-4 py-2 font-bold text-white rounded-lg shadow-sm transition-all ${property.status === 'LOCKED' ? 'bg-registryBlue hover:bg-[#152C69]' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Confirm {property.status === 'LOCKED' ? 'Unlock' : 'Lock'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
