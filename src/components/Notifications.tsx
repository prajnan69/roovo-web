"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '@/services/api';
import { API_BASE_URL } from '@/services/api';
import { useNavigation } from '@/hooks/useNavigation';
import { FiChevronLeft, FiBell, FiMessageSquare, FiCalendar, FiInfo } from 'react-icons/fi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { back } = useNavigation();

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/notifications/${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNotifications(data);
          }
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    }
  };

  const markAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        await fetch(`${API_BASE_URL}/api/notifications/${session.user.id}/read`, { method: 'POST' });
      } catch (err) {
        console.error("Error marking notifications as read:", err);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => {
      setLoading(false);
      markAsRead();
    });
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <FiMessageSquare className="text-blue-500" />;
      case 'reminder': return <FiCalendar className="text-amber-500" />;
      case 'booking': return <FiBell className="text-indigo-500" />;
      default: return <FiInfo className="text-slate-400" />;
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-slate-50 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 flex items-center gap-4">
        <button
          onClick={back}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <FiChevronLeft size={24} className="text-slate-700" />
        </button>
        <div className="text-xl font-bold text-slate-900 tracking-tight">Notifications</div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white rounded-2xl h-24 border border-slate-100" />
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification, idx) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-all ${notification.is_read ? 'opacity-80' : 'ring-1 ring-indigo-50 bg-indigo-50/5'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.is_read ? 'bg-slate-50' : 'bg-white shadow-sm'}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className={`text-[15px] font-bold truncate ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2 shrink-0">
                        {dayjs(notification.created_at).fromNow()}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${notification.is_read ? 'text-slate-500' : 'text-slate-600 font-medium'}`}>
                      {notification.message}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FiBell className="text-slate-300 text-3xl" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
              <p className="text-slate-500 text-sm mt-1">No new notifications at the moment.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Notifications;
