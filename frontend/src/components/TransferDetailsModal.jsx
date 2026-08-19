import React, { useState, useEffect } from 'react';
import { X, Check, FileText, Download, Eye, Loader2, MapPin, User, ShieldCheck, DollarSign, AlertOctagon } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import formatDate from '../utils/formatDate';

export default function TransferDetailsModal({ transferId, isOpen, onClose, onApprove, onReject }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && transferId) {
      setLoading(true);
      api.get(`/transfers/${transferId}/details`)
        .then(res => {
          setDetails(res.data);
          setLoading(false);
        })
        .catch(err => {
          toast.error('Failed to load transfer details');
          setLoading(false);
        });
    }
  }, [isOpen, transferId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-registryBlue">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Transfer Details</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Please review all information before verifying</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 size={40} className="animate-spin mb-4 text-registryBlue" />
              <p className="font-semibold text-lg">Loading database records...</p>
            </div>
          ) : details ? (
            <div className="space-y-8">
              
              {/* Property Section */}
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Asset Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Asset Title</label>
                    <p className="font-bold text-slate-900 dark:text-white text-base">{details.property_title}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registration Number</label>
                    <p className="font-bold text-slate-900 dark:text-white text-base">{details.registration_number}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">District</label>
                    <p className="font-bold text-slate-900 dark:text-white text-base">{details.district}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Asset Type</label>
                    <p className="font-bold text-slate-900 dark:text-white text-base capitalize">{details.property_type}</p>
                  </div>
                </div>
              </div>

              {/* Parties Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User size={16} /> Current Owner (Seller)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name</label>
                      <p className="font-bold text-slate-900 dark:text-white text-base capitalize">{details.seller_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">National ID</label>
                      <p className="font-bold text-slate-900 dark:text-white text-base">{details.seller_national_id || 'NOT VERIFIED'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contact</label>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{details.seller_email} {details.seller_phone ? `• ${details.seller_phone}` : ''}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User size={16} /> Intended Buyer
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name</label>
                      <p className="font-bold text-slate-900 dark:text-white text-base capitalize">{details.buyer_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">National ID</label>
                      <p className="font-bold text-slate-900 dark:text-white text-base">{details.buyer_national_id || 'NOT VERIFIED'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contact</label>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{details.buyer_email} {details.buyer_phone ? `• ${details.buyer_phone}` : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign size={16} /> Transfer Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Price</label>
                    <p className="font-bold text-registryBlue text-xl">${parseFloat(details.price).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Initiated On</label>
                    <p className="font-bold text-slate-900 dark:text-white text-base">{formatDate(details.transfer_date)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Agreement Number</label>
                    <p className="font-bold text-slate-900 dark:text-white text-base">{details.agreement_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              {details.documents && details.documents.length > 0 && (
                <div>
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText size={16} /> Supporting Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {details.documents.map(doc => (
                       <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-300 transition-colors shadow-sm">
                         <div className="flex items-center gap-3 overflow-hidden">
                           <FileText size={20} className="text-slate-400 shrink-0" />
                           <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{doc.document_type?.replace('_', ' ') || 'Document'}</span>
                         </div>
                         <a href={`${api.defaults.baseURL}${doc.document_url}`} target="_blank" rel="noopener noreferrer" className="p-2 text-registryBlue hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all" title="View Document">
                           <Eye size={18} />
                         </a>
                       </div>
                     ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertOctagon size={40} className="mb-4 text-red-500" />
              <p className="font-semibold text-lg text-slate-900 dark:text-white">Could not load details</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4">
          <button onClick={onClose} className="btn btn-secondary px-8 py-3 text-base font-bold">Cancel</button>
          <button 
            onClick={() => { onClose(); onReject(transferId); }} 
            disabled={loading || !details}
            className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 px-8 py-3 text-base font-bold"
          >
            Reject Transfer
          </button>
          <button 
            onClick={() => { onClose(); onApprove(transferId); }}
            disabled={loading || !details}
            className="btn btn-primary px-8 py-3 text-base font-bold flex items-center gap-2"
          >
            <Check size={18} /> Verify & Proceed to Sign
          </button>
        </div>

      </div>
    </div>
  );
}
