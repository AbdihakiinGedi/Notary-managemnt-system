import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Stamp, Download, ShieldCheck, FileText, Calendar, Hash, 
  Activity, RefreshCcw, Info, File
} from 'lucide-react';
import { toast } from 'react-toastify';
import formatAssetId from '../utils/formatAssetId';
import formatDate from '../utils/formatDate';


export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCertificates(); }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets/certificates');
      setCertificates(response.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to retrieve certificates');
    } finally {
      setLoading(false);
    }
  };

  const viewCertPdf = (cert) => {
    const url = `${api.defaults.baseURL}/public/verify/${cert.id}/pdf`;
    window.open(url, '_blank');
  };

  const downloadCertPdf = async (cert) => {
    try {
      const response = await api.get(`/assets/certificates/${cert.id}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TITLE-${formatAssetId(cert.id).replace('AST-', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Official PDF title certificate downloaded');
    } catch (err) {
      toast.error('Failed to download PDF certificate');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-registryBlue/20 border-t-registryBlue rounded-full animate-spin"></div>
        <p className="text-base font-semibold text-slate-500 dark:text-slate-400">Retrieving records...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Property Certificates</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Official records of verified property interests.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCertificates}
            className="btn btn-secondary p-3 shadow-sm"
            title="Refresh"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="inst-card flex flex-col group border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 text-registryBlue dark:text-blue-400 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                <Stamp size={24} />
              </div>
              <span className="badge badge-success text-sm font-bold uppercase tracking-widest px-3 py-1">
                Verified
              </span>
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-registryBlue dark:text-blue-400 capitalize mb-2">
                {cert.property_type?.replace(/_/g, ' ') || 'Asset'} Record
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {cert.property_title}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 font-mono">
                ID: {formatAssetId(cert.id)}
              </p>

              <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Date Issued</label>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {formatDate(cert.issued_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Status</label>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/20" />
                    <p className="text-base font-bold text-slate-900 dark:text-white">Active</p>
                  </div>
                </div>
              </div>

              {/* Hash Display */}
              <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
                <div className="shrink-0 bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(window.location.origin + '/verify?id=' + cert.id)}`} 
                    alt="Verification QR"
                    className="w-[60px] h-[60px] grayscale contrast-125"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash size={14} className="text-slate-400" />
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0">Validation Hash</label>
                  </div>
                  <p className="text-sm font-semibold font-mono text-slate-500 dark:text-slate-400 break-all leading-tight">
                    {cert.certificate_hash}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <button
                onClick={() => viewCertPdf(cert)}
                className="btn btn-secondary w-full py-3.5 text-base font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <FileText size={16} /> View PDF
              </button>
              <button
                onClick={() => downloadCertPdf(cert)}
                className="btn btn-primary w-full py-3.5 text-base font-semibold shadow-md flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>
        ))}

        {certificates.length === 0 && (
          <div className="col-span-full py-32 inst-card border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 shadow-sm">
            <File size={48} className="text-slate-300 mb-4" />
            <p className="text-base font-bold text-slate-900 dark:text-white">No active certificates</p>
            <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">Your verified records will be displayed here.</p>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-5 items-start shadow-sm">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
           <Info size={24} className="text-registryBlue dark:text-blue-400 shrink-0" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Information</h4>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            These digital certificates serve as official proof of registered property ownership. Each record is verified by the national registry and can be authenticated through the official verification system.
          </p>
        </div>
      </div>
    </div>
  );
}
