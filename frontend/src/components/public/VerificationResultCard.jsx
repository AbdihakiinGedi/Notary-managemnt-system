import React from 'react';
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, 
  Printer, Download, Link as LinkIcon, QrCode, FileText, Globe, Clock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import formatDate, { formatDateTime } from '../../utils/formatDate';


export default function VerificationResultCard({ result, onDownload }) {
  const { 
    valid, status, certificate_id, asset_type, property_title, 
    district, owner_name, issued_at, metadata, signatures 
  } = result;

  const isLand = ['land', 'commercial', 'residential', 'industrial'].includes(asset_type?.toLowerCase() || '');

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Verification link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = () => {
    if (status === 'ACTIVE' || status === 'VERIFIED') return 'text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
    if (status === 'INVALID' || status === 'TAMPERED') return 'text-red-600 dark:text-red-400 bg-red-50 border-red-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getStatusIcon = () => {
    if (status === 'ACTIVE' || status === 'VERIFIED') return <CheckCircle2 size={16} />;
    if (status === 'INVALID' || status === 'TAMPERED') return <XCircle size={16} />;
    return <ShieldAlert size={16} />;
  };

  if (!valid) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-10 text-center animate-in zoom-in-95 duration-500 shadow-sm max-w-3xl mx-auto">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} className="text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-3">Certificate Integrity Validation Failed</h2>
        <p className="text-red-600 dark:text-red-400 font-medium text-base max-w-lg mx-auto leading-relaxed">
          The requested certificate is either invalid, revoked, or has failed cryptographic signature matching. It is not recognized by the official government ledger.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg animate-in zoom-in-95 duration-500">
      
      {/* Top Section */}
      <div className="bg-registryBlue text-white p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white dark:bg-slate-900/10 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-inner">
            <ShieldCheck size={32} className="text-registryGold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Certificate Verification</h2>
            <p className="text-base font-medium text-blue-100 mt-1 flex items-center gap-1.5">
              <Globe size={16} /> Official Somali National Registry
            </p>
          </div>
        </div>
        <div className={`px-5 py-2.5 rounded-lg border font-bold uppercase text-base flex items-center gap-2 shadow-sm bg-white dark:bg-slate-900 ${getStatusColor().replace('bg-', 'text-').replace('border-', '')}`}>
          {getStatusIcon()}
          {status}
        </div>
      </div>

      <div className="p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Core Details */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">Certificate Number</label>
              <p className="text-base font-bold text-slate-900 dark:text-white font-mono bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">{certificate_id}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">Issue Date</label>
              <p className="text-base font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">{formatDate(issued_at)}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">Property Type</label>
              <p className="text-base font-bold text-registryBlue bg-blue-50 p-3.5 rounded-lg border border-blue-100 capitalize">{asset_type?.replace('_', ' ') || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">District / Location</label>
              <p className="text-base font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 capitalize">{district || 'N/A'}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">Registered Owner</label>
            <p className="text-xl font-bold text-slate-900 dark:text-white capitalize">{owner_name}</p>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-2">Integrity Validation</label>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="text-base font-semibold text-green-700 dark:text-green-400 capitalize">{metadata?.verification_status?.toLowerCase().replace('_', ' ')}</span>
              </div>
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400 break-all leading-relaxed font-medium">
                HASH: {metadata?.certificate_hash}
              </p>
            </div>
          </div>
        </div>

        {/* Signatures & Actions */}
        <div className="space-y-8">
          
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <FileText size={18} className="text-registryBlue" /> Verified Signatures
            </h3>
            <div className="space-y-4">
              {['seller', 'buyer', 'notary', 'officer'].map((roleType) => {
                const isOfficer = roleType === 'officer';
                if (isOfficer && !isLand) {
                  return (
                    <div key={roleType} className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">Officer Signature Not Required</p>
                      <p className="text-sm font-medium text-slate-400 text-center mt-1">(NON-LAND ASSET)</p>
                    </div>
                  );
                }

                const sig = signatures?.find(s => s.role === roleType);
                
                if (!sig) {
                  return (
                    <div key={roleType} className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 opacity-60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 capitalize">{roleType} Signature</span>
                        <XCircle size={16} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-400">Pending / Not Found</p>
                    </div>
                  );
                }

                return (
                  <div key={roleType} className="p-4 border border-green-200 rounded-lg bg-green-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{roleType} Signature</span>
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-300 truncate" title={sig.name}>{sig.name}</p>
                    <div className="flex items-center gap-1.5 opacity-70 mt-1">
                      <Clock size={12} className="text-slate-500 dark:text-slate-400" />
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {formatDateTime(sig.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
             <button onClick={onDownload} className="w-full btn btn-primary py-3.5 text-base font-semibold flex items-center justify-center gap-2 shadow-sm">
               <Download size={18} /> Export PDF
             </button>
             <button onClick={handlePrint} className="w-full bg-white dark:bg-slate-900 border border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-lg font-semibold text-base flex items-center justify-center gap-2 transition-colors shadow-sm">
               <Printer size={18} /> Print Certificate
             </button>
             <button onClick={copyLink} className="w-full bg-white dark:bg-slate-900 border border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-registryBlue dark:hover:text-blue-400 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-lg font-semibold text-base flex items-center justify-center gap-2 transition-colors shadow-sm">
               <LinkIcon size={18} /> Copy Link
             </button>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
             <QRCodeSVG value={window.location.href} size={140} level="H" includeMargin={true} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800" />
             <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-4 text-center">Scan to Verify Officially</p>
          </div>
        </div>
      </div>
    </div>
  );
}
