import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      // Sort newest first
      const sorted = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotifications(sorted);
      setUnreadCount(sorted.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to sync notifications', err);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    
    // Initialize socket connection for instant notifications
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');
    socket.emit('join', user.id);
    
    socket.on('refresh_notifications', () => {
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const markAsRead = async (id) => {
    // Save previous state for rollback
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    // Optimistic Update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      // Rollback on failure
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error('Failed to update status');
    }
  };

  const markAllAsRead = async () => {
    // Save previous state for rollback
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    // Optimistic Update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      // Rollback on failure
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
