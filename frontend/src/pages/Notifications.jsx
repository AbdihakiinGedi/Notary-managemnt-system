import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { 
  Bell, 
  Check, 
  Clock, 
  RefreshCcw, 
  ShieldCheck, 
  Info, 
  AlertCircle,
  MailOpen,
  Mail,
  Loader2
} from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { toast } from 'react-toastify';

export default function Notifications() {
  const { user } = useContext(AuthContext);
  const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useContext(NotificationContext);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">
            System alerts and updates regarding your property records.
          </p>
        </div>
        <div className="flex gap-2">
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={markAllAsRead}
              className="btn btn-secondary p-3 shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              title="Mark All as Read"
            >
              <Check size={18} className="inline mr-2" /> Mark All as Read
            </button>
          )}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary p-3 shadow-sm"
            title="Refresh"
          >
            {isRefreshing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="inst-card py-32 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800">
            <MailOpen size={48} className="text-slate-300 mb-4" />
            <p className="text-base font-bold text-slate-900 dark:text-white">No notifications</p>
            <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">Your registry updates will appear here.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`inst-card p-8 flex items-start gap-8 transition-all border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
                !n.is_read ? 'shadow-md border-l-4 border-l-registryBlue dark:border-l-blue-500' : 'opacity-70'
              }`}
            >
              <div className={`p-3.5 rounded-lg shadow-sm shrink-0 border ${!n.is_read ? 'bg-registryBlue text-white border-registryBlue' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800'}`}>
                {n.is_read ? <MailOpen size={20} /> : <Mail size={20} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="min-w-0">
                    <h3 className={`text-lg font-bold tracking-tight truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1.5">
                       <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Clock size={14} className="text-registryBlue dark:text-blue-400" /> {formatDateTime(n.created_at)}
                       </span>
                       {!n.is_read && (
                         <span className="badge badge-blue text-sm font-bold uppercase tracking-widest px-2.5 py-0.5">NEW</span>
                       )}
                    </div>
                  </div>
                  {!n.is_read && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="text-sm font-bold text-registryBlue dark:text-blue-400 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
                <div className="text-base text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-200 dark:border-slate-800 font-medium">
                   {n.message}
                   {n.metadata?.action_link && (
                     <div className="mt-3">
                       <a href={n.metadata.action_link} className="text-registryBlue dark:text-blue-400 hover:underline font-bold">
                         {n.metadata.action_label || 'View Details'}
                       </a>
                     </div>
                   )}
                </div>
                <div className="flex items-center gap-6 mt-6">
                   <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      <div className="w-2 h-2 bg-registryBlue rounded-full"></div>
                      Type: {n.type || 'System'}
                   </div>
                   <div className="flex items-center gap-1.5 text-sm font-bold text-green-600 dark:text-green-400 uppercase">
                      <ShieldCheck size={14} /> Verified
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-5 items-start mt-12 shadow-sm">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
           <AlertCircle size={24} className="text-registryBlue dark:text-blue-400 shrink-0" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Policy</h4>
          <p className="text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Notifications older than 90 days are automatically archived.
          </p>
        </div>
      </div>
    </div>
  );
}
