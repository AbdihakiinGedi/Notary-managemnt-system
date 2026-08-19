import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { ShieldAlert, Clock, UploadCloud, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

export default function PendingApproval() {
  const { user, login } = useContext(AuthContext);
  const [status, setStatus] = useState(user.account_status || 'pending');
  const [reason, setReason] = useState(user.rejection_reason || '');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/users/verification/status');
        setStatus(res.data.verification_status);
        setReason(res.data.rejection_reason);
      } catch (err) {
        console.error("Failed to check status", err);
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
    
    // Poll every 15 seconds to see if approved
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // If approved while on this page, force a reload to get new token and pass route guards
    if (status === 'approved') {
      window.location.href = '/citizen/dashboard';
    }
  }, [status]);

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a new ID document');
    
    setLoading(true);
    try {
      const data = new FormData();
      data.append('document', file);
      
      const res = await api.post('/users/verification', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setStatus('pending');
      setReason('');
      setFile(null);
      toast.success('Document submitted successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit document');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-lg inst-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-500">
        
        {status === 'pending' ? (
          <>
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400 shadow-inner">
              <Clock size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">Account Pending Approval</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
              Your identity document is currently being reviewed by an administrator. This process ensures the integrity of the Somali National Digital Registry.
            </p>
            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estimated Review Time</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">24 - 48 Hours</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 shadow-inner">
              <ShieldAlert size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">Verification Failed</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed mb-4">
              We could not verify your identity document. Please review the reason below and upload a clear, valid document.
            </p>
            {reason && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50 text-left">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 dark:text-red-400 uppercase tracking-widest mb-1">Reason for rejection</p>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{reason}</p>
              </div>
            )}
            
            <form onSubmit={handleResubmit} className="text-left space-y-4">
              <div className="space-y-2">
                <label className="inst-label">Upload New ID Document (JPG, PNG, PDF)</label>
                <input
                  type="file"
                  required
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="inst-input py-2 font-bold text-[11px]"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !file}
                className="btn btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><UploadCloud size={18} /> Resubmit Document</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
