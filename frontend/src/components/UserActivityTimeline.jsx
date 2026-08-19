import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { History, Activity, Clock } from 'lucide-react';
import formatDate, { formatDateTime } from '../utils/formatDate';

export default function UserActivityTimeline() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await api.get('/users/activity');
        setActivities(res.data);
      } catch (err) {
        console.error('Failed to fetch user activity:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-8 h-8 border-2 border-registryBlue/20 border-t-registryBlue rounded-full animate-spin"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <Activity size={32} className="mx-auto mb-3 opacity-20" />
        <p className="text-base font-medium">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="text-registryBlue dark:text-blue-400" size={20} />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h2>
      </div>
      
      <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-8">
        {activities.map((activity, index) => (
          <div key={activity.id || index} className="relative pl-6">
            <div className="absolute w-3 h-3 bg-registryBlue rounded-full -left-[6.5px] top-1.5 border-2 border-white dark:border-slate-900 shadow-sm"></div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight uppercase">
                  {activity.action.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} className="text-blue-500" />
                  {formatDateTime ? formatDateTime(activity.created_at) : formatDate(activity.created_at)}
                </span>
              </div>
              {activity.property_title && (
                <p className="text-sm font-semibold text-registryBlue mb-1">
                  Related Property: {activity.property_title}
                </p>
              )}
              {activity.result && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Status: <span className={activity.result === 'SUCCESS' ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}>{activity.result}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
