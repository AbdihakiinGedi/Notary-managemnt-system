import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Timer, ShieldCheck, ArrowRight, FileText, Stamp, 
  Clock, Activity, User, Hash, ChevronLeft
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import formatDate from '../utils/formatDate';

const EVENT_STYLE = (event = '') => {
  const e = event.toUpperCase();
  if (e.includes('COMPLETED') || e.includes('ACQUIRED') || e.includes('REGISTERED'))
    return { dot: 'bg-green-600', badge: 'badge-success' };
  if (e.includes('REJECTED') || e.includes('DENIED'))
    return { dot: 'bg-red-600', badge: 'badge-error' };
  if (e.includes('TRANSFER') || e.includes('NOTARI'))
    return { dot: 'bg-blue-600', badge: 'badge-blue' };
  return { dot: 'bg-gray-400', badge: 'badge-blue' };
};

export default function OwnershipTimeline() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState([]);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTimeline(); }, [assetId]);

  const fetchTimeline = async () => {
    try {
      const res = await api.get(`/assets/timeline/${assetId}`);
      setTimeline(res.data.timeline);
      setAsset(res.data.asset);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading timeline...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate(-1)} className="btn btn-secondary p-3 shadow-sm border-[#DCE6F2] dark:border-[#334155]">
             <ChevronLeft size={24} />
           </button>
           <div>
             <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Property History</h1>
             <p className="text-base text-slate-600 dark:text-slate-400 mt-1 font-medium">Historical record of ownership and registry events.</p>
           </div>
        </div>
      </div>

      {/* Asset Summary Card */}
      {asset && (
        <div className="inst-card p-10 border-[#DCE6F2] dark:border-[#334155] bg-white dark:bg-slate-900 shadow-xl border-l-8 border-l-blue-600">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-3">Asset Information</p>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              {asset.title || `${asset.type?.replace(/_/g, ' ')} Asset`}
            </h2>
            <div className="flex flex-wrap items-center gap-8 mt-8">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold uppercase text-slate-400 dark:text-slate-500 dark:text-slate-400 tracking-widest">Asset ID</span>
                <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded border border-blue-100 dark:border-blue-900/30">{asset.id?.toUpperCase()}</span>
              </div>
              <div className="h-10 w-px bg-slate-100 dark:bg-slate-800" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold uppercase text-slate-400 dark:text-slate-500 dark:text-slate-400 tracking-widest">Category</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">{asset.type?.replace(/_/g, ' ')}</span>
              </div>
              <div className="h-10 w-px bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center gap-3 px-5 py-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-900/30">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                <span className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline List */}
      {timeline.length === 0 ? (
        <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950/50 dark:bg-slate-900/10 border-dashed border-[#DCE6F2] dark:border-[#334155]">
          <Timer size={48} className="text-slate-300 dark:text-slate-600 mb-6" />
          <p className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-widest">No history available</p>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-[0.2em]">Pending first event</p>
        </div>
      ) : (
        <div className="relative pl-12">
          {/* Vertical line */}
          <div className="absolute left-[20px] top-4 bottom-4 w-1 bg-slate-100 dark:bg-slate-800 rounded-full" />

          <div className="space-y-12">
            {timeline.map((event, i) => {
              const style = EVENT_STYLE(event.event);
              return (
                <div key={i} className="relative">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[35px] top-8 w-6 h-6 rounded-full border-4 border-white dark:border-slate-950 z-10 shadow-sm ${style.dot}`} />

                  {/* Event Card */}
                  <div className="inst-card p-8 border-[#DCE6F2] dark:border-[#334155] bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 pb-8 border-b border-slate-50 dark:border-slate-800">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`badge px-4 py-1 text-[9px] font-bold tracking-widest ${style.badge}`}>
                            {event.event?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                          {event.event?.replace(/_/g, ' ')}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                          <Clock size={16} className="text-blue-600" />
                          {formatDate(event.timestamp)}
                        </div>
                        <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                      {/* Actor Information */}
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-blue-600 text-xl font-bold">
                          {event.actor_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Authorized By</label>
                          <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{event.actor_name || 'System'}</p>
                          <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mt-1">{event.actor_role}</p>
                        </div>
                      </div>

                      {/* Reference Data */}
                      <div className="flex flex-col items-end justify-center">
                        <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Reference ID</label>
                        <p className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded border border-slate-100 dark:border-slate-700 truncate max-w-full uppercase tracking-tighter">
                          {event.reference_id?.toUpperCase() || 'SYSTEM_EVENT'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
