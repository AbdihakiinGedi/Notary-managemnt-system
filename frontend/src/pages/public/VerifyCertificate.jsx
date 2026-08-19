import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import VerificationResultCard from '../../components/public/VerificationResultCard';
import { ShieldCheck, Search, Globe, Hash, ShieldAlert } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';
import PublicNavbar from '../../components/PublicNavbar';

export default function VerifyCertificate() {
  const { user } = React.useContext(AuthContext);
  const { certificateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialId = certificateId || searchParams.get('id') || '';
  
  const [certId, setCertId] = useState(initialId);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically verify if ID is present in URL on mount
  useEffect(() => {
    if (initialId) {
      handleVerify(null, initialId);
    }
  }, [initialId]);

  const handleVerify = async (e, idToVerify = certId) => {
    if (e) e.preventDefault();
    if (!idToVerify) return;

    // Update URL if verifying a new ID
    if (idToVerify !== certificateId) {
      navigate(`/verify/${idToVerify}`, { replace: true });
    }

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await api.get(`/public/certificates/${idToVerify}/verify`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'VERIFICATION_FAILED: Proof invalid or expired.');
      setResult({ valid: false, status: 'INVALID', error: 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/public/verify/${result.certificate_id || certId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TITLE-${formatAssetId(result.certificate_id || certId).replace('AST-', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  return (
    <>
      {!user && <PublicNavbar />}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-registryLight dark:bg-slate-950 p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 text-center">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-white dark:bg-slate-900 rounded-3xl mb-4 border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
              <ShieldCheck className="text-registryBlue dark:text-blue-400 relative z-10" size={56} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Public Verification</h1>
              <p className="text-slate-500 dark:text-slate-400 font-semibold mt-3 text-base flex items-center justify-center gap-2">
                <Globe size={16} className="text-registryBlue dark:text-blue-400" /> Official Government Ledger
              </p>
            </div>
          </div>

          <section className="p-8">
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="relative">
                <Hash size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  placeholder="Enter Certificate Number, Property ID, or Verification Code..."
                  className="w-full pl-14 pr-4 py-4 font-semibold text-base bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-registryBlue outline-none transition-all"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || !certId} 
                className="w-full bg-registryBlue hover:bg-blue-800 text-white py-4 rounded-lg font-bold text-base shadow-md disabled:opacity-50 flex items-center justify-center gap-3 transition-colors"
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                   <><Search size={18} /> Verify Now</>
                )}
              </button>
            </form>
          </section>
        </div>

        {error && !result && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-5 text-red-700 max-w-2xl mx-auto animate-in slide-in-from-top-4 shadow-sm">
            <ShieldAlert size={32} />
            <div>
              <p className="font-bold text-base">Verification Error</p>
              <p className="text-base font-medium mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <VerificationResultCard result={result} onDownload={handleDownloadPDF} />
        )}
      </div>
    </>
  );
}
